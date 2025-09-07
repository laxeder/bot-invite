import type { BotAuth } from "../utils/botAuth";
import type { WAMessageKey, WASocket } from "baileys";

import fs from "fs";
import pino from "pino";
import QR from "qrcode-terminal";
import makeWASocket, {
  Browsers,
  getAggregateVotesInPollMessage,
  getContentType,
  isJidUser,
  isLidUser,
} from "baileys";

import redis from "../database/redis";

import User from "../models/User";
import UserInvite from "../models/UserInvite";
import Invite, { InviteStatus } from "../models/Invite";

import { botConfig } from "../config/bot";
import { useRedisAuthState } from "../utils/botAuth";
import { sendInviteToAlls } from "../commands/sendInvite";

export default class BotController {
  protected sock!: WASocket;
  private auth: BotAuth;
  private logger = pino({ level: "error" });

  get isOnline(): boolean {
    return !!this.sock?.ws?.isOpen;
  }

  constructor() {}

  public async connect(id: string) {
    if (!this.auth) {
      this.auth = await useRedisAuthState(redis, id);
    }

    if (this.isOnline) {
      throw new Error("Bot já está conectado");
    }

    await this.connectSock();

    this.configEvents();
  }

  private connectSock() {
    return new Promise<boolean>((resolve) => {
      this.sock = makeWASocket({
        browser: Browsers.ubuntu("Bot Convite"),
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        getMessage: this.getMessageFromStore.bind(this),
        auth: this.auth.state,
        logger: this.logger,
        shouldIgnoreJid: this.ignoreJid.bind(this),
      });

      this.sock.ev.on("connection.update", async (update) => {
        if (update.connection === "open") {
          console.info("Bot conectado!");
          resolve(true);
        } else if (update.connection === "close") {
          console.warn("Bot desconectado!");
          resolve(this.connectSock());
        } else if (update.connection === "connecting") {
          console.info("Bot está se conectando...");
        } else if (update.qr) {
          console.info("QR code recebido!");
          QR.generate(update.qr, { small: true });
        }
      });

      this.sock.ev.on("creds.update", this.auth.saveCreds);
    });
  }

  private configEvents() {
    this.sock.ev.on("creds.update", this.auth.saveCreds);

    this.sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const message of messages) {
        console.info(JSON.stringify(message));
        if (!message.message) return;

        const contentType = getContentType(message.message);
        if (!contentType) return;

        let number = message.key.senderPn?.includes("@s")
          ? message.key.senderPn
          : message.key.senderLid?.includes("@s")
          ? message.key.senderLid
          : message.key.remoteJid;
        number = number.replace(/\D+/g, "");

        if (contentType === "pollUpdateMessage") {
          const messageContent = message.message[contentType];

          const userEnvite = await UserInvite.findOne({
            where: { pollId: messageContent.pollCreationMessageKey.id },
          });

          if (userEnvite) {
            const votesResult = getAggregateVotesInPollMessage({
              message: userEnvite.poll.message,
              pollUpdates: [messageContent as any],
            });

            for (const vote of votesResult) {
              if (vote.name === "sim" && vote.voters.length) {
                const user = await User.findOne({ where: { number } });

                if (user) {
                  const userInvite = await UserInvite.findOne({
                    where: { userId: user.id },
                    include: [
                      {
                        as: "invite",
                        model: Invite,
                        where: { status: InviteStatus.PENDING },
                        required: true,
                      },
                    ],
                  });

                  if (userInvite) {
                    await userInvite.invite.update({
                      status: InviteStatus.ACCEPTED,
                    });
                    await this.sendText(
                      botConfig.owner,
                      `${user.name} aceitou o convite!`
                    );
                  }
                }
              }

              if (vote.name === "não" && vote.voters.length) {
                const user = await User.findOne({ where: { number } });

                const userInvite = await UserInvite.findOne({
                  where: { userId: user.id },
                  include: [
                    {
                      as: "invite",
                      model: Invite,
                      where: { status: InviteStatus.PENDING },
                      required: true,
                    },
                  ],
                });

                if (userInvite) {
                  await userInvite.invite.update({
                    status: InviteStatus.REJECTED,
                  });
                  await this.sendText(
                    botConfig.owner,
                    `${user.name} rejeitou o convite!`
                  );
                }
              }
            }
          }
        }

        const messageContent = message.message[contentType];

        const msgText =
          contentType === "conversation"
            ? messageContent
            : contentType === "extendedTextMessage"
            ? messageContent["text"]
            : null;

        if (!msgText) return;

        if (msgText.toLowerCase() === "enviar convites") {
          sendInviteToAlls(this);
        }

        if (msgText.toLowerCase() === "sim") {
          const user = await User.findOne({ where: { number } });

          if (user) {
            const userInvite = await UserInvite.findOne({
              where: { userId: user.id },
              include: [
                {
                  as: "invite",
                  model: Invite,
                  where: { status: InviteStatus.PENDING },
                  required: true,
                },
              ],
            });

            if (userInvite) {
              await userInvite.invite.update({ status: InviteStatus.ACCEPTED });
              await this.sendText(
                botConfig.owner,
                `${user.name} aceitou o convite!`
              );
            }
          }
        }

        if (["não", "nao"].includes(msgText.toLowerCase())) {
          const user = await User.findOne({ where: { number } });

          const userInvite = await UserInvite.findOne({
            where: { userId: user.id },
            include: [
              {
                as: "invite",
                model: Invite,
                where: { status: InviteStatus.PENDING },
                required: true,
              },
            ],
          });

          if (userInvite) {
            await userInvite.invite.update({ status: InviteStatus.REJECTED });
            await this.sendText(
              botConfig.owner,
              `${user.name} rejeitou o convite!`
            );
          }
        }
      }
    });
  }

  public ignoreJid(jid: string) {
    return !(isJidUser(jid) || isLidUser(jid));
  }

  public async getMessageFromStore(key: WAMessageKey) {
    // TODO: implementar store para obter mensagem
    //? Adicione isso acaso as mensagens fique aparacendo "Aguardando"
    return null;
  }

  public getJidFromNumber(number: string) {
    const parsed = `${number}`.replace(/\D+/g, "");
    return `${parsed}@s.whatsapp.net`;
  }

  public async sendText(number: string, message: string) {
    const jid = this.getJidFromNumber(number);
    return await this.sock.sendMessage(jid, { text: message });
  }

  public async sendImage(number: string, image: Buffer, caption?: string) {
    const jid = this.getJidFromNumber(number);
    return await this.sock.sendMessage(jid, { image, caption });
  }

  public async sendImageFromPath(
    number: string,
    path: string,
    caption?: string
  ) {
    const image = fs.readFileSync(path);
    return await this.sendImage(number, image, caption);
  }

  public async sendPoll(
    number: string,
    message: string,
    options: string[],
    selectCount: number = 1
  ) {
    const jid = this.getJidFromNumber(number);
    return await this.sock.sendMessage(jid, {
      poll: {
        name: message,
        values: options,
        selectableCount: selectCount,
        toAnnouncementGroup: false,
      },
    });
  }
}

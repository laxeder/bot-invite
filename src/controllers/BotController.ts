import type { BotAuth } from "../utils/botAuth";
import type { WAMessageKey, WASocket } from "baileys";

import pino from "pino";
import QR from "qrcode-terminal";
import makeWASocket, {
  Browsers,
  getContentType,
  isJidUser,
  isLidUser,
} from "baileys";

import redis from "../database/redis";
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

    this.sock.ev.on("messages.upsert", ({ messages }) => {
      for (const message of messages) {
        console.info(JSON.stringify(message));
        if (!message.message) return;

        const contentType = getContentType(message.message);
        if (!contentType) return;

        const messageContent = message.message[contentType];
        console.log(contentType, messageContent);

        const msgText =
          contentType === "conversation"
            ? messageContent[contentType]
            : contentType === "extendedTextMessage"
            ? messageContent["text"]
            : null;

        if (!msgText) return;

        if (msgText.toLowerCase() === "enviar convites") {
          sendInviteToAlls(this);
        }

        console.log(msgText);
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

import type { BotAuth } from "../utils/botAuth";
import type { WAMessageKey, WASocket } from "baileys";

import pino from "pino";
import QR from "qrcode-terminal";
import makeWASocket, { Browsers, isJidUser, isLidUser } from "baileys";

import redis from "../database/redis";
import { useRedisAuthState } from "../utils/botAuth";

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
  }

  public ignoreJid(jid: string) {
    return !(isJidUser(jid) || isLidUser(jid));
  }

  public async getMessageFromStore(key: WAMessageKey) {
    // TODO: implementar store para obter mensagem
    //? Adicione isso acaso as mensagens fique aparacendo "Aguardando"
    return null;
  }
}

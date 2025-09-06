import BotController from "../controllers/BotController";

let botIntansce: BotController;

const BOT_ID = process.env.BOT_ID || "meubot";

export function getBotInstance() {
  if (botIntansce) return botIntansce;
  throw new Error("Bot não iniciado");
}

export async function createBotInstance() {
  if (botIntansce) return botIntansce;

  botIntansce = new BotController();
  await botIntansce.connect(BOT_ID);
}

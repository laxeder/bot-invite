import "dotenv/config";

import { connectRedis } from "./database/redis";
import { connectSequelize } from "./database/sequelize";

import { createBotInstance } from "./bot/botInstance";

async function main() {
  await connectSequelize();
  await connectRedis();
  await createBotInstance();
}

main();

import Redis from "ioredis";

import { redisConfig } from "../config/redis";

const redis = new Redis(redisConfig);

export async function connectRedis() {
  await redis.set("ping", "pong");
  console.info("✅ Redis conectado!");
}

export default redis;

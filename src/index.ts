import sequelize from "./database/sequelize";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.info("✅ Banco conectado e sincronizado!");

    await redis.set("ping", "pong");
    console.info("Redis respondeu:", await redis.get("ping"));
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

main();

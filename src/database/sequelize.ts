import { Sequelize } from "sequelize-typescript";
import models from "./models";

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5443,
  username: process.env.POSTGRES_USER || "botinvite",
  password: process.env.POSTGRES_PASSWORD || "botinvitepass",
  database: process.env.POSTGRES_DB || "botinvite",
  models: models,
  logging: false,
});

export default sequelize;

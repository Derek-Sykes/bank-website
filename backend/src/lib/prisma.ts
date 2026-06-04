import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.MYSQL_HOST ?? "localhost";
  const user = encodeURIComponent(process.env.MYSQL_USER ?? "root");
  const password = encodeURIComponent(process.env.MYSQL_PASSWORD ?? "");
  const database = process.env.MYSQL_DATABASE ?? "bank_app";
  return `mysql://${user}:${password}@${host}:3306/${database}`;
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl(),
    },
  },
});

export type PrismaTransaction = any;

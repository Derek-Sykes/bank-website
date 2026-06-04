import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function buildDatabaseUrlFromMysqlEnv() {
  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } =
    process.env;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
    return undefined;
  }

  const user = encodeURIComponent(MYSQL_USER);
  const password = encodeURIComponent(MYSQL_PASSWORD ?? "");
  const host = MYSQL_HOST;
  const database = encodeURIComponent(MYSQL_DATABASE);

  return `mysql://${user}:${password}@${host}:3306/${database}`;
}

const databaseUrl = process.env.DATABASE_URL ?? buildDatabaseUrlFromMysqlEnv();

const adapter = new PrismaMariaDb(
  databaseUrl ?? "mysql://user:password@localhost:3306/bank_app",
);

export const prisma = new PrismaClient({ adapter });

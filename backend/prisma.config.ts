import "dotenv/config";
import { defineConfig } from "prisma/config";

function buildDatabaseUrlFromMysqlEnv() {
  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } =
    process.env;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
    return "mysql://user:password@localhost:3306/bank_app";
  }

  const user = encodeURIComponent(MYSQL_USER);
  const password = encodeURIComponent(MYSQL_PASSWORD ?? "");
  const database = encodeURIComponent(MYSQL_DATABASE);

  return `mysql://${user}:${password}@${MYSQL_HOST}:3306/${database}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? buildDatabaseUrlFromMysqlEnv(),
  },
});

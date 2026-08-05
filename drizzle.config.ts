import { defineConfig } from "drizzle-kit";

let connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.MYSQL_HOST) {
  connectionString = `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`;
}

if (!connectionString) {
  throw new Error("DATABASE_URL or MYSQL variables are required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});

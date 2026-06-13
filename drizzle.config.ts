import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

const dataDir = resolve(process.env.SOMA_DATA_DIR ?? "./data");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: `${dataDir}/soma.db`,
  },
});

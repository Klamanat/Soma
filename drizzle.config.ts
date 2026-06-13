import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

const dataDir = resolve(process.env.SOMA_DATA_DIR ?? "./data");
const dbPath = resolve(dataDir, "soma.db");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
  // Exclude FTS5 virtual tables — managed manually in src/db/migrate.ts
  tablesFilter: ["!soma_fts*"],
});

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { resolve } from "path";
import { mkdirSync } from "fs";
import * as schema from "./schema";

const DATA_DIR = resolve(process.env.SOMA_DATA_DIR ?? "./data");
const DB_PATH = resolve(DATA_DIR, "soma.db");

// Ensure data directory exists before SQLite tries to create the file
// (db/index.ts may be imported before bootstrap() runs)
mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(DB_PATH, { create: true });

// WAL mode — concurrent reads + single writer without blocking
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA synchronous = NORMAL");
sqlite.exec("PRAGMA busy_timeout = 5000");
sqlite.exec("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };

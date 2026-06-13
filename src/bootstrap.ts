import { mkdir } from "fs/promises";
import { resolve } from "path";
import type { Database } from "bun:sqlite";

const VERSION = "1.0.0";

export async function bootstrap(): Promise<void> {
  const dataDir = resolve(process.env.SOMA_DATA_DIR ?? "./data");
  const repoRoot = resolve(process.env.SOMA_REPO_ROOT ?? ".");

  // 1. Ensure data directory exists before DB module is loaded
  await mkdir(dataDir, { recursive: true });

  // 2. Import DB singleton (creates soma.db inside dataDir)
  const { sqlite } = await import("./db/index");

  // 3. Create all tables if not exist
  pushSchema(sqlite);

  // 4. Create FTS5 virtual table + sync triggers
  const { runMigrations } = await import("./db/migrate");
  runMigrations();

  // 5. Ensure default single user exists (single-user mode)
  const { DEFAULT_USER_ID } = await import("./auth/middleware");
  sqlite.run(
    `INSERT OR IGNORE INTO soma_users (id, name, token, role, last_rotated_at, created_at)
     VALUES (?, 'default', 'single-user', 'user', ?, ?)`,
    [DEFAULT_USER_ID, Date.now(), Date.now()],
  );

  // 6. Ensure ink/ directory structure
  const inkDirs = [
    "ink",
    "ink/decisions",
    "ink/handoffs",
    "ink/memory",
    "ink/memory/retrospectives",
    "ink/patterns",
  ];
  for (const dir of inkDirs) {
    await mkdir(resolve(repoRoot, dir), { recursive: true });
  }

  console.log(`✓ Soma awakened — v${VERSION} @ ${dataDir}`);
}

function pushSchema(sqlite: Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_users (
      id TEXT PRIMARY KEY,
      name TEXT,
      token TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'user',
      failed_attempts INTEGER DEFAULT 0,
      locked_until INTEGER,
      token_expires_at INTEGER,
      last_rotated_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES soma_users(id),
      source_file TEXT,
      title TEXT,
      content TEXT NOT NULL,
      concepts TEXT,
      embedding BLOB,
      embedding_model TEXT,
      embedding_version INTEGER DEFAULT 1,
      embedding_status TEXT DEFAULT 'pending',
      encrypted_content INTEGER DEFAULT 0,
      superseded_by TEXT,
      deleted INTEGER DEFAULT 0,
      deleted_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_edges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES soma_users(id),
      from_id TEXT NOT NULL REFERENCES soma_documents(id),
      to_id TEXT NOT NULL REFERENCES soma_documents(id),
      relation TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_threads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES soma_users(id),
      title TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES soma_threads(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_traces (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES soma_users(id),
      tool_name TEXT NOT NULL,
      input_hash TEXT,
      output TEXT,
      latency_ms INTEGER,
      status_code INTEGER,
      error_message TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_token_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES soma_users(id),
      tool_name TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cached_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      estimated_cost_usd REAL,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES soma_users(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      error TEXT,
      result TEXT,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_rate_limits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER DEFAULT 0
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS soma_security_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    )
  `);
}

// Allow running standalone: bun src/bootstrap.ts
if (import.meta.main) {
  await bootstrap();
}

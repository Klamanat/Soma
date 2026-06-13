/**
 * src/vector/engine.ts
 *
 * Lazy-init LanceDB vector engine.
 * - First call to getEngine() tries to connect/create the table.
 * - If LanceDB is not installed or init fails → vectorMode = "disabled", no crash.
 * - All operations are userId-scoped (metadata filter on every query/insert).
 */

export type VectorMode = "embedded" | "disabled";

export interface VectorDocument {
  id: string;
  userId: string;
  content: string;
  vector: number[];
}

export interface VectorSearchResult {
  id: string;
  userId: string;
  score: number;
}

interface LanceEngine {
  table: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lancedb: any;
}

// ── Module-level state (singleton) ───────────────────────────────────────────

let engine: LanceEngine | null = null;
let initAttempted = false;
let vectorMode: VectorMode = "disabled";

const VECTOR_DIM = 1536; // default for text-embedding-3-small; override if needed
const TABLE_NAME = "soma_vectors";

// ── Init ──────────────────────────────────────────────────────────────────────

async function tryInit(): Promise<void> {
  if (initAttempted) return;
  initAttempted = true;

  const dataDir = process.env.SOMA_DATA_DIR
    ? (await import("path")).resolve(process.env.SOMA_DATA_DIR)
    : (await import("path")).resolve("./data/vectors");

  try {
    // Try both package names — @lancedb/lancedb (new) and vectordb (old)
    let lancedb: LanceEngine["lancedb"] | null = null;
    for (const pkg of ["@lancedb/lancedb", "vectordb"]) {
      try {
        lancedb = await import(pkg);
        break;
      } catch {
        // not installed — try next
      }
    }

    if (!lancedb) {
      console.error("[vector] LanceDB not installed — vectorMode: disabled");
      return;
    }

    const { mkdir } = await import("fs/promises");
    await mkdir(dataDir, { recursive: true });

    const db = await (lancedb as any).connect(dataDir);

    // Create table if it doesn't exist
    let table: unknown;
    const tableNames: string[] = await db.tableNames();
    if (tableNames.includes(TABLE_NAME)) {
      table = await db.openTable(TABLE_NAME);
    } else {
      // Create with a dummy seed record (LanceDB needs schema inference)
      table = await db.createTable(TABLE_NAME, [
        {
          id: "__seed__",
          userId: "__seed__",
          content: "",
          vector: Array(VECTOR_DIM).fill(0),
        },
      ]);
      // Remove the seed record
      await (table as any).delete('id = "__seed__"');
    }

    engine = { table, lancedb };
    vectorMode = "embedded";
    console.error(`[vector] LanceDB ready — table: ${TABLE_NAME} @ ${dataDir}`);
  } catch (err) {
    console.error("[vector] Init failed — vectorMode: disabled", err);
    vectorMode = "disabled";
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getVectorMode(): Promise<VectorMode> {
  await tryInit();
  return vectorMode;
}

/**
 * Index a document into the vector table.
 * No-op if vectorMode is disabled.
 */
export async function indexDocument(doc: VectorDocument): Promise<boolean> {
  await tryInit();
  if (!engine) return false;

  try {
    const table = engine.table as any;
    // Upsert: delete existing then insert
    await table.delete(`id = "${doc.id}"`);
    await table.add([
      {
        id: doc.id,
        userId: doc.userId,
        content: doc.content,
        vector: doc.vector,
      },
    ]);
    return true;
  } catch (err) {
    console.error("[vector] indexDocument failed", err);
    return false;
  }
}

/**
 * Search for similar vectors — always filtered by userId.
 * Returns empty array if vectorMode is disabled.
 */
export async function vectorSearch(
  queryVector: number[],
  userId: string,
  limit = 10,
): Promise<VectorSearchResult[]> {
  await tryInit();
  if (!engine) return [];

  try {
    const table = engine.table as any;
    const rows: Array<{ id: string; userId: string; _distance: number }> =
      await table
        .search(queryVector)
        .where(`userId = "${escapeString(userId)}"`)
        .limit(limit)
        .toArray();

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      score: 1 / (1 + row._distance), // convert distance to similarity score
    }));
  } catch (err) {
    console.error("[vector] vectorSearch failed", err);
    return [];
  }
}

/**
 * Delete all vectors for a given document id (userId verified).
 */
export async function deleteDocument(
  id: string,
  userId: string,
): Promise<void> {
  await tryInit();
  if (!engine) return;

  try {
    const table = engine.table as any;
    await table.delete(
      `id = "${escapeString(id)}" AND userId = "${escapeString(userId)}"`,
    );
  } catch (err) {
    console.error("[vector] deleteDocument failed", err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape single quotes to prevent SQL injection in LanceDB filter strings */
function escapeString(s: string): string {
  return s.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

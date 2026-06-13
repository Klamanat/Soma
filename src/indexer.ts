/**
 * src/indexer.ts
 *
 * Scans ink/ directory for markdown files, parses frontmatter + content,
 * and upserts into soma_documents for a given userId.
 *
 * Design rules:
 * - Path traversal: only files strictly inside ink/ are allowed
 * - Upsert by sourceFile: re-index on content change, skip if unchanged
 * - Soft-deleted docs are NOT re-created by the indexer
 */

import { readdir, readFile, stat } from "fs/promises";
import { resolve, extname, relative } from "path";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db } from "./db/index";
import { somaDocuments } from "./db/schema";

const INK_DIR_NAME = "ink";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IndexResult {
  scanned: number;
  upserted: number;
  skipped: number;
  errors: string[];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Scan ink/ directory and upsert all .md files into soma_documents.
 * @param userId  Owner of the indexed documents
 * @param reindex If true, force re-upsert even if content hasn't changed
 */
export async function scanInk(
  userId: string,
  reindex = false,
): Promise<IndexResult> {
  const repoRoot = resolve(process.env.SOMA_REPO_ROOT ?? ".");
  const inkDir = resolve(repoRoot, INK_DIR_NAME);
  const result: IndexResult = {
    scanned: 0,
    upserted: 0,
    skipped: 0,
    errors: [],
  };

  let files: string[];
  try {
    files = await collectMarkdownFiles(inkDir);
  } catch {
    result.errors.push(`ink/ directory not found or unreadable: ${inkDir}`);
    return result;
  }

  for (const filePath of files) {
    result.scanned++;
    try {
      await indexFile(filePath, userId, inkDir, reindex, result);
    } catch (err) {
      result.errors.push(`${filePath}: ${String(err)}`);
    }
  }

  return result;
}

/**
 * Index a single file. Called by scanInk and by the file watcher.
 */
export async function indexFile(
  filePath: string,
  userId: string,
  inkDir?: string,
  reindex = false,
  result?: IndexResult,
): Promise<void> {
  const safeInkDir =
    inkDir ?? resolve(process.env.SOMA_REPO_ROOT ?? ".", INK_DIR_NAME);

  // Path traversal guard
  const safe = resolve(filePath);
  if (!safe.startsWith(safeInkDir)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  const raw = await readFile(safe, "utf8");
  const { frontmatter, content, title, concepts } = parseMarkdown(raw);
  const sourceFile = relative(safeInkDir, safe).replace(/\\/g, "/");

  // Check for existing doc with same sourceFile (not deleted)
  const existing = db
    .select({ id: somaDocuments.id, content: somaDocuments.content })
    .from(somaDocuments)
    .where(
      and(
        eq(somaDocuments.userId, userId),
        eq(somaDocuments.sourceFile, sourceFile),
        eq(somaDocuments.deleted, 0),
      ),
    )
    .get();

  if (existing) {
    // Skip if content unchanged and not forced reindex
    if (!reindex && existing.content === content) {
      if (result) result.skipped++;
      return;
    }
    // Update existing doc
    db.update(somaDocuments)
      .set({
        title: title ?? null,
        content,
        concepts: concepts ? JSON.stringify(concepts) : null,
        embeddingStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(somaDocuments.id, existing.id))
      .run();
  } else {
    // Insert new doc
    db.insert(somaDocuments)
      .values({
        id: nanoid(),
        userId,
        sourceFile,
        title: title ?? null,
        content,
        concepts: concepts ? JSON.stringify(concepts) : null,
        embeddingStatus: "pending",
        deleted: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();
  }

  if (result) result.upserted++;
}

/**
 * Remove a document by sourceFile when the file is deleted.
 * Soft-deletes to preserve history.
 */
export async function removeFile(
  filePath: string,
  userId: string,
): Promise<void> {
  const repoRoot = resolve(process.env.SOMA_REPO_ROOT ?? ".");
  const inkDir = resolve(repoRoot, INK_DIR_NAME);
  const sourceFile = relative(inkDir, resolve(filePath)).replace(/\\/g, "/");

  if (!userId) return;

  db.update(somaDocuments)
    .set({ deleted: 1, deletedReason: "file deleted", updatedAt: new Date() })
    .where(
      and(
        eq(somaDocuments.userId, userId),
        eq(somaDocuments.sourceFile, sourceFile),
        eq(somaDocuments.deleted, 0),
      ),
    )
    .run();
}

// ── Markdown parser ───────────────────────────────────────────────────────────

interface ParsedMarkdown {
  frontmatter: Record<string, string>;
  content: string;
  title: string | null;
  concepts: string[] | null;
}

function parseMarkdown(raw: string): ParsedMarkdown {
  let frontmatter: Record<string, string> = {};
  let body = raw.trim();

  // Parse YAML-ish frontmatter between --- delimiters
  if (body.startsWith("---")) {
    const end = body.indexOf("---", 3);
    if (end !== -1) {
      const fmBlock = body.slice(3, end).trim();
      body = body.slice(end + 3).trim();
      frontmatter = parseFrontmatter(fmBlock);
    }
  }

  // Extract title from first H1 or frontmatter
  let title: string | null = frontmatter.title ?? null;
  if (!title) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match) title = h1Match[1].trim();
  }

  // Extract concepts from frontmatter tags/concepts field
  let concepts: string[] | null = null;
  const rawConcepts = frontmatter.concepts ?? frontmatter.tags ?? null;
  if (rawConcepts) {
    concepts = rawConcepts
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return { frontmatter, content: body || raw.trim(), title, concepts };
}

function parseFrontmatter(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

// ── File walker ───────────────────────────────────────────────────────────────

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await collectMarkdownFiles(full);
      files.push(...sub);
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      files.push(full);
    }
  }

  return files;
}

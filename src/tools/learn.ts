import { mkdir, writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index";
import { somaDocuments } from "../db/schema";

// ── Injection detection ───────────────────────────────────────────────────────
// Note: [[wikilinks]] are intentionally excluded — we generate them ourselves.

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /<script[\s\S]*?>/i,
  /base64[,:\s][\w+/]{20,}/i,
];

function detectInjection(content: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(content));
}

// ── Schema ────────────────────────────────────────────────────────────────────

const learnSchema = z.object({
  content: z.string().min(1).max(50_000),
  title: z.string().max(500).optional(),
  concepts: z.array(z.string().max(50)).max(20).optional(),
  sourceFile: z.string().max(500).optional(),
  supersedes: z.string().max(50).optional(),
});

export type LearnInput = z.infer<typeof learnSchema>;

// ── Tool ──────────────────────────────────────────────────────────────────────

export async function somaLearn(
  rawInput: unknown,
  userId: string,
): Promise<{
  id: string;
  created: true;
  embedded: false;
  file: string;
}> {
  const input = learnSchema.parse(rawInput);

  if (detectInjection(input.content)) {
    throw new Error("Content rejected: potential injection detected");
  }

  const id = nanoid();
  const now = new Date();
  const conceptsJson = input.concepts ? JSON.stringify(input.concepts) : null;

  // ── Compute ink/ file path ──────────────────────────────────────────────────
  const yearMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const dateStr = now.toISOString().slice(0, 10);  // YYYY-MM-DD
  const slug = (input.title ?? id)
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const fileName = `${dateStr}-${slug}.md`;
  const sourceFile = `memory/${yearMonth}/${fileName}`; // relative to ink/

  // ── Insert into DB ──────────────────────────────────────────────────────────
  db.insert(somaDocuments)
    .values({
      id,
      userId,
      title: input.title ?? null,
      content: input.content,
      concepts: conceptsJson,
      sourceFile,
      supersededBy: null,
      deleted: 0,
      embeddingStatus: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // If this supersedes an existing doc, mark the old one
  if (input.supersedes) {
    const old = db
      .select({ id: somaDocuments.id, userId: somaDocuments.userId })
      .from(somaDocuments)
      .where(eq(somaDocuments.id, input.supersedes))
      .get();

    if (old && old.userId === userId) {
      db.update(somaDocuments)
        .set({ supersededBy: id, updatedAt: now })
        .where(eq(somaDocuments.id, input.supersedes))
        .run();
    }
  }

  // ── Write markdown file to ink/ ─────────────────────────────────────────────
  const repoRoot = resolve(process.env.SOMA_REPO_ROOT ?? ".");
  const filePath = resolve(repoRoot, "ink", sourceFile);
  await mkdir(dirname(filePath), { recursive: true });

  const concepts = input.concepts ?? [];
  const wikilinks = concepts.map((c) => `[[${c}]]`).join(" ");

  const lines: string[] = [
    "---",
    `id: ${id}`,
    `date: ${now.toISOString()}`,
    `concepts: [${concepts.map((c) => `"${c}"`).join(", ")}]`,
    "---",
    "",
  ];
  if (input.title) {
    lines.push(`# ${input.title}`, "");
  }
  lines.push(input.content);
  if (wikilinks) {
    lines.push("", wikilinks);
  }
  lines.push("");

  await writeFile(filePath, lines.join("\n"), "utf8");

  return { id, created: true, embedded: false, file: sourceFile };
}

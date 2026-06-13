import { mkdir, writeFile, access, appendFile } from "fs/promises";
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
  const yearMonth = now.toISOString().slice(0, 7);  // YYYY-MM
  const day = now.toISOString().slice(8, 10);        // DD
  const hhmm = now.toISOString().slice(11, 16).replace(":", ""); // HHmm
  const slug = (input.title ?? id)
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const fileName = `${day}-${hhmm}-${slug}.md`;
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

  // ── Write 3 ink/ files ────────────────────────────────────────────────────
  const repoRoot = resolve(process.env.SOMA_REPO_ROOT ?? ".");
  const inkDir = resolve(repoRoot, "ink");
  const concepts = input.concepts ?? [];
  const wikilinks = concepts.map((c) => `[[${c}]]`).join(" ");

  try {
    // 1. ink/memory/YYYY-MM/DD-HHmm-slug.md ─────────────────────────────────
    const memPath = resolve(inkDir, sourceFile);
    await mkdir(dirname(memPath), { recursive: true });

    const memLines: string[] = [
      "---",
      `id: ${id}`,
      `date: ${now.toISOString()}`,
      `concepts: [${concepts.map((c) => `"${c}"`).join(", ")}]`,
      "---",
      "",
    ];
    if (input.title) memLines.push(`# ${input.title}`, "");
    memLines.push(input.content);
    if (wikilinks) memLines.push("", wikilinks);
    memLines.push("");
    await writeFile(memPath, memLines.join("\n"), "utf8");

    // 2. ink/concepts/<concept>.md — hub node (create only if missing) ───────
    for (const concept of concepts) {
      const cPath = resolve(inkDir, "concepts", `${concept}.md`);
      await mkdir(dirname(cPath), { recursive: true });
      const exists = await access(cPath).then(() => true).catch(() => false);
      if (!exists) {
        const hubLines = [
          "---",
          `concept: "${concept}"`,
          "---",
          "",
          `# ${concept}`,
          "",
        ];
        await writeFile(cPath, hubLines.join("\n"), "utf8");
      }
    }

    // 3. ink/index/YYYY-MM.md — append entry ─────────────────────────────────
    const idxPath = resolve(inkDir, "index", `${yearMonth}.md`);
    await mkdir(dirname(idxPath), { recursive: true });
    const idxExists = await access(idxPath).then(() => true).catch(() => false);
    if (!idxExists) {
      await writeFile(idxPath, `# Index — ${yearMonth}\n\n`, "utf8");
    }
    const dateStr = now.toISOString().slice(0, 10);
    const idxEntry = `- [[memory/${yearMonth}/${fileName.replace(".md", "")}]] — ${input.title ?? id} (${dateStr})\n`;
    await appendFile(idxPath, idxEntry, "utf8");

  } catch (err) {
    // File write failure is non-fatal — DB insert already succeeded
    console.error(`[learn] file write error: ${err}`);
  }

  return { id, created: true, embedded: false, file: sourceFile };
}

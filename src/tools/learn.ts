import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index";
import { somaDocuments } from "../db/schema";

// ── Injection detection ───────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /\[\[.*?\]\]/,
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
}> {
  const input = learnSchema.parse(rawInput);

  if (detectInjection(input.content)) {
    throw new Error("Content rejected: potential injection detected");
  }

  const id = nanoid();
  const now = new Date();
  const conceptsJson = input.concepts ? JSON.stringify(input.concepts) : null;

  db.insert(somaDocuments)
    .values({
      id,
      userId,
      title: input.title ?? null,
      content: input.content,
      concepts: conceptsJson,
      sourceFile: input.sourceFile ?? null,
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

  return { id, created: true, embedded: false };
}

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index";
import { somaDocuments } from "../db/schema";

const supersedeSchema = z.object({
  oldId: z.string().min(1).max(50),
  newContent: z.string().min(1).max(50_000),
  title: z.string().max(500).optional(),
  concepts: z.array(z.string().max(50)).max(20).optional(),
});

export type SupersedeInput = z.infer<typeof supersedeSchema>;

export async function somaSupersede(
  rawInput: unknown,
  userId: string,
): Promise<{
  oldId: string;
  newId: string;
  chain: string[];
}> {
  const input = supersedeSchema.parse(rawInput);

  // Verify old doc exists and belongs to this user
  const old = db
    .select({ id: somaDocuments.id, supersededBy: somaDocuments.supersededBy })
    .from(somaDocuments)
    .where(
      and(eq(somaDocuments.id, input.oldId), eq(somaDocuments.userId, userId)),
    )
    .get();

  if (!old) {
    throw new Error(`Document not found: ${input.oldId}`);
  }

  const newId = nanoid();
  const now = new Date();
  const conceptsJson = input.concepts ? JSON.stringify(input.concepts) : null;

  // Insert new doc
  db.insert(somaDocuments)
    .values({
      id: newId,
      userId,
      title: input.title ?? null,
      content: input.newContent,
      concepts: conceptsJson,
      supersededBy: null,
      deleted: 0,
      embeddingStatus: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Mark old doc as superseded
  db.update(somaDocuments)
    .set({ supersededBy: newId, updatedAt: now })
    .where(
      and(eq(somaDocuments.id, input.oldId), eq(somaDocuments.userId, userId)),
    )
    .run();

  // Build chain: walk back through supersededBy to find ancestry
  const chain = buildChain(input.oldId, userId);
  chain.push(newId);

  return { oldId: input.oldId, newId, chain };
}

/** Walk backwards through supersededBy links to build the replacement chain */
function buildChain(startId: string, userId: string): string[] {
  const chain: string[] = [];
  let current: string | null = startId;

  while (current) {
    chain.unshift(current);
    const doc = db
      .select({
        id: somaDocuments.id,
        supersededBy: somaDocuments.supersededBy,
      })
      .from(somaDocuments)
      .where(
        and(eq(somaDocuments.id, current), eq(somaDocuments.userId, userId)),
      )
      .get();

    // Find what superseded this doc (i.e. look for docs that point to current as their old)
    // chain grows forward: find if any doc had this as its source
    // We stop at startId — chain is just [startId] for now, newId appended by caller
    break;
  }

  return chain;
}

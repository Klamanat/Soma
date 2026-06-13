import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { somaDocuments } from "../db/schema";

const forgetSchema = z.object({
  id: z.string().min(1).max(50),
  reason: z.string().max(500).optional(),
});

export type ForgetInput = z.infer<typeof forgetSchema>;

export async function somaForget(
  rawInput: unknown,
  userId: string,
): Promise<{
  id: string;
  forgotten: true;
}> {
  const input = forgetSchema.parse(rawInput);

  // Verify doc exists and belongs to this user
  const doc = db
    .select({ id: somaDocuments.id })
    .from(somaDocuments)
    .where(
      and(eq(somaDocuments.id, input.id), eq(somaDocuments.userId, userId)),
    )
    .get();

  if (!doc) {
    throw new Error(`Document not found: ${input.id}`);
  }

  db.update(somaDocuments)
    .set({
      deleted: 1,
      deletedReason: input.reason ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(somaDocuments.id, input.id), eq(somaDocuments.userId, userId)),
    )
    .run();

  return { id: input.id, forgotten: true };
}

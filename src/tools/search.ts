import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db, sqlite } from "../db/index";
import { somaDocuments } from "../db/schema";

const searchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).default(10),
  concepts: z.array(z.string().max(50)).max(10).optional(),
  format: z.enum(["full", "summary", "ids"]).default("summary"),
});

export type SearchInput = z.infer<typeof searchSchema>;

export type SearchResult =
  | {
      id: string;
      title: string | null;
      content: string;
      concepts: string[] | null;
      score: number;
    }
  | {
      id: string;
      title: string | null;
      concepts: string[] | null;
      score: number;
      excerpt: string;
    }
  | { id: string; score: number };

export async function somaSearch(
  rawInput: unknown,
  userId: string,
): Promise<{
  results: SearchResult[];
  total: number;
  mode: "fts";
  truncated: boolean;
}> {
  const input = searchSchema.parse(rawInput);

  // FTS5 query — scope to userId, exclude soft-deleted
  const ftsRows = sqlite
    .query<
      {
        id: string;
        title: string | null;
        concepts: string | null;
        rank: number;
      },
      [string, string, number]
    >(
      `
    SELECT d.id, d.title, d.concepts, fts.rank
    FROM soma_fts fts
    JOIN soma_documents d ON d.id = fts.id
    WHERE soma_fts MATCH ?
      AND fts.user_id = ?
      AND d.deleted = 0
      AND d.superseded_by IS NULL
    ORDER BY fts.rank
    LIMIT ?
  `,
    )
    .all(input.q, userId, input.limit);

  // Optional concept filter
  let rows = ftsRows;
  if (input.concepts && input.concepts.length > 0) {
    rows = ftsRows.filter((row) => {
      if (!row.concepts) return false;
      try {
        const rowConcepts: string[] = JSON.parse(row.concepts);
        return input.concepts!.some((c) => rowConcepts.includes(c));
      } catch {
        return false;
      }
    });
  }

  const results: SearchResult[] = await Promise.all(
    rows.map(async (row) => {
      const score = Math.abs(row.rank);
      const concepts = row.concepts ? tryParseJSON(row.concepts) : null;

      if (input.format === "ids") {
        return { id: row.id, score } satisfies SearchResult;
      }

      if (input.format === "summary") {
        const doc = db
          .select({ content: somaDocuments.content })
          .from(somaDocuments)
          .where(
            and(eq(somaDocuments.id, row.id), eq(somaDocuments.userId, userId)),
          )
          .get();
        const excerpt = doc?.content?.slice(0, 200) ?? "";
        return {
          id: row.id,
          title: row.title,
          concepts,
          score,
          excerpt,
        } satisfies SearchResult;
      }

      // format === "full"
      const doc = db
        .select()
        .from(somaDocuments)
        .where(
          and(eq(somaDocuments.id, row.id), eq(somaDocuments.userId, userId)),
        )
        .get();

      return {
        id: row.id,
        title: row.title,
        content: doc?.content ?? "",
        concepts,
        score,
      } satisfies SearchResult;
    }),
  );

  return {
    results,
    total: results.length,
    mode: "fts",
    truncated: false,
  };
}

function tryParseJSON(s: string): string[] | null {
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

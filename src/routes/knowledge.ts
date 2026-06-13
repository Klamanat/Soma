import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth/middleware";
import { somaSearch } from "../tools/search";
import { somaLearn } from "../tools/learn";
import { somaForget } from "../tools/forget";
import { somaSupersede } from "../tools/supersede";

export const knowledgeRouter = new Hono<AuthEnv>();

// ── GET /api/search?q=&mode=&format=&limit= ────────────────────────────────

knowledgeRouter.get("/search", async (c) => {
  const userId = c.get("userId");
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing query parameter: q" }, 400);

  const input = {
    q,
    limit: Number(c.req.query("limit") ?? 10),
    format: (c.req.query("format") ?? "summary") as "full" | "summary" | "ids",
    concepts: c.req.query("concepts")?.split(",").filter(Boolean),
  };

  try {
    const result = await somaSearch(input, userId);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.flatten() : String(err);
    return c.json({ error: msg }, 400);
  }
});

// ── POST /api/learn ────────────────────────────────────────────────────────

knowledgeRouter.post("/learn", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  try {
    const result = await somaLearn(body, userId);
    return c.json(result, 201);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.flatten() : String(err);
    return c.json({ error: msg }, 400);
  }
});

// ── POST /api/forget ───────────────────────────────────────────────────────

knowledgeRouter.post("/forget", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  try {
    const result = await somaForget(body, userId);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.flatten() : String(err);
    const status = String(err).includes("not found") ? 404 : 400;
    return c.json({ error: msg }, status);
  }
});

// ── POST /api/supersede ────────────────────────────────────────────────────

knowledgeRouter.post("/supersede", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  try {
    const result = await somaSupersede(body, userId);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.flatten() : String(err);
    const status = String(err).includes("not found") ? 404 : 400;
    return c.json({ error: msg }, status);
  }
});

// ── GET /api/reflect (random/seeded doc for reflection) ───────────────────

knowledgeRouter.get("/reflect", async (c) => {
  const userId = c.get("userId");
  const { db } = await import("../db/index");
  const { somaDocuments } = await import("../db/schema");
  const { and, eq, isNull, sql } = await import("drizzle-orm");

  const concept = c.req.query("concept");
  const exclude = c.req.query("exclude")?.split(",").filter(Boolean) ?? [];

  let query = db
    .select({
      id: somaDocuments.id,
      title: somaDocuments.title,
      content: somaDocuments.content,
      concepts: somaDocuments.concepts,
      createdAt: somaDocuments.createdAt,
    })
    .from(somaDocuments)
    .where(
      and(
        eq(somaDocuments.userId, userId),
        eq(somaDocuments.deleted, 0),
        isNull(somaDocuments.supersededBy),
      ),
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

  const doc = query.get();
  if (!doc) return c.json({ doc: null });

  const age = Math.floor(
    (Date.now() - doc.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  return c.json({
    doc: {
      ...doc,
      concepts: doc.concepts ? tryParseJSON(doc.concepts) : null,
      age,
    },
  });
});

// ── GET /api/list ──────────────────────────────────────────────────────────

knowledgeRouter.get("/list", async (c) => {
  const userId = c.get("userId");
  const { db } = await import("../db/index");
  const { somaDocuments } = await import("../db/schema");
  const { and, eq, isNull } = await import("drizzle-orm");

  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const offset = Number(c.req.query("offset") ?? 0);

  const docs = db
    .select({
      id: somaDocuments.id,
      title: somaDocuments.title,
      concepts: somaDocuments.concepts,
      createdAt: somaDocuments.createdAt,
    })
    .from(somaDocuments)
    .where(
      and(
        eq(somaDocuments.userId, userId),
        eq(somaDocuments.deleted, 0),
        isNull(somaDocuments.supersededBy),
      ),
    )
    .limit(limit)
    .offset(offset)
    .all();

  return c.json({
    docs: docs.map((d) => ({
      ...d,
      concepts: d.concepts ? tryParseJSON(d.concepts) : null,
    })),
    limit,
    offset,
  });
});

// ── GET /api/stats ─────────────────────────────────────────────────────────

knowledgeRouter.get("/stats", async (c) => {
  const userId = c.get("userId");
  const { db } = await import("../db/index");
  const { somaDocuments } = await import("../db/schema");
  const { and, eq, isNull, sql } = await import("drizzle-orm");

  const totalDocs =
    db
      .select({ count: sql<number>`count(*)` })
      .from(somaDocuments)
      .where(
        and(eq(somaDocuments.userId, userId), eq(somaDocuments.deleted, 0)),
      )
      .get()?.count ?? 0;

  return c.json({
    totalDocs,
    vectorMode: "disabled",
    ftsEnabled: true,
  });
});

function tryParseJSON(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

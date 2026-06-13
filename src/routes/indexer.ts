import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth/middleware";
import { scanInk } from "../indexer";

export const indexerRouter = new Hono<AuthEnv>();

const scanSchema = z.object({
  reindex: z.boolean().default(false),
});

// ── POST /api/indexer/scan ─────────────────────────────────────────────────

indexerRouter.post("/scan", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const { reindex } = scanSchema.parse(body);

  const result = await scanInk(userId, reindex);
  return c.json(result);
});

// ── POST /api/indexer/reindex ──────────────────────────────────────────────

indexerRouter.post("/reindex", async (c) => {
  const userId = c.get("userId");

  const result = await scanInk(userId, true);
  return c.json(result);
});

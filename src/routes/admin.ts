import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index";
import { somaUsers } from "../db/schema";
import { adminMiddleware } from "../auth/middleware";
import { generateToken, hashToken } from "../auth/tokens";

export const adminRouter = new Hono();

adminRouter.use("*", adminMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────

adminRouter.post("/users", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      400,
    );
  }

  const userId = nanoid();
  const token = generateToken(userId);
  const tokenHash = await hashToken(token);
  const now = new Date();

  db.insert(somaUsers)
    .values({
      id: userId,
      name: parsed.data.name,
      token: tokenHash,
      role: "user",
      failedAttempts: 0,
      lockedUntil: null,
      tokenExpiresAt: null,
      lastRotatedAt: now,
      createdAt: now,
    })
    .run();

  // Token shown only once — not stored in plaintext
  return c.json({ userId, name: parsed.data.name, token }, 201);
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────

adminRouter.get("/users", (c) => {
  const users = db
    .select({
      id: somaUsers.id,
      name: somaUsers.name,
      role: somaUsers.role,
      failedAttempts: somaUsers.failedAttempts,
      lockedUntil: somaUsers.lockedUntil,
      tokenExpiresAt: somaUsers.tokenExpiresAt,
      lastRotatedAt: somaUsers.lastRotatedAt,
      createdAt: somaUsers.createdAt,
    })
    .from(somaUsers)
    .all();

  return c.json({ users });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────

adminRouter.delete("/users/:id", (c) => {
  const id = c.req.param("id");

  const user = db
    .select({ id: somaUsers.id })
    .from(somaUsers)
    .where(eq(somaUsers.id, id))
    .get();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  db.delete(somaUsers).where(eq(somaUsers.id, id)).run();

  return c.json({ deleted: true, userId: id });
});

// ── POST /api/admin/users/:id/rotate-token ────────────────────────────────────

adminRouter.post("/users/:id/rotate-token", async (c) => {
  const id = c.req.param("id");

  const user = db
    .select({ id: somaUsers.id })
    .from(somaUsers)
    .where(eq(somaUsers.id, id))
    .get();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const token = generateToken(id);
  const tokenHash = await hashToken(token);
  const now = new Date();

  db.update(somaUsers)
    .set({
      token: tokenHash,
      lastRotatedAt: now,
      failedAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(somaUsers.id, id))
    .run();

  // New token shown only once
  return c.json({ userId: id, token, rotatedAt: now.toISOString() });
});

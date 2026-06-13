import type { Context, Next } from "hono";
import { verifyToken } from "./tokens";

export type AuthEnv = {
  Variables: {
    userId: string;
  };
};

/**
 * Hono middleware: extracts Bearer token from Authorization header,
 * verifies it, and injects userId into context.
 *
 * userId MUST always come from this middleware — never from request body/params.
 */
export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7).trim();
  const userId = await verifyToken(token);

  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("userId", userId);
  await next();
}

/**
 * Admin-only middleware: checks SOMA_ADMIN_TOKEN env var.
 * Use for /api/admin/* routes.
 */
export async function adminMiddleware(c: Context, next: Next) {
  const adminToken = process.env.SOMA_ADMIN_TOKEN;
  if (!adminToken) {
    return c.json({ error: "Admin not configured" }, 503);
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const provided = authHeader.slice(7).trim();
  if (provided !== adminToken) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
}

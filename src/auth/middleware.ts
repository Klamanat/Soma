import type { Context, Next } from "hono";

/** Single-user mode — all requests run as this fixed user ID. */
export const DEFAULT_USER_ID = "default";

export type AuthEnv = {
  Variables: {
    userId: string;
  };
};

/**
 * Single-user middleware: injects the fixed DEFAULT_USER_ID.
 * No token required.
 */
export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  c.set("userId", DEFAULT_USER_ID);
  await next();
}

/**
 * Admin middleware: no-op in single-user mode, always allows through.
 */
export async function adminMiddleware(_c: Context, next: Next) {
  await next();
}

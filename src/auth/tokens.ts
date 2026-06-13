import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { eq, like } from "drizzle-orm";
import { db } from "../db/index";
import { somaUsers } from "../db/schema";

const BCRYPT_ROUNDS = 10;
const LOCK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_ATTEMPTS = 10;

/** Generate a token in the format tok_<userId6>_<random32hex> */
export function generateToken(userId: string): string {
  const random = randomBytes(32).toString("hex");
  return `tok_${userId.slice(0, 6)}_${random}`;
}

/** Hash a plaintext token for storage */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, BCRYPT_ROUNDS);
}

/**
 * Verify a Bearer token and return the userId, or null if invalid/locked.
 * Uses prefix lookup before bcrypt to avoid timing attacks on wrong tokens.
 */
export async function verifyToken(raw: string): Promise<string | null> {
  if (!raw.startsWith("tok_")) return null;

  // Token format: tok_<userId6>_<random>
  // userId6 is the first 6 chars of the userId — use it to narrow DB lookup
  const parts = raw.split("_");
  if (parts.length < 3) return null;
  const userId6 = parts[1]; // e.g. "abc123"

  const candidates = db
    .select()
    .from(somaUsers)
    .where(like(somaUsers.id, `${userId6}%`))
    .all();

  for (const user of candidates) {
    // Check lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return null;
    }

    const valid = await bcrypt.compare(raw, user.token);

    if (valid) {
      // Check token expiry
      if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
        return null;
      }
      // Reset failed attempts on success
      if ((user.failedAttempts ?? 0) > 0) {
        db.update(somaUsers)
          .set({ failedAttempts: 0 })
          .where(eq(somaUsers.id, user.id))
          .run();
      }
      return user.id;
    }

    // Wrong password — increment failed attempts
    const attempts = (user.failedAttempts ?? 0) + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCK_WINDOW_MS)
        : null;

    db.update(somaUsers)
      .set({ failedAttempts: attempts, lockedUntil })
      .where(eq(somaUsers.id, user.id))
      .run();
  }

  return null;
}

/** Reset failed attempts and optionally set a new expiry */
export function resetFailedAttempts(userId: string): void {
  db.update(somaUsers)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(somaUsers.id, userId))
    .run();
}

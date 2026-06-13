import { describe, it, expect, beforeAll } from "vitest";
import {
  generateToken,
  hashToken,
  verifyToken,
  resetFailedAttempts,
} from "../../src/auth/tokens";
import { db } from "../../src/db/index";
import { somaUsers } from "../../src/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// Seed a test user before tests
let testUserId: string;
let testToken: string;
let testTokenHash: string;

beforeAll(async () => {
  // Bootstrap DB (idempotent)
  const { bootstrap } = await import("../../src/bootstrap");
  await bootstrap();

  testUserId = nanoid();
  testToken = generateToken(testUserId);
  testTokenHash = await hashToken(testToken);

  db.insert(somaUsers)
    .values({
      id: testUserId,
      name: "Test User",
      token: testTokenHash,
      role: "user",
      failedAttempts: 0,
      lockedUntil: null,
      tokenExpiresAt: null,
      lastRotatedAt: new Date(),
      createdAt: new Date(),
    })
    .run();
});

describe("generateToken", () => {
  it("produces tok_<userId6>_<hex> format", () => {
    const token = generateToken("abc123xyz");
    expect(token).toMatch(/^tok_abc123_[0-9a-f]{64}$/);
  });

  it("produces unique tokens each call", () => {
    const a = generateToken("user01");
    const b = generateToken("user01");
    expect(a).not.toBe(b);
  });
});

describe("hashToken", () => {
  it("returns a bcrypt hash", async () => {
    const hash = await hashToken("tok_abc123_deadbeef");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("two hashes of same token differ (salt)", async () => {
    const h1 = await hashToken("tok_abc123_deadbeef");
    const h2 = await hashToken("tok_abc123_deadbeef");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyToken", () => {
  it("returns userId for a valid token", async () => {
    const result = await verifyToken(testToken);
    expect(result).toBe(testUserId);
  });

  it("returns null for wrong token", async () => {
    const wrong = generateToken(testUserId); // different random part
    const result = await verifyToken(wrong);
    expect(result).toBeNull();
  });

  it("returns null for token without tok_ prefix", async () => {
    expect(await verifyToken("Bearer invalid")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("random_string")).toBeNull();
  });

  it("returns null for locked user", async () => {
    const lockedId = nanoid();
    const lockedToken = generateToken(lockedId);
    const lockedHash = await hashToken(lockedToken);

    db.insert(somaUsers)
      .values({
        id: lockedId,
        name: "Locked User",
        token: lockedHash,
        role: "user",
        failedAttempts: 10,
        lockedUntil: new Date(Date.now() + 60_000), // locked for 1 min
        tokenExpiresAt: null,
        lastRotatedAt: new Date(),
        createdAt: new Date(),
      })
      .run();

    const result = await verifyToken(lockedToken);
    expect(result).toBeNull();

    // Cleanup
    db.delete(somaUsers).where(eq(somaUsers.id, lockedId)).run();
  });

  it("returns null for expired token", async () => {
    const expiredId = nanoid();
    const expiredToken = generateToken(expiredId);
    const expiredHash = await hashToken(expiredToken);

    db.insert(somaUsers)
      .values({
        id: expiredId,
        name: "Expired User",
        token: expiredHash,
        role: "user",
        failedAttempts: 0,
        lockedUntil: null,
        tokenExpiresAt: new Date(Date.now() - 1000), // expired 1 second ago
        lastRotatedAt: new Date(),
        createdAt: new Date(),
      })
      .run();

    const result = await verifyToken(expiredToken);
    expect(result).toBeNull();

    // Cleanup
    db.delete(somaUsers).where(eq(somaUsers.id, expiredId)).run();
  });
});

describe("resetFailedAttempts", () => {
  it("clears failed attempts and lock", async () => {
    db.update(somaUsers)
      .set({ failedAttempts: 5, lockedUntil: new Date(Date.now() + 60_000) })
      .where(eq(somaUsers.id, testUserId))
      .run();

    resetFailedAttempts(testUserId);

    const user = db
      .select()
      .from(somaUsers)
      .where(eq(somaUsers.id, testUserId))
      .get();
    expect(user?.failedAttempts).toBe(0);
    expect(user?.lockedUntil).toBeNull();
  });
});

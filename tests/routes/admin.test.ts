import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { adminRouter } from "../../src/routes/admin";
import { db } from "../../src/db/index";
import { somaUsers } from "../../src/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_TOKEN = "test-admin-token";

const app = new Hono();
app.route("/api/admin", adminRouter);

const headers = {
  Authorization: `Bearer ${ADMIN_TOKEN}`,
  "Content-Type": "application/json",
};

let createdUserId: string;

beforeAll(async () => {
  process.env.SOMA_ADMIN_TOKEN = ADMIN_TOKEN;
  const { bootstrap } = await import("../../src/bootstrap");
  await bootstrap();
});

afterAll(() => {
  // Clean up any leftover test users
  if (createdUserId) {
    db.delete(somaUsers).where(eq(somaUsers.id, createdUserId)).run();
  }
});

describe("POST /api/admin/users", () => {
  it("creates a user and returns token once", async () => {
    const res = await app.request("/api/admin/users", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Alice" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.userId).toBeDefined();
    expect(body.name).toBe("Alice");
    expect(body.token).toMatch(/^tok_/);
    createdUserId = body.userId;
  });

  it("rejects invalid body", async () => {
    const res = await app.request("/api/admin/users", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("rejects missing admin token", async () => {
    const res = await app.request("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/users", () => {
  it("returns list of users", async () => {
    const res = await app.request("/api/admin/users", { headers });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.users)).toBe(true);
    // token must not be in list response
    const found = body.users.find((u: any) => u.id === createdUserId);
    expect(found).toBeDefined();
    expect(found.token).toBeUndefined();
  });
});

describe("POST /api/admin/users/:id/rotate-token", () => {
  it("rotates token and returns new one", async () => {
    const res = await app.request(
      `/api/admin/users/${createdUserId}/rotate-token`,
      {
        method: "POST",
        headers,
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.token).toMatch(/^tok_/);
    expect(body.userId).toBe(createdUserId);
  });

  it("returns 404 for unknown user", async () => {
    const res = await app.request("/api/admin/users/nonexistent/rotate-token", {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/users/:id", () => {
  it("deletes user", async () => {
    const res = await app.request(`/api/admin/users/${createdUserId}`, {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.deleted).toBe(true);
    createdUserId = ""; // already deleted
  });

  it("returns 404 for unknown user", async () => {
    const res = await app.request("/api/admin/users/nonexistent", {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(404);
  });
});

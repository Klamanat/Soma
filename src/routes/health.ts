import { Hono } from "hono";

export const healthRouter = new Hono();

healthRouter.get("/health", (c) => {
  return c.json({
    ok: true,
    version: "1.0.0",
    ftsEnabled: true,
    vectorMode: "disabled",
  });
});

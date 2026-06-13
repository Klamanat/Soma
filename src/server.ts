import { Hono } from "hono";
import { bootstrap } from "./bootstrap";
import { authMiddleware } from "./auth/middleware";
import { adminRouter } from "./routes/admin";
import { knowledgeRouter } from "./routes/knowledge";
import { healthRouter } from "./routes/health";
import { discoveryRouter } from "./routes/discovery";
import { indexerRouter } from "./routes/indexer";
import { startWatcher } from "./watcher";

await bootstrap();
startWatcher(process.env.SOMA_USER_ID);

const app = new Hono();

// ── Public routes (no auth) ───────────────────────────────────────────────────
app.route("/api", healthRouter);
app.route("/.well-known", discoveryRouter);

// ── Authenticated routes ──────────────────────────────────────────────────────
app.use("/api/search", authMiddleware);
app.use("/api/learn", authMiddleware);
app.use("/api/forget", authMiddleware);
app.use("/api/supersede", authMiddleware);
app.use("/api/reflect", authMiddleware);
app.use("/api/list", authMiddleware);
app.use("/api/stats", authMiddleware);
app.use("/api/indexer/*", authMiddleware);

app.route("/api", knowledgeRouter);
app.route("/api/indexer", indexerRouter);

// ── Admin (own middleware inside router) ──────────────────────────────────────
app.route("/api/admin", adminRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Not found" }, 404));

// ── Start ─────────────────────────────────────────────────────────────────────
// Railway injects PORT env — fall back to SOMA_PORT, then 55000
const port = Number(process.env.PORT ?? process.env.SOMA_PORT ?? 55000);

export default {
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};

console.log(`✓ Soma server listening on http://localhost:${port}`);

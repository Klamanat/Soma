import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";

export const somaUsers = sqliteTable("soma_users", {
  id: text("id").primaryKey(),
  name: text("name"),
  token: text("token").notNull().unique(),
  role: text("role").default("user"),
  failedAttempts: integer("failed_attempts").default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  lastRotatedAt: integer("last_rotated_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const somaDocuments = sqliteTable("soma_documents", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => somaUsers.id),
  sourceFile: text("source_file"),
  title: text("title"),
  content: text("content").notNull(),
  concepts: text("concepts"), // JSON array string
  embedding: blob("embedding"), // Float32Array, null when FTS-only
  embeddingModel: text("embedding_model"),
  embeddingVersion: integer("embedding_version").default(1),
  embeddingStatus: text("embedding_status").default("pending"), // pending|processing|done|failed
  encryptedContent: integer("encrypted_content").default(0), // boolean
  supersededBy: text("superseded_by"),
  deleted: integer("deleted").default(0), // soft delete
  deletedReason: text("deleted_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const somaEdges = sqliteTable("soma_edges", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => somaUsers.id),
  fromId: text("from_id")
    .notNull()
    .references(() => somaDocuments.id),
  toId: text("to_id")
    .notNull()
    .references(() => somaDocuments.id),
  relation: text("relation").notNull(), // supports|contradicts|supersedes|relates|caused
  weight: real("weight").default(1.0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const somaThreads = sqliteTable("soma_threads", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => somaUsers.id),
  title: text("title").notNull(),
  status: text("status").default("open"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const somaMessages = sqliteTable("soma_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => somaThreads.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const somaTraces = sqliteTable("soma_traces", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => somaUsers.id),
  toolName: text("tool_name").notNull(),
  inputHash: text("input_hash"),
  output: text("output"),
  latencyMs: integer("latency_ms"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const somaTokenUsage = sqliteTable("soma_token_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => somaUsers.id),
  toolName: text("tool_name").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cachedTokens: integer("cached_tokens").default(0),
  cacheReadTokens: integer("cache_read_tokens").default(0),
  cacheWriteTokens: integer("cache_write_tokens").default(0),
  estimatedCostUsd: real("estimated_cost_usd"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const somaTasks = sqliteTable("soma_tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => somaUsers.id),
  type: text("type").notNull(), // index|export|import
  status: text("status").notNull(), // queued|processing|done|failed
  progress: integer("progress").default(0),
  error: text("error"),
  result: text("result"), // JSON
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const somaRateLimits = sqliteTable("soma_rate_limits", {
  id: text("id").primaryKey(), // userId:toolName:windowStart
  userId: text("user_id").notNull(),
  toolName: text("tool_name").notNull(),
  windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
  count: integer("count").default(0),
});

export const somaSecurityEvents = sqliteTable("soma_security_events", {
  id: text("id").primaryKey(),
  userId: text("user_id"), // nullable — may not be authed yet
  eventType: text("event_type").notNull(), // injection_attempt|brute_force|path_traversal|cross_user
  ipAddress: text("ip_address"),
  details: text("details"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

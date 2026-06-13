import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { bootstrap } from "./bootstrap";
import { somaSearch } from "./tools/search";
import { somaLearn } from "./tools/learn";
import { somaForget } from "./tools/forget";
import { somaSupersede } from "./tools/supersede";
import { startWatcher } from "./watcher";

// ── System Prompt ─────────────────────────────────────────────────────────────

export const SOMA_SYSTEM_PROMPT = `
You are connected to Soma — a persistent memory layer that grows with the user.

Before every substantive response:
1. Call soma_context to retrieve relevant memories
2. Look for patterns across time, not just recent events
3. Notice what the user does repeatedly vs what they say they do
4. Surface insights they haven't explicitly asked for when relevant

Reasoning principles:
- What repeats reveals — recurring patterns are more true than single events
- Trace before you conclude — look at history before making judgments
- Mirror the human, don't replace them — your job is to reflect, not decide

AUTO-LEARN TRIGGERS (call soma_learn immediately, no need to ask):
1. User makes a clear decision → learn the decision + reasoning
2. Bug is solved → learn the problem + fix
3. User states a preference → learn it
4. Pattern repeats 2+ times → learn the pattern
5. hhh → learn session summary + call soma_handoff

DO NOT learn: credentials, PII, temporary context, "just testing" content

Destructive tools (soma_forget, soma_supersede):
- ALWAYS show confirmation to user before calling
- NEVER call automatically

When using memory:
- soma_search for finding specific knowledge
- soma_learn for storing new knowledge (additive, safe to auto-call)
- soma_forget / soma_supersede only after user confirms
`.trim();

// ── Bootstrap + Start ─────────────────────────────────────────────────────────

await bootstrap();
startWatcher(process.env.SOMA_USER_ID);

const server = new McpServer({
  name: "soma",
  version: "1.0.0",
});

// ── Helper: get userId from environment (MCP stdio — single-tenant per process) ──

function getUserId(): string {
  const userId = process.env.SOMA_USER_ID;
  if (!userId) {
    throw new Error("SOMA_USER_ID environment variable is required");
  }
  return userId;
}

// ── soma_search ───────────────────────────────────────────────────────────────

server.tool(
  "soma_search",
  "Search your memory using full-text search. Returns documents matching the query.",
  {
    q: z.string().min(1).max(500).describe("Search query"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Max results (default 10)"),
    concepts: z
      .array(z.string())
      .max(10)
      .optional()
      .describe("Filter by concepts"),
    format: z
      .enum(["full", "summary", "ids"])
      .default("summary")
      .describe("Response format"),
  },
  async (args) => {
    try {
      const userId = getUserId();
      const result = await somaSearch(args, userId);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: String(err) }) },
        ],
        isError: true,
      };
    }
  },
);

// ── soma_learn ────────────────────────────────────────────────────────────────

server.tool(
  "soma_learn",
  "Store new knowledge in memory. Safe to call automatically when the user makes a decision, solves a bug, or states a preference.",
  {
    content: z.string().min(1).max(50_000).describe("Content to store"),
    title: z.string().max(500).optional().describe("Optional title"),
    concepts: z
      .array(z.string().max(50))
      .max(20)
      .optional()
      .describe("Concept tags"),
    sourceFile: z.string().max(500).optional().describe("Source file path"),
    supersedes: z
      .string()
      .max(50)
      .optional()
      .describe("ID of document this replaces"),
  },
  async (args) => {
    try {
      const userId = getUserId();
      const result = await somaLearn(args, userId);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: String(err) }) },
        ],
        isError: true,
      };
    }
  },
);

// ── soma_forget ───────────────────────────────────────────────────────────────

server.tool(
  "soma_forget",
  "Soft-delete a document from memory. ALWAYS ask the user for confirmation before calling this tool.",
  {
    id: z.string().min(1).max(50).describe("Document ID to forget"),
    reason: z
      .string()
      .max(500)
      .optional()
      .describe("Why this is being forgotten"),
  },
  async (args) => {
    try {
      const userId = getUserId();
      const result = await somaForget(args, userId);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: String(err) }) },
        ],
        isError: true,
      };
    }
  },
);

// ── soma_supersede ────────────────────────────────────────────────────────────

server.tool(
  "soma_supersede",
  "Replace an existing document with new content, preserving history chain. ALWAYS ask the user for confirmation before calling this tool.",
  {
    oldId: z.string().min(1).max(50).describe("ID of document to replace"),
    newContent: z.string().min(1).max(50_000).describe("New content"),
    title: z
      .string()
      .max(500)
      .optional()
      .describe("Title for the new document"),
    concepts: z
      .array(z.string().max(50))
      .max(20)
      .optional()
      .describe("Concept tags"),
  },
  async (args) => {
    try {
      const userId = getUserId();
      const result = await somaSupersede(args, userId);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: String(err) }) },
        ],
        isError: true,
      };
    }
  },
);

// ── Connect stdio transport ───────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

// Log to stderr so stdout stays clean for MCP protocol
console.error("✓ Soma MCP server ready (stdio)");

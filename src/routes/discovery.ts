import { Hono } from "hono";

export const discoveryRouter = new Hono();

// MCP Server Cards — /.well-known/mcp.json
discoveryRouter.get("/mcp.json", (c) => {
  return c.json({
    name: "Soma",
    version: "1.0.0",
    description: "MCP Memory Layer — the AI's external self",
    transport: ["stdio"],
    auth: { type: "bearer" },
    tools: [
      { name: "soma_search", description: "Full-text search over memory" },
      { name: "soma_learn", description: "Store new knowledge" },
      {
        name: "soma_forget",
        description: "Soft-delete a document (requires confirmation)",
      },
      {
        name: "soma_supersede",
        description:
          "Replace a document with new content (requires confirmation)",
      },
    ],
    health: "/api/health",
  });
});

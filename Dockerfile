FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Data directory — override with Railway volume mount at /app/data
ENV SOMA_DATA_DIR=/app/data
ENV SOMA_REPO_ROOT=/app

# Install dependencies (--ignore-scripts to avoid esbuild postinstall conflict)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

# ── Target 1: HTTP server ─────────────────────────────────────────────────────
FROM base AS http-server
# PORT is injected by Railway at runtime — do not hardcode EXPOSE
# SOMA_PORT used as fallback for local dev only
ENV SOMA_PORT=55000
CMD ["bun", "bin/server.ts"]

# ── Target 2: MCP stdio ───────────────────────────────────────────────────────
FROM base AS mcp-stdio
# Log to stderr so stdout stays clean for MCP JSON-RPC protocol
ENV SOMA_LOG_TARGET=stderr
CMD ["bun", "bin/mcp.ts"]

# ── Target 3: Vector sidecar (future LanceDB HTTP) ───────────────────────────
FROM base AS vector-server
ENV SOMA_VECTOR_PORT=55001
EXPOSE 55001
CMD ["bun", "src/vector/engine.ts"]

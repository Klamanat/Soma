# Copilot Instructions — Soma

> Soma — MCP Memory Layer, the AI's external self.
> Persistent memory across sessions, multi-tenant, isolated per token.
> Built with our own identity.

---

## Quick Start — Short Codes

พิมพ์ใน Copilot Chat ได้เลย:

### `iii` — inhale (วางแผน ห้าม code)
รับข้อมูลเข้า วิเคราะห์ วางแผน — เหมือนหายใจเข้า
1. อ่าน instructions + codebase ปัจจุบัน
2. ดู GitHub Issues ล่าสุด
3. สร้าง step-by-step plan
4. ถามก่อน `xxx`

### `xxx` — exhale (ลงมือทำ)
ปล่อยออกมา ลงมือทำ — เหมือนหายใจออก
1. หา plan ล่าสุดจาก `iii`
2. implement ทีละ step + tests
3. commit ตาม format
4. สรุปและบอก step ถัดไป

### `hhh` — hold (บันทึก context ก่อนหยุด)
กลั้นไว้ บันทึกก่อนหยุด — เหมือนกลั้นหายใจ
1. สรุป session (ทำอะไร, ค้างอะไร, ตัดสินใจอะไร)
2. เขียน `ink/handoffs/YYYY-MM-DD-HH.md`
3. เรียก `soma_handoff` บันทึกลง DB

### `rrr` — release (retrospective)
ปล่อยวาง สะท้อนกลับ — เหมือนหายใจออกช้าๆ
1. เขียน `ink/memory/retrospectives/YYYY-MM/DD/HH-slug.md`
2. append Lessons Learned (ไม่ลบของเดิม)
3. commit ทันที

### `ppp` — pulse (status check)
ชีพจร เช็คว่าระบบยังมีชีวิตอยู่
1. `soma_stats` + `soma_list` 5 docs ล่าสุด
2. git status + branch
3. open issues

---

## Project Vision

**"Soma — the self that remembers"**

ระบบความจำที่เติบโตไปพร้อมกับการใช้งาน — ไม่ใช่แค่ search engine
แต่เป็น external brain ที่เข้าใจ pattern การทำงานของแต่ละคน

ความจำเก็บเป็น markdown ใน `ink/` อ่านได้ด้วยตาเปล่า
git track ได้ — ย้ายเครื่องก็ไม่หาย
Multi-tenant: ทีมใช้ร่วมกันได้ ความจำแยกกันสนิท

### Core Philosophy
1. **Soma grows, never resets** — ตัวตนสะสม ไม่เริ่มใหม่จากศูนย์
2. **What repeats reveals** — สิ่งที่เกิดซ้ำคือสิ่งที่แท้จริง
3. **Mirror the human, don't replace them** — สะท้อน ไม่ใช่แทนที่

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Bun >= 1.2** | Fast, built-in SQLite, TypeScript-native |
| Full-text | **SQLite + FTS5** | Zero-dependency, works offline instantly |
| Vector | **LanceDB** | Embedded, no server required |
| ORM | **Drizzle** | Type-safe, schema-first |
| HTTP | **Hono** | Ultra-fast, edge-ready |
| Protocol | **MCP SDK** | Copilot/Claude native |
| Auth | **bcrypt** | Multi-tenant token hashing |
| Testing | **Vitest** + Playwright | Unit + E2E |

---

## Critical Safety Rules

- NEVER `git push --force` / `git clean -f` / `rm -rf`
- NEVER merge PR โดยไม่ได้รับอนุญาต
- NEVER `ALTER TABLE` ตรงใน code — ใช้ `src/db/schema.ts` + `bun db:push`
- NEVER เก็บ token plaintext — bcrypt เสมอ
- userId ต้องมาจาก auth middleware เท่านั้น ห้ามรับจาก client
- ทุก DB query บังคับ `WHERE user_id = ?`

---

## Repository Structure (เอกลักษณ์ของเรา)

ต้นฉบับ (Arra Oracle) ใช้ชื่อ `arra-*` และ `ψ/`
ของเราใช้ชื่อที่สั้นกว่า, `ink/` แทน `ψ/`, และแยก bin ออกมาชัดเจน

```
soma/
│
├── .github/
│   └── copilot-instructions.md     <- ไฟล์นี้
│
├── bin/                             <- entry points สำหรับ bunx
│   ├── server.ts                   <- bunx soma-server
│   └── mcp.ts                      <- bunx soma-mcp
│
├── ink/                             <- vault (หน่วยความจำ markdown)
│   ├── profile.md                  <- ข้อมูล user/project
│   ├── preferences.md              <- สิ่งที่ชอบ/ไม่ชอบ
│   ├── decisions/                  <- การตัดสินใจสำคัญ
│   ├── patterns/                   <- coding/thinking patterns
│   ├── handoffs/                   <- จาก ccc
│   └── memory/
│       └── retrospectives/         <- จาก rrr
│
├── src/
│   ├── bootstrap.ts                <- auto-setup DB + dirs (รันก่อน server)
│   ├── server.ts                   <- HTTP API (Hono) port 55000
│   ├── mcp.ts                      <- MCP stdio server
│   ├── indexer.ts                  <- scan ink/ -> DB
│   │
│   ├── auth/
│   │   ├── middleware.ts           <- Bearer token -> userId
│   │   └── tokens.ts               <- bcrypt helpers
│   │
│   ├── db/
│   │   ├── schema.ts               <- Drizzle schema
│   │   ├── index.ts                <- Bun SQLite singleton
│   │   └── migrate.ts              <- FTS5 + index migration
│   │
│   ├── tools/                      <- MCP tools (1 file = 1 tool)
│   │   ├── search.ts               soma_search
│   │   ├── learn.ts                soma_learn
│   │   ├── reflect.ts              soma_reflect
│   │   ├── list.ts                 soma_list
│   │   ├── stats.ts                soma_stats
│   │   ├── handoff.ts              soma_handoff
│   │   └── threads.ts              soma_thread*
│   │
│   ├── routes/                     <- Hono routes (ต่างจาก tools/)
│   │   ├── search.ts
│   │   ├── knowledge.ts
│   │   ├── health.ts
│   │   ├── admin.ts
│   │   ├── indexer.ts
│   │   ├── vector.ts
│   │   └── traces.ts
│   │
│   ├── vector/
│   │   ├── engine.ts               <- LanceDB wrapper (lazy-init)
│   │   └── embed.ts                <- embedding helper
│   │
│   └── types/
│       └── index.ts                <- shared types
│
├── catalog/
│   └── soma.yaml              <- Docker MCP Toolkit catalog
│
├── cli/
│   └── index.ts                    <- operator CLI
├── vault/
│   └── index.ts                    <- Vault CLI (ink/ sync)
│
├── web/                            <- Astro dashboard (optional)
├── scripts/
│   └── setup.sh                    <- one-liner install script
├── docs/
├── tests/
├── e2e/
├── Dockerfile                      <- multi-target (server/mcp/vector)
├── docker-compose.yml
├── railway.toml
├── .env.example
├── drizzle.config.ts
└── package.json
```

### ความต่างจากต้นฉบับ

| | Arra Oracle | Soma |
|--|-------------|-----------|
| vault folder | `ψ/` (unicode) | `ink/` (ascii) |
| routes folder | `src/server/` | `src/routes/` |
| auth folder | `src/middleware/` | `src/auth/` |
| MCP entry | `src/index.ts` | `src/mcp.ts` |
| bootstrap | inline in server | `src/bootstrap.ts` แยกชัดเจน |
| bin names | `arra-oracle`, `arra-cli` | `soma-server`, `soma-mcp` |

---

## package.json (bin + scripts)

```json
{
  "name": "soma",
  "version": "1.0.0",
  "type": "module",
  "main": "src/mcp.ts",
  "bin": {
    "soma-server": "./bin/server.ts",
    "soma-mcp":    "./bin/mcp.ts"
  },
  "scripts": {
    "dev":           "bun --watch src/mcp.ts",
    "server":        "bun src/server.ts",
    "mcp":           "bun src/mcp.ts",
    "cli":           "bun cli/index.ts",
    "bootstrap":     "bun src/bootstrap.ts",
    "test":          "vitest run",
    "test:unit":     "vitest run tests/",
    "test:e2e":      "playwright test",
    "test:coverage": "vitest run --coverage",
    "db:push":       "drizzle-kit push",
    "db:generate":   "drizzle-kit generate",
    "db:migrate":    "drizzle-kit migrate",
    "db:studio":     "drizzle-kit studio",
    "setup":         "./scripts/setup.sh"
  }
}
```

### bunx setup (ง่ายเหมือนต้นฉบับ)

```bash
# HTTP server — ไม่ต้อง clone
bunx --bun --package github:<you>/soma soma-server

# MCP สำหรับ Copilot/Claude
bunx --bun --package github:<you>/soma soma-mcp
```

### .vscode/mcp.json
```json
{
  "servers": {
    "soma": {
      "type": "stdio",
      "command": "bunx",
      "args": ["--bun", "--package", "github:<you>/soma", "soma-mcp"],
      "env": {
        "SOMA_API": "https://soma.up.railway.app",
        "SOMA_TOKEN": "<token>"
      }
    }
  }
}
```

---

## Auto-Bootstrap (src/bootstrap.ts)

รันอัตโนมัติทุกครั้งที่ server/mcp start — ไม่ต้องรัน `bun db:push` เอง

```typescript
// src/bootstrap.ts
// 1. สร้าง SOMA_DATA_DIR ถ้าไม่มี
// 2. สร้าง soma.db ถ้าไม่มี
// 3. สร้าง tables ทุกตัวถ้าไม่มี (Drizzle push programmatic)
// 4. สร้าง FTS5 virtual table ถ้าไม่มี (IF NOT EXISTS)
// 5. สร้าง ink/ directories ถ้าไม่มี
// 6. log: "Soma awakened" พร้อม version + data dir

// import และเรียกใน src/server.ts และ src/mcp.ts:
// import { bootstrap } from "./bootstrap"
// await bootstrap()
```

---

## Multi-Tenant Design

```
1 deployment -> 1 soma.db -> N users
แต่ละ user มี token -> ความจำแยกกันด้วย userId

Admin: POST /api/admin/users { name: "Alice" }
     -> { userId: "usr_abc", token: "tok_xyz" }  <- แสดงครั้งเดียว
     -> bcrypt hash เก็บใน DB

Alice: SOMA_TOKEN=tok_xyz ใน mcp.json
Server: hash -> lookup -> inject userId ทุก query
```

### Admin endpoints (SOMA_ADMIN_TOKEN required)
```
POST   /api/admin/users
GET    /api/admin/users
DELETE /api/admin/users/:id
POST   /api/admin/users/:id/rotate-token
```

---

## Database Schema

```typescript
// soma_users
export const somaUsers = sqliteTable("soma_users", {
  id: text("id").primaryKey(),             // nanoid
  name: text("name"),
  token: text("token").notNull().unique(), // bcrypt hash
  role: text("role").default("user"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// soma_documents — core memory
export const somaDocuments = sqliteTable("soma_documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => somaUsers.id),
  sourceFile: text("source_file"),
  title: text("title"),
  content: text("content").notNull(),
  concepts: text("concepts"),              // JSON array
  embedding: blob("embedding"),            // Float32Array
  supersededBy: text("superseded_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// soma_threads, soma_messages, soma_traces
// ทุกตารางยกเว้น soma_messages ต้องมี userId
```

FTS5 virtual table สร้างใน `src/db/migrate.ts` ด้วย `CREATE VIRTUAL TABLE IF NOT EXISTS`
ไม่ใช้ Drizzle schema สำหรับ FTS5

---

## MCP Tools

userId inject จาก `src/auth/middleware.ts` เท่านั้น — ห้ามรับจาก tool input

### Memory Tools (core)

| Tool | Input | Output | ดีกว่าต้นฉบับ |
|------|-------|--------|--------------|
| `soma_search` | `{ q, mode?, limit?, concepts? }` | `Array<{ id, title, content, score, concepts }>` | filter by concepts ได้ |
| `soma_learn` | `{ content, title?, concepts?, sourceFile?, supersedes? }` | `{ id, created: true, embedded: boolean }` | รู้ว่า embed สำเร็จไหม |
| `soma_reflect` | `{ concepts?, exclude?: string[] }` | `{ id, title, content, age }` | exclude ids + แสดง age |
| `soma_list` | `{ limit?, offset?, concept?, sortBy?: 'date'|'relevance' }` | `Array<{ id, title, concepts, createdAt }>` | sort options |
| `soma_forget` | `{ id, reason? }` | `{ id, forgotten: true }` | soft delete + reason log (ต้นฉบับไม่มี) |
| `soma_supersede` | `{ oldId, newContent, title? }` | `{ oldId, newId, chain }` | replace + track chain |

### Context Tools

| Tool | Input | Output | ดีกว่าต้นฉบับ |
|------|-------|--------|--------------|
| `soma_handoff` | `{ summary, nextTask?, mood?, blockers? }` | `{ id, saved: true }` | mood + blockers field |
| `soma_context` | `{ topic?, limit? }` | `{ recent: [], related: [], handoff?: {} }` | รวม recent + related ในครั้งเดียว (ต้นฉบับไม่มี) |
| `soma_thread` | `{ action, title?, message?, id?, status? }` | depends | เหมือนต้นฉบับ |

### Insight Tools

| Tool | Input | Output | ดีกว่าต้นฉบับ |
|------|-------|--------|--------------|
| `soma_stats` | `{}` | `{ totalDocs, vectorMode, ftsEnabled, topConcepts[], recentActivity }` | topConcepts + activity |
| `soma_concepts` | `{ limit? }` | `Array<{ name, count, lastUsed }>` | แสดง count + lastUsed |
| `soma_timeline` | `{ days?, concept? }` | `Array<{ date, count, concepts[] }>` | ดู pattern การบันทึก (ต้นฉบับไม่มี) |
| `soma_similar` | `{ id, limit? }` | `Array<{ id, title, score }>` | หา docs ที่คล้ายกัน |

### Trace Tools

| Tool | Input | Output |
|------|-------|--------|
| `soma_trace` | `{ action, toolName, input?, output? }` | `{ id }` |
| `soma_traces` | `{ limit?, toolName? }` | `Array<trace>` |

search mode: `fts` | `vector` | `hybrid`
degrade to fts ถ้า vector ไม่พร้อม — ไม่ error ไม่ crash

---

## HTTP API (port 55000)

```
GET  /api/health              <- no auth
GET  /api/search?q=&mode=     <- userId scoped
POST /api/learn               <- userId scoped
GET  /api/reflect             <- userId scoped
GET  /api/list                <- userId scoped
GET  /api/stats               <- userId scoped
POST /api/thread              <- userId scoped
GET  /api/threads             <- userId scoped
GET  /api/traces              <- userId scoped
POST /api/indexer/scan
POST /api/indexer/reindex
GET  /api/vector/config
POST /api/vector/index/start
POST /api/admin/users         <- SOMA_ADMIN_TOKEN
```

---

## Vector (src/vector/engine.ts)

```typescript
// Lazy-init: connect เมื่อถูกเรียกครั้งแรก
// ถ้า init fail -> vectorMode = "disabled" ไม่ crash
// filter userId ใน LanceDB metadata ทุก query
// getVectorMode() -> "embedded" | "proxied" | "disabled"
```

---

## Docker (multi-target)

```dockerfile
FROM oven/bun:1.2-alpine AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

# Target 1: HTTP server
FROM base AS http-server
EXPOSE 55000
CMD ["bun", "src/server.ts"]

# Target 2: MCP stdio
FROM base AS mcp-stdio
ENV SOMA_LOG_TARGET=stderr
CMD ["bun", "src/mcp.ts"]

# Target 3: Vector sidecar
FROM base AS vector-server
EXPOSE 55001
CMD ["bun", "src/vector/server.ts"]
```

### railway.toml
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"
target = "http-server"

[deploy]
startCommand = "bun src/server.ts"
healthcheckPath = "/api/health"

[[volumes]]
mountPath = "/app/data"
```

### catalog/soma.yaml (Docker MCP Toolkit)
```yaml
tools:
  - name: soma
    description: Soma MCP Memory Layer
    image: ghcr.io/<you>/soma:mcp
    env:
      - name: SOMA_API
        value: "http://host.docker.internal:55000"
      - name: SOMA_TOKEN
        description: "User token from admin"
```

---

## Cloud Setup (Railway)

```bash
# 1. push GitHub
git push origin main

# 2. Railway: New Project -> GitHub -> soma
#    Add Volume /app/data
#    Set SOMA_ADMIN_TOKEN env
#    Deploy -> ได้ URL

# 3. สร้าง user token
curl -X POST https://soma.up.railway.app/api/admin/users   -H "Authorization: Bearer $SOMA_ADMIN_TOKEN"   -d "{"name": "Alice"}"
# -> { userId, token }  <- เก็บไว้ ใส่ใน mcp.json

# 4. ทดสอบ
curl https://soma.up.railway.app/api/health
```

---

## Dashboard (web/)

ดีกว่าต้นฉบับตรงที่: ออกแบบมาสำหรับ multi-tenant + insight-first

### Tech Stack
```
Astro + React islands  <- เร็วกว่า React SPA, SEO ได้
Tailwind CSS
Recharts               <- charts
D3.js                  <- knowledge graph
```

### Pages

| Path | คำอธิบาย | ดีกว่าต้นฉบับ |
|------|----------|--------------|
| `/` | Dashboard หลัก | activity feed + top concepts + quick search |
| `/search` | Search UI | FTS + vector toggle, highlight matches |
| `/timeline` | ดู pattern การบันทึก | heat calendar (GitHub-style) ต้นฉบับไม่มี |
| `/graph` | Knowledge graph 2D | node = concept, edge = co-occurrence |
| `/graph/3d` | Knowledge graph 3D | D3 force-directed, zoom/rotate |
| `/ink` | Browse ink/ files | markdown renderer + edit inline |
| `/traces` | AI audit log | filter by tool, userId, date |
| `/connect` | ตั้งค่า MCP connection | generate token + copy mcp.json snippet |
| `/admin` | User management | สร้าง/ลบ user, rotate token (SOMA_ADMIN_TOKEN) |

### `/timeline` — ไม่มีในต้นฉบับ

```
แสดง heat map calendar ว่าวันไหนบันทึกมากน้อยแค่ไหน
กด cell → ดู documents ที่บันทึกวันนั้น
filter by concept → เห็น pattern ว่า learn เรื่องไหนช่วงไหน

ประโยชน์: เห็น working pattern ของตัวเอง
          รู้ว่าช่วงไหน productive, ช่วงไหนหยุด
```

### `/admin` — ไม่มีในต้นฉบับ (ต้องใช้ curl)

```
UI สำหรับ admin:
- สร้าง user → copy token ได้เลย
- rotate token → QR code สำหรับ scan
- ดู usage ของแต่ละ user (doc count, last active)
- ลบ user + ลบ data ทั้งหมด
```

### `/connect` — ดีกว่าต้นฉบับ

```
ต้นฉบับ: แค่แสดง snippet
Soma:    - ทดสอบ connection ได้เลยใน browser
         - generate token ใหม่ได้
         - copy mcp.json / settings.json snippet
         - QR code สำหรับส่งให้ teammate scan
```

### Environment
```bash
# web/.env
PUBLIC_SOMA_API=https://soma.up.railway.app
# override at runtime: http://localhost:4321/?api=http://localhost:55000
```

---

## Progressive Onboarding

```
Stage 0  bunx soma-server  (หรือ bun src/server.ts)
         bootstrap รันเอง -> soma.db พร้อม
         curl /api/health -> ok: true

Stage 1  POST /api/admin/users -> ได้ token
         ใส่ mcp.json -> Copilot: "ppp" -> soma_stats ตอบ

Stage 2  POST /api/indexer/reindex
         ink/ เข้า DB ค้นหาได้

Stage 3  POST /api/vector/index/start
         vectorMode: "embedded"
```

---

## Environment Variables

```bash
SOMA_PORT=55000
SOMA_DATA_DIR=./data
SOMA_REPO_ROOT=.
SOMA_ADMIN_TOKEN=           # required
SOMA_EMBED_URL=      # optional
SOMA_LOG_TARGET=     # "stderr" สำหรับ mcp-stdio docker target
SOMA_ENABLED_TOOLS=  # optional
SOMA_DISABLED_TOOLS= # optional
```

---

## Code Style

- TypeScript strict mode
- No `any` — `unknown` + type guards
- Zod ทุก input validation
- Async/await เท่านั้น
- HTTP error: `{ error: string }` + status
- MCP: `{ content: [{ type: "text", text: JSON.stringify(result) }] }`

### Git Commit Format
```
[type]: description

- What: สิ่งที่เปลี่ยน
- Why: เหตุผล
- Impact: ผลกระทบ

Closes #N
```
types: `feat` `fix` `docs` `refactor` `test` `chore`

---

## Scaffold Order

```
Step 1   package.json + tsconfig.json + drizzle.config.ts
Step 2   src/db/schema.ts (soma_users + all tables)
Step 3   src/db/index.ts + src/db/migrate.ts (FTS5)
Step 4   src/bootstrap.ts (auto-setup)
Step 5   src/auth/middleware.ts + src/auth/tokens.ts
Step 6   src/routes/admin.ts (user CRUD)
Step 7   src/tools/ (search->learn->reflect->list->forget->supersede
                     ->context->stats->concepts->timeline->similar
                     ->handoff->thread->trace)
Step 8   src/mcp.ts (MCP server wiring)
Step 9   src/server.ts + src/routes/
Step 10  src/vector/engine.ts (lazy-init, userId-scoped)
Step 11  src/indexer.ts (scan ink/)
Step 12  vault/index.ts (soma-vault CLI: init/sync/pull/reindex/export/import)
Step 13  web/ (Astro dashboard: search/timeline/graph/ink/traces/connect/admin)
Step 14  bin/server.ts + bin/mcp.ts + bin/vault.ts
Step 15  Dockerfile (multi-target) + railway.toml
Step 16  catalog/soma.yaml
Step 17  scripts/setup.sh
Step 18  tests/
Step 19  docs/ + ink/profile.md
```

เริ่มด้วย: `iii` แล้ว `xxx`

---

## Prompt Caching

ลด input token cost ได้ ~50% สำหรับ heavy coding sessions
System prompt + tool schemas เหมือนกันทุก request → cache ได้ทั้งหมด

---

### สิ่งที่ Cache ได้

```
SOMA_SYSTEM_PROMPT       ~500 tokens   ← เหมือนทุก request
Tool schemas (14 tools)  ~2,800 tokens ← เหมือนทุก request
─────────────────────────────────────
Cacheable prefix         ~3,300 tokens ← ประหยัดได้ทุก query
```

### Anthropic Prompt Caching (src/mcp.ts)

```typescript
// ใช้เมื่อ model = claude-* เท่านั้น
// DeepSeek และ model อื่นใช้ไม่ได้

import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

// สร้าง cached prefix ครั้งเดียวต่อ process
const CACHED_PREFIX = [
  {
    type: "text" as const,
    text: SOMA_SYSTEM_PROMPT,
    cache_control: { type: "ephemeral" as const }
  },
  {
    type: "text" as const,
    text: JSON.stringify(toolSchemas),
    cache_control: { type: "ephemeral" as const }
  }
]

// ใช้ใน every request
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: CACHED_PREFIX,
  messages: conversation
})

// cached_tokens จาก response.usage
const { input_tokens, output_tokens, cache_read_input_tokens } = response.usage
// cache_read_input_tokens → tokens ที่อ่านจาก cache (ถูกกว่า)
```

### HTTP Transport Caching (src/transport/http.ts)

```typescript
// tools/list response cache ตาม MCP spec 2026
// ไม่ต้อง fetch tool schema ทุก request

let cachedToolList: Tool[] | null = null
let toolListCachedAt = 0
const TOOL_LIST_TTL = 60_000  // 1 นาที

app.get("/mcp/tools", async (c) => {
  const now = Date.now()
  if (cachedToolList && (now - toolListCachedAt) < TOOL_LIST_TTL) {
    return c.json({
      tools: cachedToolList,
      ttlMs: TOOL_LIST_TTL - (now - toolListCachedAt)
    })
  }
  cachedToolList = buildToolList()
  toolListCachedAt = now
  return c.json({ tools: cachedToolList, ttlMs: TOOL_LIST_TTL })
})
```

### Conversation Context Caching

```typescript
// ถ้า conversation ยาว → cache ส่วนที่ไม่เปลี่ยน
// เฉพาะ claude-sonnet-4-6 ขึ้นไป

// หลักการ: cache ได้ถ้า prefix >= 1,024 tokens
// conversation ยาว = prefix เยอะ = cache ได้มาก

const messages = [
  ...longConversationHistory.map((m, i) =>
    i < longConversationHistory.length - 3
      ? { ...m, cache_control: { type: "ephemeral" } }  // cache เก่า
      : m  // 3 messages ล่าสุดไม่ cache
  ),
  { role: "user", content: currentMessage }
]
```

### Token Tracking เพิ่ม Cache Metrics

```typescript
// soma_token_usage เพิ่ม column
cacheReadTokens: integer("cache_read_tokens").default(0),
cacheWriteTokens: integer("cache_write_tokens").default(0),

// /api/tokens response เพิ่ม
{
  thisMonth: {
    tokens: 6_200_000,
    cachedTokens: 3_100_000,   // 50% จาก cache
    cacheSavingsUsd: "$2.48",  // เงินที่ประหยัดได้
    costUsd: "$3.20"           // จ่ายจริง
  }
}
```

### Auto-degrade เมื่อ Budget ต่ำ

```typescript
// src/tools/budget.ts เพิ่ม budget guard

const BUDGET_THRESHOLDS = {
  warning: 0.80,   // 80% ของ monthly budget → warn
  critical: 0.90,  // 90% → auto-switch format=ids
  exhausted: 1.00, // 100% → return cached/minimal only
}

export function getBudgetMode(usedPct: number): "normal" | "economy" | "minimal" {
  if (usedPct >= BUDGET_THRESHOLDS.critical) return "minimal"
  if (usedPct >= BUDGET_THRESHOLDS.warning) return "economy"
  return "normal"
}

// ปรับ format อัตโนมัติตาม budget mode
const format = budgetMode === "minimal" ? "ids"
             : budgetMode === "economy" ? "summary"
             : userRequestedFormat ?? "summary"
```

### ผลลัพธ์หลัง Caching

```
Heavy coder 1,000 queries/เดือน:

ก่อน caching:
  input:  5.8M tokens × $0.80 = $4.64
  output: 400K tokens × $3.20 = $1.28
  total:  $5.92

หลัง caching (50% cache hit):
  input (non-cached): 2.9M × $0.80 = $2.32
  cache reads:        2.9M × $0.08 = $0.23  ← 90% ถูกกว่า
  output:             400K × $3.20 = $1.28
  total:  $3.83  (-35% จากก่อน)

รวมกับ token efficiency (-90%):
  total: ~$2.10/เดือน สำหรับ heavy coder
  $10 Pro plan เหลือ budget อีกมาก
```

### Scaffold Steps เพิ่ม

```
Step 51  prompt caching ใน src/mcp.ts (Claude models)
Step 52  tools/list cache ใน src/transport/http.ts
Step 53  conversation prefix cache
Step 54  cache metrics ใน soma_token_usage
Step 55  auto-degrade budget mode ใน src/tools/budget.ts
```

---

## Token Tracking & Cost Awareness

ตั้งแต่ 1 มิ.ย. 2026 Copilot เปลี่ยนเป็น usage-based billing
token efficiency ไม่ใช่แค่ performance — แต่คือ cost control โดยตรง

---

### อัตราค่าใช้จ่าย (Copilot 2026)

```
$0.80  per 1M input tokens
$3.20  per 1M output tokens
$10/เดือน = 1,000 credits = ~1.25M input tokens

code completion ฟรี ไม่นับ credits
MCP tool calls นับ credits ทุกครั้ง
```

---

### Token Budget ต่อ Tool (บังคับใน src/tools/budget.ts)

```typescript
export const TOKEN_BUDGET: Record<string, number> = {
  soma_search:   1000,  // ~10 summaries หรือ 2 full docs
  soma_context:   800,  // recent + related รวมกัน
  soma_digest:    500,  // structured insight
  soma_graph:     600,  // nodes + edges
  soma_reflect:   200,  // 1 doc
  soma_get:       300,  // 1 full doc
  soma_list:      400,  // paginated list
  soma_stats:     150,  // stats only
}

// ถ้า response เกิน budget:
// → truncate content
// → เพิ่ม flag: { truncated: true, fullAvailableVia: "soma_get" }
```

---

### Token Tracking Schema

```typescript
// soma_token_usage — บันทึก token ต่อ query
export const somaTokenUsage = sqliteTable("soma_token_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => somaUsers.id),
  toolName: text("tool_name").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cachedTokens: integer("cached_tokens").default(0),
  estimatedCostUsd: real("estimated_cost_usd"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

// คำนวณ cost
const INPUT_RATE  = 0.80 / 1_000_000   // $0.80 per 1M
const OUTPUT_RATE = 3.20 / 1_000_000   // $3.20 per 1M
const cost = (input * INPUT_RATE) + (output * OUTPUT_RATE)
```

---

### soma_stats — เพิ่ม token metrics

```typescript
// Output เพิ่ม tokenUsage field
{
  totalDocs: number,
  vectorMode: string,
  ftsEnabled: boolean,
  topConcepts: Array<{ name, count }>,
  recentActivity: number,
  // เพิ่ม:
  tokenUsage: {
    today: number,
    thisMonth: number,
    avgPerQuery: number,
    estimatedCostUsd: string,    // "$0.15"
    budgetWarning: boolean,       // true ถ้า > 80% ของ budget
  }
}
```

---

### /api/health — เพิ่ม token warning

```typescript
{
  ok: true,
  ftsEnabled: true,
  vectorMode: "embedded",
  // เพิ่ม:
  tokenBudgetWarning: boolean,   // true ถ้า usage สูงผิดปกติ
  avgTokensPerQuery: number,
}
```

---

### Copilot ต้องรู้ — วิธีเลือก format ให้ประหยัด

```
everyday query     → soma_search format=summary  (~250 tokens)
ต้องการ insight    → soma_digest depth=surface   (~300 tokens)
ต้องการลึก        → soma_digest depth=deep       (~400 tokens)
ต้องการ full doc   → soma_get({ id })            (~200 tokens)
ต้องการ cluster    → soma_graph({ id, depth:1 }) (~200 tokens)
context ก่อนตอบ   → soma_context                 (~400 tokens)

ห้ามใช้ format=full ถ้าไม่จำเป็น
ห้าม dump ทุกอย่างเข้า context
เลือก format ที่ตอบได้ด้วย token น้อยที่สุด
```

---

### ประมาณการค่าใช้จ่ายจริง

```
ไม่มี token efficiency:
20 sessions/เดือน × 100,000 tokens = 2M tokens
≈ $3.20/เดือน (เกิน $10 plan เร็ว)

มี Soma token efficiency:
20 sessions/เดือน × 10,000 tokens = 200K tokens
≈ $0.32/เดือน (ใช้ $10 plan ได้สบายตลอดเดือน)

ประหยัด 90%
```

---

### Scaffold Steps เพิ่ม

```
Step 46  soma_token_usage table
Step 47  src/tools/budget.ts (token budget enforcement)
Step 48  soma_stats เพิ่ม tokenUsage field
Step 49  /api/health เพิ่ม tokenBudgetWarning
Step 50  /api/tokens endpoint (usage history per user)
```

---

### /api/tokens (endpoint ใหม่)

```
GET /api/tokens
→ token usage ของ user ปัจจุบัน

{
  today: { queries: 45, tokens: 8500, costUsd: "0.007" },
  thisMonth: { queries: 820, tokens: 187000, costUsd: "0.15" },
  byTool: [
    { tool: "soma_search", tokens: 45000, pct: 24 },
    { tool: "soma_context", tokens: 38000, pct: 20 },
    ...
  ],
  budgetWarning: false
}
```

---

## Knowledge Graph & Token Efficiency

---

### Knowledge Graph — soma_edges

ปัจจุบัน docs อยู่แบบ flat ไม่รู้ว่าเชื่อมกันยังไง
soma_edges เพิ่ม relationship layer ทำให้ search traversal ได้

#### Schema

```typescript
// soma_edges — เชื่อมโยง docs
export const somaEdges = sqliteTable("soma_edges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => somaUsers.id),
  fromId: text("from_id").notNull().references(() => somaDocuments.id),
  toId: text("to_id").notNull().references(() => somaDocuments.id),
  relation: text("relation").notNull(),
  // "supports"     ← doc นี้สนับสนุน doc นั้น
  // "contradicts"  ← ขัดแย้งกัน
  // "supersedes"   ← แทนที่
  // "relates"      ← เกี่ยวข้องทั่วไป
  // "caused"       ← ก่อให้เกิด
  weight: real("weight").default(1.0),  // ความแน่นของความสัมพันธ์
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})
```

#### Tools ที่เพิ่ม

```typescript
// soma_link — เชื่อม docs สองตัว
// Input:  { fromId, toId, relation, weight? }
// Output: { id, linked: true }
// Auto-link: soma_learn จะ auto-detect relation
//   ถ้า content mention doc อื่น → สร้าง edge อัตโนมัติ

// soma_graph — ดึง subgraph รอบ doc
// Input:  { id, depth?: 1|2|3 }
// Output: { nodes: Doc[], edges: Edge[] }
// depth=1 → เชื่อมตรง
// depth=2 → เชื่อมผ่านกลาง
// depth=3 → cluster ทั้งหมด

// soma_search upgrade — traverse edges หลัง search
// หลัง FTS/vector search ได้ docs
// → traverse edges depth=1
// → เพิ่ม related docs เข้า results
// → score = original_score * edge_weight
```

#### ผลที่ได้

```
ก่อน (flat):
soma_search "database" → doc_001 "ชอบ Drizzle"

หลัง (graph traverse):
soma_search "database" → doc_001 "ชอบ Drizzle"
  → edge "supports"    → doc_003 "schema-first approach"
  → edge "contradicts" → doc_002 "ไม่ชอบ Prisma เพราะ magic"
  → edge "caused"      → doc_007 "เลือก Drizzle วันที่ 12 มิ.ย."

Copilot เห็น cluster ทั้งหมด ไม่ใช่แค่ doc เดี่ยว
```

---

### Token Efficiency

#### 3 Response Formats

```typescript
// soma_search รองรับ format field
// default: "summary" — ใช้ token น้อยที่สุดที่ยังมีประโยชน์

format: "full"     // title + content ทั้งหมด   ~500 tokens/doc
format: "summary"  // title + concepts + 2 บรรทัด ~50 tokens/doc
format: "ids"      // id list เท่านั้น            ~5 tokens/doc

// ถ้า Copilot ต้องการ full content ของ doc ที่เลือก:
// soma_get({ id }) → ดึง full content doc เดียว
```

#### Lazy Loading Pattern

```
แทนที่จะโหลดทุกอย่างตอน search:

Step 1: soma_search format=summary → summaries (น้อย token)
Step 2: Copilot เลือก docs ที่ relevant
Step 3: soma_get({ id }) → full content เฉพาะที่ต้องการ

ลด token ได้ 80-90% สำหรับ everyday queries
```

#### Token Budget per Tool

```typescript
// src/tools/budget.ts
// จำกัด tokens ต่อ response อัตโนมัติ

const TOKEN_BUDGET: Record<string, number> = {
  soma_search:  1000,  // ~10 summaries หรือ 2 full docs
  soma_context:  800,  // recent + related รวมกัน
  soma_digest:   500,  // structured insight
  soma_reflect:  200,  // 1 doc
  soma_graph:    600,  // nodes + edges ที่สำคัญ
}

// ถ้า response เกิน budget:
// → truncate content ของแต่ละ doc
// → เพิ่ม flag: { truncated: true, fullAvailableVia: "soma_get" }
// Copilot รู้ว่ามีข้อมูลเพิ่มถ้าต้องการ
```

#### soma_digest — ย่อ 10x ก่อนส่ง

```
แทนที่ส่ง 10 docs (5,000 tokens):
soma_digest depth=surface → 300-500 tokens
ข้อมูลสำคัญครบ ใช้ token น้อยกว่า 10x
```

#### Copilot ต้องเลือก format ให้เหมาะสม

```
everyday query   → soma_search format=summary (default)
ต้องการ insight  → soma_digest depth=surface
ต้องการลึก      → soma_digest depth=deep
ต้องการ doc เต็ม → soma_get({ id })
ต้องการ cluster  → soma_graph({ id, depth: 1 })

ห้าม dump ทุกอย่างเข้า context
เลือก format ที่ตอบคำถามได้ด้วย token น้อยที่สุด
```

#### ผลลัพธ์เปรียบเทียบ

```
Before (ไม่มี format control):
soma_search "auth" → 5 docs × 500 tokens = 2,500 tokens

After summary + lazy:
soma_search format=summary → 250 tokens
soma_get 2 docs ที่ relevant = 400 tokens
รวม: 650 tokens  (-74%)

After digest:
soma_digest "auth" depth=surface = 300 tokens
รวม: 300 tokens  (-88%)

After graph traverse + summary:
soma_search → cluster 8 docs → summaries = 400 tokens
ได้ข้อมูลมากกว่าเดิม แต่ใช้ token น้อยกว่า
```

---

### Scaffold Steps เพิ่ม

```
Step 39  soma_edges table + soma_link tool
Step 40  soma_graph tool (subgraph traversal)
Step 41  soma_search upgrade (graph traverse หลัง search)
Step 42  soma_search format field (full/summary/ids)
Step 43  soma_get tool (single doc fetch)
Step 44  src/tools/budget.ts (token budget enforcement)
Step 45  soma_digest depth levels (surface/deep/pattern)
```

---

## Deep Synthesis Layer (DeepSeek / non-Claude models)

เพิ่มเพื่อให้ DeepSeek และ model อื่นๆ สามารถ synthesize ความจำได้ลึกเทียบเท่า Claude
ปัญหาไม่ได้อยู่ที่ data — อยู่ที่วิธีส่ง context ให้ model

---

### soma_digest — Pre-digest Tool (เพิ่มใหม่)

แทนที่จะส่ง raw docs ให้ model ย่อยเอง Soma ย่อยก่อนแล้วส่ง structured insight

```typescript
// src/tools/digest.ts
// Input: { topic: string, depth?: 'surface' | 'deep' | 'pattern' }
// Output: {
//   summary: string,          ← สรุปใจความจาก docs ที่เกี่ยวข้อง
//   patterns: string[],       ← patterns ที่พบซ้ำข้ามเวลา
//   contradictions: string[], ← จุดที่ขัดแย้งกันระหว่าง docs
//   evolution: string,        ← ความคิดวิวัฒน์จาก doc แรกถึงล่าสุด
//   gaps: string[]            ← สิ่งที่ยังไม่รู้ / ยังไม่ได้บันทึก
// }
//
// depth levels:
//   surface  → summary + patterns (เร็ว)
//   deep     → ทั้งหมด (ช้าขึ้นนิดนึง)
//   pattern  → patterns + contradictions + evolution (ไม่มี summary)
//
// userId inject จาก middleware เสมอ
```

---

### Soma System Prompt (ใส่ใน MCP server)

```typescript
// src/mcp.ts — ส่งเป็น system prompt ให้ทุก model ที่ต่อกับ Soma

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

When using memory:
- soma_digest for deep synthesis before complex answers
- soma_context for quick context before everyday answers
- soma_similar to find unexpected connections
- soma_timeline when patterns over time matter
`.trim()
```

---

### Chain of Thought Scaffold (ใน soma_context response)

เพิ่ม thinking scaffold เข้าไปใน response ของ soma_context
บังคับให้ model คิด layered ก่อนตอบ

```typescript
// src/tools/context.ts — เพิ่ม scaffold field

return {
  recent: [...],
  related: [...],
  handoff: {...},
  scaffold: `
Before answering, work through:
1. What pattern do these memories share?
2. What has changed in the user's thinking over time?
3. What would surprise the user about their own history?
4. What is NOT in the memory that probably should be?
  `.trim()
}
```

---

### Two-Pass Architecture (สำหรับ agent layer)

สำหรับคำถามที่ต้องการ insight ลึกมาก — ใช้ 2 รอบ

```typescript
// agent/deep.ts (optional — implement เมื่อต้องการ)

async function deepAnswer(question: string, userId: string) {
  // Pass 1 — Flash: gather context กว้างๆ ไว (ถูก)
  const digest = await somaClient.callTool("soma_digest", {
    topic: question,
    depth: "deep"
  })

  // Pass 2 — Pro Think-High: synthesize (ลึก)
  const answer = await deepseek.chat({
    model: "deepseek-v4-pro",
    thinking: "high",          // Think-High mode
    messages: [
      { role: "system", content: SOMA_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Memory digest:
${JSON.stringify(digest)}

Question: ${question}`
      }
    ]
  })

  return answer
}

// เมื่อไหรใช้ two-pass:
// - คำถามเกี่ยวกับ patterns ("ฉันมีปัญหาอะไรบ่อย?")
// - คำถามเกี่ยวกับ evolution ("ความคิดฉันเปลี่ยนยังไง?")
// - คำถามที่ต้องการ honest reflection ("ฉันควรทำอะไรต่าง?")
// ไม่ต้องใช้สำหรับ everyday queries → ใช้ Flash ปกติ
```

---

### ผลลัพธ์ที่ต่างกัน

```
ก่อน (raw docs):
"จาก documents พบว่าคุณมีปัญหาเรื่อง TypeScript errors
 และ database schema หลายครั้ง"

หลัง (soma_digest + Think-High + scaffold):
"pattern ที่ซ่อนอยู่คือคุณ rush ช่วง planning —
 TypeScript errors และ schema issues เกิดในสัปดาห์เดียวกัน
 ทุกครั้งที่เริ่ม feature ใหม่โดยไม่ทำ iii ก่อน
 ช่วง 3 เดือนล่าสุดเกิด 4 ครั้ง ทุกครั้งก่อน deadline"
```

---

### Scaffold Step เพิ่มเติม

```
Step 20+  src/tools/digest.ts          (soma_digest tool)
          src/mcp.ts → SOMA_SYSTEM_PROMPT
          src/tools/context.ts → เพิ่ม scaffold field
          agent/deep.ts                (two-pass, optional)
```

---

## Production Hardening

สิ่งที่ต้องทำให้ Soma แกร่งพอสำหรับ production จริงๆ
อิงจาก MCP spec RC 2026-07-28 และ production best practices

---

### 1. Stateless HTTP Transport 🔴

ปัจจุบัน Soma ใช้ stdio เท่านั้น — ไม่สามารถ scale horizontal ได้
ต้องเพิ่ม Streamable HTTP transport ตาม MCP spec ใหม่

```
src/transport/
├── stdio.ts      ← มีอยู่แล้ว (ใช้กับ Copilot local)
└── http.ts       ← เพิ่มใหม่ (ใช้สำหรับ cloud + scale)
```

```typescript
// src/transport/http.ts
// - Streamable HTTP transport (stateless)
// - route บน Mcp-Method header
// - cache tools/list response ด้วย ttlMs
// - รันบน round-robin load balancer ได้โดยไม่ต้อง sticky session
// - endpoint: POST /mcp (JSON-RPC)
// - endpoint: GET /mcp/sse (server-sent events)

// src/server.ts — เพิ่ม route
app.post("/mcp", mcpHttpHandler)
app.get("/mcp/sse", mcpSseHandler)
```

เหตุผล: stdio ไม่รองรับ multiple concurrent users บน cloud
HTTP transport ทำให้ Railway scale instance ได้อัตโนมัติ

---

### 2. OAuth / SSO Auth 🔴

ปัจจุบัน Soma ใช้ static bcrypt token — ดีพอสำหรับทีมเล็ก
แต่ production จริงต้องรองรับ SSO

```
src/auth/
├── tokens.ts     ← มีอยู่แล้ว (static bearer token)
├── oauth.ts      ← เพิ่มใหม่
└── sso.ts        ← เพิ่มใหม่
```

```typescript
// src/auth/oauth.ts
// - OAuth 2.0 Authorization Code flow
// - PKCE support
// - token refresh อัตโนมัติ
// - revoke endpoint

// src/auth/sso.ts
// - Google OAuth ("Sign in with Google")
// - GitHub OAuth
// - เมื่อ SSO สำเร็จ → สร้าง soma_users record อัตโนมัติ
// - map SSO identity → userId เดิมถ้ามีอยู่แล้ว

// .env เพิ่ม:
// GOOGLE_CLIENT_ID=
// GOOGLE_CLIENT_SECRET=
// GITHUB_CLIENT_ID=
// GITHUB_CLIENT_SECRET=
// SOMA_SESSION_SECRET=   (สำหรับ cookie signing)
```

---

### 3. Async Tasks + Retry 🟡

งานที่ใช้เวลานาน (vector indexing, bulk import) ต้องไม่ block request

```
src/tasks/
├── queue.ts      ← in-memory task queue
├── worker.ts     ← background worker
└── retry.ts      ← retry + exponential backoff
```

```typescript
// Pattern สำหรับ long-running tools:
// soma_index_start({ model }) → { taskId, status: "queued" }
// soma_index_status({ taskId }) → { status, progress, error? }
// soma_index_cancel({ taskId }) → { cancelled: true }

// Retry rules:
// - embedding API timeout → retry 3x with exponential backoff
// - vector DB write fail → retry 2x
// - ถ้า fail ทั้งหมด → degrade to FTS silently ไม่ crash
// - task results expire หลัง 24 ชั่วโมง

// soma_documents.embeddingStatus เพิ่ม column:
// "pending" | "processing" | "done" | "failed"
```

---

### 4. MCP Server Cards 🟡

Standard metadata endpoint ให้ client discover capabilities อัตโนมัติ

```typescript
// src/routes/discovery.ts
// GET /.well-known/mcp.json

{
  "name": "Soma",
  "version": "1.0.0",
  "description": "MCP Memory Layer — the AI external self",
  "transport": ["stdio", "http", "sse"],
  "auth": {
    "type": "bearer",
    "sso": ["google", "github"]
  },
  "tools": [
    { "name": "soma_search", "description": "..." },
    { "name": "soma_learn", "description": "..." }
    // ... ทุก tool
  ],
  "rateLimit": { "requestsPerMinute": 100 },
  "health": "/api/health"
}

// ใน src/server.ts เพิ่ม:
app.get("/.well-known/mcp.json", discoveryHandler)
```

---

### 5. Rate Limiting + Audit Trail 🟡

```
src/middleware/
├── auth.ts         ← มีอยู่แล้ว
├── rateLimit.ts    ← เพิ่มใหม่
└── audit.ts        ← เพิ่มใหม่ (upgrade จาก soma_traces)
```

```typescript
// src/middleware/rateLimit.ts
// per-userId limits:
//   soma_learn:    50 calls/hour  (ป้องกัน spam)
//   soma_search:   200 calls/hour
//   soma_*:        100 calls/min  (global)
// ถ้าเกิน limit → 429 Too Many Requests + retry-after header
// store ใน SQLite (ไม่ต้องการ Redis)

// src/middleware/audit.ts
// บันทึกทุก tool call:
//   - userId, toolName, input hash, latency, status
//   - error rate per tool per user
// alert conditions (log to stderr):
//   - error rate > 10% ใน 5 นาที
//   - latency p99 > 2000ms
//   - soma_learn rate สูงผิดปกติ (> 100/hour)
// soma_traces table upgrade:
//   เพิ่ม column: latencyMs, statusCode, errorMessage
```

---

### 6. MCP Apps UI (SEP-1865) 🟢

Embed interactive UI ใน Copilot Chat โดยตรง — ไม่ต้องเปิด dashboard แยก

```typescript
// src/mcp-apps/
// ├── search-results.html   ← แสดง search results inline
// ├── timeline.html         ← heat calendar inline
// └── stats.html            ← stats widget inline

// Tool declarations เพิ่ม ui field:
{
  name: "soma_search",
  ui: {
    template: "search-results.html",
    ttlMs: 30000
  }
}

// เมื่อ Copilot เรียก soma_search:
// → ได้ผลลัพธ์ปกติ (JSON)
// + แสดง search-results UI ใน sandboxed iframe ใน chat
```

---

### Schema เพิ่มเติมสำหรับ Production

```typescript
// soma_tasks — async task queue
export const somaTasks = sqliteTable("soma_tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => somaUsers.id),
  type: text("type").notNull(),        // "index" | "export" | "import"
  status: text("status").notNull(),    // "queued" | "processing" | "done" | "failed"
  progress: integer("progress").default(0), // 0-100
  error: text("error"),
  result: text("result"),              // JSON
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

// soma_rate_limits — sliding window counter
export const somaRateLimits = sqliteTable("soma_rate_limits", {
  id: text("id").primaryKey(),         // userId:toolName:window
  userId: text("user_id").notNull(),
  toolName: text("tool_name").notNull(),
  windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
  count: integer("count").default(0),
})
```

---

### Scaffold Order เพิ่มเติม (ต่อจาก Step 19)

```
Step 20  src/transport/http.ts (Streamable HTTP)
Step 21  src/auth/oauth.ts + src/auth/sso.ts
Step 22  src/tasks/queue.ts + worker.ts + retry.ts
Step 23  src/routes/discovery.ts (MCP Server Cards)
Step 24  src/middleware/rateLimit.ts + audit.ts
Step 25  src/mcp-apps/ (MCP Apps UI templates)
Step 26  soma_tasks + soma_rate_limits schema
Step 27  upgrade tests สำหรับทุก production feature
```

---

### Production Checklist ก่อน Go-Live

```
Infrastructure:
□ Railway persistent volume /app/data
□ SOMA_ADMIN_TOKEN ตั้งค่าแล้ว (ไม่ใช่ default)
□ SOMA_SESSION_SECRET ตั้งค่าแล้ว
□ Health check /api/health ผ่าน
□ /.well-known/mcp.json accessible

Auth:
□ Static token ใช้งานได้
□ (optional) Google/GitHub SSO ตั้งค่าแล้ว
□ Token rotation ทดสอบแล้ว

Performance:
□ FTS5 index สร้างแล้ว
□ soma_search p99 < 500ms
□ Rate limiting ทดสอบแล้ว
□ Vector mode: embedded หรือ disabled (ไม่ crash)

Observability:
□ /api/health แสดง vectorMode + docCount
□ Audit log บันทึก tool calls
□ Error rate monitoring ทำงาน
□ soma_traces accessible ผ่าน /traces

Security:
□ SOMA_TOKEN ไม่อยู่ใน Git
□ ทุก route (ยกเว้น /health + /.well-known) require auth
□ userId isolation ทดสอบแล้ว (user A ไม่เห็น data user B)
□ bcrypt token ไม่ expose plaintext ใน response
```

---

## Skills (/.claude/commands/)

Skills คือ reusable command definitions ที่ Copilot ใช้เมื่อ detect trigger
วางไว้ที่ `.claude/commands/` — Copilot อ่านอัตโนมัติ

---

### `/learn` — บันทึกความจำ

**Triggers:** `/learn`, `จำ`, `บันทึก`, `เซฟ`, `remember`, `save this`

```
user: "จำไว้ด้วย — ใช้ Drizzle เสมอ"
→ extract content
→ ตรวจ context (ไม่ใช่ "ลอง"/"ชั่วคราว")
→ soma_learn({ content, concepts, title })
→ "✓ บันทึกแล้ว: Drizzle preference"
```

### `/forget` — ลบความจำ

**Triggers:** `/forget`, `ลืมได้แล้ว`, `ลบทิ้ง`, `forget this`

```
user: "/forget jQuery"
→ soma_search หา docs ที่เกี่ยวข้อง
→ แสดงให้ user เห็นก่อน
→ รอ confirm เสมอ — ห้าม auto-delete
→ soma_forget({ id, reason })
```

### `/recall` — ดึงความจำ

**Triggers:** `/recall`, `จำได้ว่า`, `เคยบอกไว้`, `what do you remember`

```
user: "/recall database"
→ soma_search + soma_context
→ สรุปเป็น timeline ให้อ่าน
```

### `/status` — ดูสถานะ (= ppp)

**Triggers:** `/status`, `ppp`

```
→ soma_stats + token usage + git status
→ แนะนำ step ถัดไป
```

---

### Keyword Detection Rules

```typescript
// Copilot ต้อง detect keywords เหล่านี้ใน user message

const LEARN_TRIGGERS = [
  "จำ", "บันทึก", "เซฟ", "จดไว้", "จำไว้",
  "remember", "save this", "note that", "learn this", "keep in mind"
]

const SKIP_LEARN = [
  "ลอง", "ทดสอบ", "ชั่วคราว", "แค่ทดสอบ",
  "just testing", "temporary", "for now", "maybe"
]

const SENSITIVE_PATTERNS = [
  /token/i, /password/i, /secret/i, /api[_\s]?key/i, /credential/i
]

// ถ้า message มี LEARN_TRIGGERS → เรียก /learn skill
// ถ้า message มี SKIP_LEARN → ถามก่อน
// ถ้า content มี SENSITIVE_PATTERNS → ปฏิเสธ
```

---

## Auto-Learn Rules

Copilot ต้องเรียก soma_learn อัตโนมัติเมื่อเกิดเหตุการณ์เหล่านี้
ไม่ต้องรอให้ user สั่ง — detect แล้ว learn เลย

---

### Trigger 1 — Decision Made

```
สัญญาณ: user ตัดสินใจเลือกอะไรสักอย่าง
ตัวอย่าง:
  "โอเค ใช้ Drizzle แล้วกัน"
  "เลือก Bun แทน Node ดีกว่า"
  "ไม่เอา Prisma แล้ว"

→ soma_learn({
    content: "ตัดสินใจใช้ Drizzle แทน Prisma เพราะ schema-first และไม่มี magic",
    concepts: ["decision", "database", "drizzle"],
    title: "เลือก Drizzle"
  })
```

### Trigger 2 — Problem Solved

```
สัญญาณ: แก้ bug หรือปัญหาได้แล้ว
ตัวอย่าง:
  "อ๋อ เข้าใจแล้ว ต้องเพิ่ม await ตรงนี้"
  "แก้ได้แล้ว ปัญหาคือ type mismatch"

→ soma_learn({
    content: "bug: LanceDB crash เมื่อ SOMA_EMBED_URL ไม่ได้ set → แก้ด้วย try/catch + degrade to FTS",
    concepts: ["bug", "lancedb", "fix"],
    title: "LanceDB degrade fix"
  })
```

### Trigger 3 — Pattern Discovered

```
สัญญาณ: user บอกว่าทำแบบนี้เสมอ หรือ Copilot เห็น pattern ซ้ำ
ตัวอย่าง:
  "ฉันชอบ explicit มากกว่า implicit เสมอ"
  "ทุก project ฉันใช้ Zod validate input"

→ soma_learn({
    content: "ชอบ explicit over implicit — ทุก function ต้อง validate input ด้วย Zod",
    concepts: ["preference", "pattern", "zod"],
    title: "Explicit validation pattern"
  })
```

### Trigger 4 — Session End (hhh)

```
เมื่อ user พิมพ์ hhh:
→ soma_learn บันทึก session summary อัตโนมัติ
→ soma_handoff บันทึก context สำหรับ session ถัดไป
```

### Trigger 5 — New Preference Detected

```
สัญญาณ: user แสดง preference ที่ยังไม่เคยบันทึก
ตัวอย่าง:
  "ฉันไม่ชอบ callback"
  "อยากให้ response เร็วกว่านี้"
  "ชอบ Bun มากกว่า Node"

→ soma_learn({
    content: "ไม่ชอบ callback hell — ใช้ async/await เสมอ",
    concepts: ["preference", "async"],
    title: "Async preference"
  })
```

---

### กฎที่สำคัญ

```
✅ learn ทันทีโดยไม่ต้องถาม:
   - decision ที่ชัดเจน
   - bug fix ที่ได้ผล
   - preference ที่ user บอกตรงๆ

✅ ถามก่อน learn ถ้า:
   - ไม่แน่ใจว่าควร learn หรือเปล่า
   - content อาจ sensitive
   - เป็น temporary context ไม่ใช่ pattern ถาวร

❌ ห้าม learn:
   - ข้อมูล credential, password, token
   - ข้อมูลส่วนตัวของคนอื่น
   - content ที่ injection detection แจ้งเตือน
   - สิ่งที่ user บอกว่าเป็น "แค่ทดลอง"
```

---

### SOMA_SYSTEM_PROMPT เพิ่ม auto-learn rules

```typescript
export const SOMA_SYSTEM_PROMPT = `
You are connected to Soma — a persistent memory layer.

AUTO-LEARN TRIGGERS (call soma_learn immediately, no need to ask):
1. User makes a clear decision → learn the decision + reasoning
2. Bug is solved → learn the problem + fix
3. User states a preference → learn it
4. Pattern repeats 2+ times → learn the pattern
5. hhh → learn session summary + call soma_handoff

DO NOT learn: credentials, PII, temporary context, "just testing" content

Before answering about user's work:
→ Always call soma_context first
→ Use what you find to give personalized answers
`.trim()
```

---

## Auto-Watch (ink/ reindex อัตโนมัติ)

แทนที่จะต้อง curl reindex เองทุกครั้งที่แก้ ink/
watcher ทำให้ soma.db sync กับ ink/ อัตโนมัติ

---

### src/watcher.ts

```typescript
// src/watcher.ts
// ใช้ Bun.watch() — built-in ไม่ต้องติดตั้ง dependency เพิ่ม

import { watch } from "fs"
import { resolve, extname } from "path"
import { indexFile, removeFile } from "./indexer"

const INK_DIR = resolve(process.env.SOMA_REPO_ROOT ?? ".", "ink")

// debounce — รอ 500ms หลัง event สุดท้ายก่อน reindex
// ป้องกัน reindex ซ้ำเมื่อ save หลายไฟล์พร้อมกัน
let debounceTimer: Timer | null = null

const debounce = (fn: () => void, ms = 500) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fn, ms)
}

export function startWatcher(userId?: string) {
  watch(INK_DIR, { recursive: true }, (event, filename) => {
    if (!filename) return
    if (extname(filename) !== ".md") return  // .md เท่านั้น

    const fullPath = resolve(INK_DIR, filename)

    debounce(async () => {
      if (event === "rename") {
        // ไฟล์ถูกลบ → remove จาก DB
        await removeFile(fullPath, userId).catch(() => {})
      } else {
        // ไฟล์ถูกแก้/สร้าง → reindex
        await indexFile(fullPath, userId).catch(console.error)
        console.log(`[watcher] reindexed: ${filename}`)
      }
    })
  })

  console.log(`[watcher] watching ink/ at ${INK_DIR}`)
}
```

### เชื่อมเข้า server + mcp

```typescript
// src/server.ts และ src/mcp.ts — เพิ่มหลัง bootstrap

import { startWatcher } from "./watcher"
await bootstrap()
startWatcher()   // ← เพิ่มบรรทัดนี้
```

### พฤติกรรม

```
แก้ ink/preferences.md
→ watcher detect change ใน 500ms
→ reindex เฉพาะไฟล์นั้น (~2ms)
→ soma_search เห็น content ใหม่ทันที ✅

สร้าง ink/decisions/2026-06-13-new.md
→ watcher detect
→ index ไฟล์ใหม่เข้า DB ✅

ลบ ink/handoffs/old.md
→ watcher detect rename event
→ remove จาก DB ✅
```

### ไม่กระทบ performance

```
Bun.watch() ใช้ OS-level inotify/kqueue/FSEvents
→ zero CPU เมื่อไม่มีการเปลี่ยนแปลง
→ debounce 500ms ป้องกัน rapid-fire events
→ reindex ทีละไฟล์ ไม่ rebuild ทั้ง corpus
```

---

## Security

Defense in depth — 6 layers ทุกอย่างต้องผ่านทุก layer

---

### Layer 1 — Network

```
HTTPS เสมอ (Railway ให้อัตโนมัติ)
IP-based rate limit บน unauthenticated routes: 100 req/min per IP
ครอบคลุม /api/health และ /.well-known/ ด้วย
```

---

### Layer 2 — Token & Auth

**Token format:** `tok_[userId6]_[random32]`
- prefix `tok_[userId]` ใช้ lookup ก่อน bcrypt (เร็ว + ป้องกัน timing attack)
- random part >= 32 chars (ป้องกัน brute force)

```typescript
// src/auth/tokens.ts

// Generate
export function generateToken(userId: string): string {
  const random = crypto.randomBytes(32).toString("hex")
  return `tok_${userId.slice(0, 6)}_${random}`
}

// Verify — prefix lookup ก่อน bcrypt
export async function verifyToken(raw: string): Promise<string | null> {
  const prefix = raw.split("_").slice(0, 2).join("_")
  const user = await db.select().from(somaUsers)
    .where(like(somaUsers.token, `${prefix}%`))
    .limit(1)
  if (!user[0]) return null
  const valid = await bcrypt.compare(raw, user[0].token)
  return valid ? user[0].id : null
}

// soma_users เพิ่ม columns:
// failedAttempts: integer default 0
// lockedUntil: integer (timestamp) nullable
// tokenExpiresAt: integer (timestamp) nullable
// lastRotatedAt: integer (timestamp)

// Lock หลัง 10 failed attempts ใน 5 นาที
// Token expiry: default 90 วัน (configurable)
```

**Rotation policy:**
```bash
# แนะนำ rotate ทุก 90 วัน
POST /api/admin/users/:id/rotate-token
# token เก่า invalid ทันที
# log ใน soma_traces
```

---

### Layer 3 — Authorization

```typescript
// src/middleware/auth.ts — inject userId
// userId ต้องมาจาก middleware เท่านั้น ห้ามรับจาก client

// src/middleware/responseGuard.ts — ตรวจก่อน return
export function guardResponse(data: any, userId: string): void {
  const items = Array.isArray(data) ? data : [data]
  items.forEach(item => {
    if (item?.userId && item.userId !== userId) {
      // log security incident
      logger.error("Cross-user data leak detected", { item, userId })
      throw new Error("Unauthorized")
    }
  })
}

// ใช้ทุก tool response ก่อน return
```

**ทุก DB query บังคับ WHERE user_id:**
```typescript
// ❌ ห้ามเด็ดขาด
db.select().from(somaDocuments)

// ✅ ต้องเป็นแบบนี้เสมอ
db.select().from(somaDocuments)
  .where(eq(somaDocuments.userId, userId))
```

---

### Layer 4 — Input Validation

**Zod schema ทุก endpoint และ tool:**
```typescript
// ตัวอย่าง soma_learn
const learnSchema = z.object({
  content: z.string().min(1).max(50_000),
  title: z.string().max(500).optional(),
  concepts: z.array(z.string().max(50)).max(20).optional(),
  sourceFile: z.string().max(500).optional(),
  supersedes: z.string().max(50).optional(),
})
```

**Path traversal ใน Indexer:**
```typescript
// src/indexer.ts
const safePath = path.resolve(SOMA_REPO_ROOT, "ink")
const requested = path.resolve(SOMA_REPO_ROOT, userInput)
if (!requested.startsWith(safePath)) {
  throw new Error("Path traversal detected")
}
```

**No raw SQL:**
```typescript
// ❌ อันตราย
db.run(sql`SELECT * FROM soma_documents WHERE title = '${userInput}'`)

// ✅ ปลอดภัย — Drizzle parameterized เสมอ
db.select().from(somaDocuments)
  .where(eq(somaDocuments.title, userInput))
```

---

### Layer 5 — Data Protection

**Encryption at rest (3 ระดับ):**
```typescript
// src/db/crypto.ts

// Level 1: ไม่ encrypt (default) — ข้อมูล technical ทั่วไป
// Level 2: encrypt content column
//   SOMA_ENCRYPTION_KEY=<32 byte hex>
//   AES-256-GCM ก่อน write, decrypt ก่อน return
// Level 3: SQLCipher full DB encryption
//   ต้องใช้ key ทุกครั้งที่เปิด DB

export const encryptIfNeeded = (text: string): string =>
  SOMA_ENCRYPTION_KEY
    ? aes256gcm.encrypt(text, SOMA_ENCRYPTION_KEY)
    : text

export const decryptIfNeeded = (text: string): string =>
  SOMA_ENCRYPTION_KEY
    ? aes256gcm.decrypt(text, SOMA_ENCRYPTION_KEY)
    : text
```

**Data minimization:**
```
soma_traces → เก็บ input hash ไม่ใช่ plaintext
soma_documents → ไม่เก็บ PII ถ้าไม่จำเป็น
soma_rate_limits → expire หลัง window ผ่านไป
```

**SSRF protection:**
```typescript
// SOMA_EMBED_URL ต้อง validate domain whitelist
// ห้าม fetch URL จาก user content เด็ดขาด
const ALLOWED_EMBED_DOMAINS = ["api.openai.com", "api.cohere.ai"]
const embedUrl = new URL(SOMA_EMBED_URL)
if (!ALLOWED_EMBED_DOMAINS.includes(embedUrl.hostname)) {
  throw new Error("Embed URL not in whitelist")
}
```

---

### Layer 6 — AI/MCP Security

**Prompt Injection Detection:**
```typescript
// src/tools/learn.ts — validate ก่อน write เสมอ

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /\[\[.*?\]\]/,              // hidden markdown
  /<script[\s\S]*?>/i,        // script injection
  /base64[,:\s][\w+/]{20,}/i, // encoded payloads
  / ||/,           // control characters
]

export function detectInjection(content: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(content))
}

// ถ้าตรวจพบ → reject + log ใน soma_traces + alert
if (detectInjection(input.content)) {
  await logSecurityEvent("injection_attempt", userId, input)
  throw new Error("Content rejected: potential injection detected")
}
```

**Destructive Tool Guard:**
```
กฎสำหรับ tools ที่ลบหรือแก้ข้อมูล:

soma_forget    → ต้องถาม user ก่อนเสมอ ห้าม auto-call
soma_supersede → ต้องถาม user ก่อนเสมอ ห้าม auto-call
soma_learn     → เรียกได้อัตโนมัติ (additive only)
soma_handoff   → เรียกได้อัตโนมัติ (additive only)
soma_search    → เรียกได้อัตโนมัติ (read only)

ถ้า Copilot คิดจะ call soma_forget/soma_supersede:
→ แสดง confirmation ก่อน: "จะลบ doc [title] ใช่ไหม?"
→ รอ user confirm แล้วค่อย call
```

**Content Sanitization ก่อนเขียน ink/:**
```typescript
// src/indexer.ts — ก่อนเขียนไฟล์ใดๆ
import { sanitize } from "dompurify"

export function sanitizeForVault(content: string): string {
  return content
    .replace(/<[^>]*>/g, "")     // strip HTML
    .replace(/ /g, "")          // strip null bytes
    .slice(0, 50_000)            // limit size
}
```

---

### Schema เพิ่มเติมสำหรับ Security

```typescript
// soma_users เพิ่ม columns
failedAttempts: integer("failed_attempts").default(0),
lockedUntil: integer("locked_until", { mode: "timestamp" }),
tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
lastRotatedAt: integer("last_rotated_at", { mode: "timestamp" }).notNull(),

// soma_security_events — log security incidents
export const somaSecurityEvents = sqliteTable("soma_security_events", {
  id: text("id").primaryKey(),
  userId: text("user_id"),          // nullable ถ้ายังไม่ auth
  eventType: text("event_type").notNull(), // "injection_attempt" | "brute_force" | "path_traversal" | "cross_user"
  ipAddress: text("ip_address"),
  details: text("details"),         // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})
```

---

### Skills (/.claude/commands/)

Skills คือ reusable command definitions ที่ Copilot ใช้เมื่อ detect trigger
วางไว้ที่ `.claude/commands/` — Copilot อ่านอัตโนมัติ

---

### `/learn` — บันทึกความจำ

**Triggers:** `/learn`, `จำ`, `บันทึก`, `เซฟ`, `remember`, `save this`

```
user: "จำไว้ด้วย — ใช้ Drizzle เสมอ"
→ extract content
→ ตรวจ context (ไม่ใช่ "ลอง"/"ชั่วคราว")
→ soma_learn({ content, concepts, title })
→ "✓ บันทึกแล้ว: Drizzle preference"
```

### `/forget` — ลบความจำ

**Triggers:** `/forget`, `ลืมได้แล้ว`, `ลบทิ้ง`, `forget this`

```
user: "/forget jQuery"
→ soma_search หา docs ที่เกี่ยวข้อง
→ แสดงให้ user เห็นก่อน
→ รอ confirm เสมอ — ห้าม auto-delete
→ soma_forget({ id, reason })
```

### `/recall` — ดึงความจำ

**Triggers:** `/recall`, `จำได้ว่า`, `เคยบอกไว้`, `what do you remember`

```
user: "/recall database"
→ soma_search + soma_context
→ สรุปเป็น timeline ให้อ่าน
```

### `/status` — ดูสถานะ (= ppp)

**Triggers:** `/status`, `ppp`

```
→ soma_stats + token usage + git status
→ แนะนำ step ถัดไป
```

---

### Keyword Detection Rules

```typescript
// Copilot ต้อง detect keywords เหล่านี้ใน user message

const LEARN_TRIGGERS = [
  "จำ", "บันทึก", "เซฟ", "จดไว้", "จำไว้",
  "remember", "save this", "note that", "learn this", "keep in mind"
]

const SKIP_LEARN = [
  "ลอง", "ทดสอบ", "ชั่วคราว", "แค่ทดสอบ",
  "just testing", "temporary", "for now", "maybe"
]

const SENSITIVE_PATTERNS = [
  /token/i, /password/i, /secret/i, /api[_\s]?key/i, /credential/i
]

// ถ้า message มี LEARN_TRIGGERS → เรียก /learn skill
// ถ้า message มี SKIP_LEARN → ถามก่อน
// ถ้า content มี SENSITIVE_PATTERNS → ปฏิเสธ
```

---

## Auto-Learn Rules

Copilot ต้องเรียก soma_learn อัตโนมัติเมื่อเกิดเหตุการณ์เหล่านี้
ไม่ต้องรอให้ user สั่ง — detect แล้ว learn เลย

---

### Trigger 1 — Decision Made

```
สัญญาณ: user ตัดสินใจเลือกอะไรสักอย่าง
ตัวอย่าง:
  "โอเค ใช้ Drizzle แล้วกัน"
  "เลือก Bun แทน Node ดีกว่า"
  "ไม่เอา Prisma แล้ว"

→ soma_learn({
    content: "ตัดสินใจใช้ Drizzle แทน Prisma เพราะ schema-first และไม่มี magic",
    concepts: ["decision", "database", "drizzle"],
    title: "เลือก Drizzle"
  })
```

### Trigger 2 — Problem Solved

```
สัญญาณ: แก้ bug หรือปัญหาได้แล้ว
ตัวอย่าง:
  "อ๋อ เข้าใจแล้ว ต้องเพิ่ม await ตรงนี้"
  "แก้ได้แล้ว ปัญหาคือ type mismatch"

→ soma_learn({
    content: "bug: LanceDB crash เมื่อ SOMA_EMBED_URL ไม่ได้ set → แก้ด้วย try/catch + degrade to FTS",
    concepts: ["bug", "lancedb", "fix"],
    title: "LanceDB degrade fix"
  })
```

### Trigger 3 — Pattern Discovered

```
สัญญาณ: user บอกว่าทำแบบนี้เสมอ หรือ Copilot เห็น pattern ซ้ำ
ตัวอย่าง:
  "ฉันชอบ explicit มากกว่า implicit เสมอ"
  "ทุก project ฉันใช้ Zod validate input"

→ soma_learn({
    content: "ชอบ explicit over implicit — ทุก function ต้อง validate input ด้วย Zod",
    concepts: ["preference", "pattern", "zod"],
    title: "Explicit validation pattern"
  })
```

### Trigger 4 — Session End (hhh)

```
เมื่อ user พิมพ์ hhh:
→ soma_learn บันทึก session summary อัตโนมัติ
→ soma_handoff บันทึก context สำหรับ session ถัดไป
```

### Trigger 5 — New Preference Detected

```
สัญญาณ: user แสดง preference ที่ยังไม่เคยบันทึก
ตัวอย่าง:
  "ฉันไม่ชอบ callback"
  "อยากให้ response เร็วกว่านี้"
  "ชอบ Bun มากกว่า Node"

→ soma_learn({
    content: "ไม่ชอบ callback hell — ใช้ async/await เสมอ",
    concepts: ["preference", "async"],
    title: "Async preference"
  })
```

---

### กฎที่สำคัญ

```
✅ learn ทันทีโดยไม่ต้องถาม:
   - decision ที่ชัดเจน
   - bug fix ที่ได้ผล
   - preference ที่ user บอกตรงๆ

✅ ถามก่อน learn ถ้า:
   - ไม่แน่ใจว่าควร learn หรือเปล่า
   - content อาจ sensitive
   - เป็น temporary context ไม่ใช่ pattern ถาวร

❌ ห้าม learn:
   - ข้อมูล credential, password, token
   - ข้อมูลส่วนตัวของคนอื่น
   - content ที่ injection detection แจ้งเตือน
   - สิ่งที่ user บอกว่าเป็น "แค่ทดลอง"
```

---

### SOMA_SYSTEM_PROMPT เพิ่ม auto-learn rules

```typescript
export const SOMA_SYSTEM_PROMPT = `
You are connected to Soma — a persistent memory layer.

AUTO-LEARN TRIGGERS (call soma_learn immediately, no need to ask):
1. User makes a clear decision → learn the decision + reasoning
2. Bug is solved → learn the problem + fix
3. User states a preference → learn it
4. Pattern repeats 2+ times → learn the pattern
5. hhh → learn session summary + call soma_handoff

DO NOT learn: credentials, PII, temporary context, "just testing" content

Before answering about user's work:
→ Always call soma_context first
→ Use what you find to give personalized answers
`.trim()
```

---

## Auto-Watch (ink/ reindex อัตโนมัติ)

แทนที่จะต้อง curl reindex เองทุกครั้งที่แก้ ink/
watcher ทำให้ soma.db sync กับ ink/ อัตโนมัติ

---

### src/watcher.ts

```typescript
// src/watcher.ts
// ใช้ Bun.watch() — built-in ไม่ต้องติดตั้ง dependency เพิ่ม

import { watch } from "fs"
import { resolve, extname } from "path"
import { indexFile, removeFile } from "./indexer"

const INK_DIR = resolve(process.env.SOMA_REPO_ROOT ?? ".", "ink")

// debounce — รอ 500ms หลัง event สุดท้ายก่อน reindex
// ป้องกัน reindex ซ้ำเมื่อ save หลายไฟล์พร้อมกัน
let debounceTimer: Timer | null = null

const debounce = (fn: () => void, ms = 500) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fn, ms)
}

export function startWatcher(userId?: string) {
  watch(INK_DIR, { recursive: true }, (event, filename) => {
    if (!filename) return
    if (extname(filename) !== ".md") return  // .md เท่านั้น

    const fullPath = resolve(INK_DIR, filename)

    debounce(async () => {
      if (event === "rename") {
        // ไฟล์ถูกลบ → remove จาก DB
        await removeFile(fullPath, userId).catch(() => {})
      } else {
        // ไฟล์ถูกแก้/สร้าง → reindex
        await indexFile(fullPath, userId).catch(console.error)
        console.log(`[watcher] reindexed: ${filename}`)
      }
    })
  })

  console.log(`[watcher] watching ink/ at ${INK_DIR}`)
}
```

### เชื่อมเข้า server + mcp

```typescript
// src/server.ts และ src/mcp.ts — เพิ่มหลัง bootstrap

import { startWatcher } from "./watcher"
await bootstrap()
startWatcher()   // ← เพิ่มบรรทัดนี้
```

### พฤติกรรม

```
แก้ ink/preferences.md
→ watcher detect change ใน 500ms
→ reindex เฉพาะไฟล์นั้น (~2ms)
→ soma_search เห็น content ใหม่ทันที ✅

สร้าง ink/decisions/2026-06-13-new.md
→ watcher detect
→ index ไฟล์ใหม่เข้า DB ✅

ลบ ink/handoffs/old.md
→ watcher detect rename event
→ remove จาก DB ✅
```

### ไม่กระทบ performance

```
Bun.watch() ใช้ OS-level inotify/kqueue/FSEvents
→ zero CPU เมื่อไม่มีการเปลี่ยนแปลง
→ debounce 500ms ป้องกัน rapid-fire events
→ reindex ทีละไฟล์ ไม่ rebuild ทั้ง corpus
```

---

## Security Checklist

```
Auth:
□ Token >= 32 chars random
□ bcrypt + prefix lookup
□ failed attempt counter + lock
□ token expiry ตั้งค่าแล้ว
□ rotate policy มี

Authorization:
□ userId inject จาก middleware เท่านั้น
□ ทุก query มี WHERE user_id = ?
□ responseGuard ทุก tool response
□ cross-user test ผ่าน

Input:
□ Zod schema ทุก endpoint
□ path traversal check ใน indexer
□ injection detection ใน soma_learn
□ no raw SQL

Data:
□ ตัดสินใจ encryption level แล้ว
□ SOMA_ENCRYPTION_KEY ตั้งค่าถ้าต้องการ
□ embed URL whitelist

MCP/AI:
□ destructive tools มี confirmation
□ content sanitization ก่อนเขียน ink/
□ soma_security_events table มี
□ security incidents ถูก log
```

---

### Scaffold Steps เพิ่ม

```
Step 33  src/auth/tokens.ts upgrade (prefix lookup + expiry + lock)
Step 34  src/middleware/responseGuard.ts
Step 35  injection detection ใน soma_learn
Step 36  src/db/crypto.ts (optional encryption)
Step 37  soma_security_events table + logging
Step 38  security tests (cross-user, injection, path traversal)
```

---

## Limitations & How to Handle Them

ข้อจำกัดที่รู้และวิธีจัดการ — Copilot ต้องรู้สิ่งเหล่านี้เพื่อทำงานได้ถูกต้อง

---

### 1. Tool Call ไม่ Automatic 🔴

**ปัญหา:** Copilot อาจตอบโดยไม่เรียก soma tool ถ้าเห็นว่าคำถามง่าย
ผลคือความจำไม่ถูกใช้

**กฎใน instructions:**
```
ทุก message ที่เกี่ยวกับ:
- งานที่กำลังทำ / เคยทำ
- preference / stack / decision
- bug หรือ pattern ที่เคยเจอ
→ ต้องเรียก soma_context หรือ soma_search ก่อนตอบเสมอ
ไม่มีข้อยกเว้น แม้คำถามจะดูง่าย
```

**Copilot ต้องทำ:**
```typescript
// ก่อนตอบทุกครั้งที่ context อาจเกี่ยวข้อง
const ctx = await callTool("soma_context", { topic: userQuestion })
// ถ้า ctx มีข้อมูล → ใช้ก่อนตอบ
// ถ้า ctx ว่าง → ตอบปกติ แต่ offer soma_learn ถ้าคำตอบมีประโยชน์
```

**User สังเกตได้:** ถ้า Copilot ตอบโดยไม่ดึงความจำ ให้บอกว่า
"ดึงความจำก่อนตอบด้วย" — Copilot จะ retry พร้อม soma_context

---

### 2. SQLite Concurrent Writes 🟡

**ปัญหา:** indexer + server + MCP เขียนพร้อมกัน → อาจ deadlock

**แก้ใน src/db/index.ts:**
```typescript
// เปิด WAL mode ทันทีหลัง connect
db.exec("PRAGMA journal_mode = WAL")
db.exec("PRAGMA synchronous = NORMAL")
db.exec("PRAGMA busy_timeout = 5000")  // รอ 5 วินาทีถ้า lock
// busy_timeout ป้องกัน crash ถ้า concurrent access
```

**Write queue pattern:**
```typescript
// src/db/writer.ts
// ทุก write ผ่าน single async queue
// ป้องกัน concurrent write collision
const writeQueue = new AsyncQueue()
export const safeWrite = (fn: () => void) => writeQueue.add(fn)
```

---

### 3. Vector Embedding Consistency 🔴

**ปัญหา:** เปลี่ยน embedding model → vector เก่าใช้ไม่ได้ ต้อง reindex ทั้งหมด

**แก้ด้วย embedding version tracking:**
```typescript
// soma_documents เพิ่ม column
embeddingModel: text("embedding_model"),  // เช่น "bge-m3", "text-embedding-3-small"
embeddingVersion: integer("embedding_version").default(1)

// ก่อน vector search ตรวจสอบ
const currentModel = process.env.SOMA_EMBED_MODEL ?? "bge-m3"
const staleCount = await db.select()
  .from(somaDocuments)
  .where(ne(somaDocuments.embeddingModel, currentModel))
  .count()

if (staleCount > 0) {
  // log warning: "X docs need reindex for model Y"
  // degrade to FTS สำหรับ docs ที่ stale
  // ไม่ crash, ไม่ผสม vector space ต่างกัน
}
```

**กฎ:** ห้ามเปลี่ยน SOMA_EMBED_MODEL โดยไม่รัน reindex ก่อน
เพิ่มใน DEPLOYMENT checklist

---

### 4. Railway Free Tier Sleep 🟡

**ปัญหา:** หยุดทำงานหลัง idle 30 นาที → cold start 2-3 วินาที

**แก้ด้วย warmup endpoint + cron ping:**
```typescript
// src/routes/health.ts เพิ่ม
app.get("/api/warmup", (c) => {
  // touch DB เบาๆ เพื่อ keep warm
  db.select().from(somaUsers).limit(1)
  return c.json({ warm: true })
})
```

```yaml
# ใช้ UptimeRobot (ฟรี) ping ทุก 5 นาที
# URL: https://soma.up.railway.app/api/warmup
# interval: 5 minutes
# → Railway ไม่ sleep ตลอด 24/7
```

**หรือ upgrade $5/เดือน** Railway Hobby plan ไม่ sleep

---

### 5. Privacy บน Cloud 🔴

**ปัญหา:** soma.db อยู่บน Railway, content ผ่าน Copilot API

**Option A — Encrypt sensitive columns:**
```typescript
// src/db/crypto.ts
// encrypt/decrypt content ก่อน write/read
// key อยู่ใน SOMA_ENCRYPTION_KEY env
// ถ้าไม่ set → ไม่ encrypt (default)

export const encryptIfNeeded = (text: string) =>
  SOMA_ENCRYPTION_KEY ? encrypt(text, SOMA_ENCRYPTION_KEY) : text

export const decryptIfNeeded = (text: string) =>
  SOMA_ENCRYPTION_KEY ? decrypt(text, SOMA_ENCRYPTION_KEY) : text
```

**Option B — Self-host (แนะนำถ้า sensitive มาก):**
```bash
# รันบนเครื่องตัวเอง + PM2
pm2 start "bun src/server.ts" --name soma
pm2 startup && pm2 save
# SOMA_API=http://localhost:55000
# ข้อมูลไม่ออกนอกเครื่องเลย
```

**Option C — VPS ราคาถูก:**
```bash
# Hetzner CX11 = €3.29/เดือน
# ควบคุมเองทั้งหมด ไม่ผ่าน third-party
```

---

### 6. Scale > 10 Users 🟡

**ปัญหา:** SQLite write lock กับ concurrent users จำนวนมาก

**แก้ด้วย PostgreSQL adapter (เมื่อจำเป็น):**
```typescript
// src/db/index.ts — abstract ให้ swap ได้
// ตอนนี้: Bun SQLite
// เมื่อ scale: เปลี่ยน driver เป็น postgres ไม่ต้องแก้ tools

// drizzle.config.ts รองรับทั้งคู่
const db = process.env.DATABASE_URL
  ? drizzle(postgres(process.env.DATABASE_URL))  // PostgreSQL
  : drizzle(new Database(sqlitePath))             // SQLite (default)
```

**กฎ:** ใช้ SQLite จนถึง 10 users หรือ 1,000 writes/day
ถ้าเกิน → migrate ไป PostgreSQL (Supabase free tier)

---

### 7. "แก้ไม่ได้" — วิธีจัดการ

#### Copilot ข้าม Soma บางครั้ง
```
วิธีรับมือ:
- ถ้าสังเกตว่า Copilot ตอบโดยไม่ใช้ความจำ
  พิมพ์: "ppp" → เช็คว่า soma_stats ตอบได้ไหม
  ถ้าไม่ตอบ → MCP disconnect → restart VS Code

- เพิ่มใน ink/preferences.md:
  "Always use soma_context before answering about my work"
  Copilot จะเห็นตอน indexer scan และใช้เป็น context
```

#### Garbage In, Garbage Out
```
วิธีรับมือ:
- ทำ rrr ทุก session สำคัญ → quality memory
- ใช้ soma_forget ลบ docs ที่ผิดพลาด
- ใช้ soma_supersede แทนที่ความคิดเก่า
- review ink/ ทุกเดือน → ลบสิ่งที่ล้าสมัย

กฎใน Copilot:
ถ้าเห็นว่าข้อมูลที่ดึงมาดูเก่าหรือไม่ accurate
ให้บอก user และถามว่าจะ soma_forget หรือ soma_supersede
```

#### Context Window จำกัด
```
วิธีรับมือ:
soma_search → limit=5 docs (ไม่ใช่ 10)
soma_digest → ย่อก่อนส่ง (ลด tokens)
soma_context → recent=3, related=3 (ไม่ใช่ 5+5)

Copilot ต้องเลือก docs ที่ relevant ที่สุด
ไม่ใช่ dump ทุกอย่างเข้า context
ถ้าต้องการลึก → soma_digest ก่อน
```

---

### Schema Updates ที่ต้องเพิ่ม

```typescript
// soma_documents เพิ่ม 2 columns
embeddingModel: text("embedding_model"),
embeddingVersion: integer("embedding_version").default(1),

// soma_documents เพิ่ม optional column
encryptedContent: integer("encrypted_content").default(0),  // boolean
```

---

### Scaffold Steps เพิ่ม

```
Step 28  src/db/writer.ts (WAL mode + write queue)
Step 29  embedding version tracking ใน soma_documents
Step 30  src/routes/warmup.ts + UptimeRobot config
Step 31  src/db/crypto.ts (optional encryption)
Step 32  PostgreSQL adapter ใน drizzle.config.ts
```

---

### Checklist ก่อน Deploy (เพิ่มเติม)

```
Reliability:
□ WAL mode เปิดแล้ว
□ busy_timeout = 5000ms
□ /api/warmup endpoint มี
□ UptimeRobot ตั้งค่าแล้ว (หรือ Hobby plan)

Data Integrity:
□ SOMA_EMBED_MODEL ตั้งค่าแล้วและไม่เปลี่ยน
□ embeddingModel column มีใน soma_documents
□ reindex ทำเมื่อเปลี่ยน model เท่านั้น

Privacy:
□ ตัดสินใจแล้วว่า: Railway / Self-host / VPS
□ ถ้า sensitive: SOMA_ENCRYPTION_KEY ตั้งค่าแล้ว

Scale:
□ monitor write rate — ถ้าเกิน 1,000/day → plan migration
□ DATABASE_URL env พร้อม swap ไป PostgreSQL
```

---

## Lessons Learned

*(Copilot append ที่นี่เมื่อรัน `rrr` — ไม่ลบของเดิม)*

### Patterns ที่ดี
- iii -> xxx ก่อนทุกครั้ง
- 1 session = 1 feature
- bootstrap แยกออกมาทำให้ test ง่ายกว่า

### Anti-patterns
- Plan ใหญ่เกินไป -> แตกเป็น 1-hour chunks

---

## What NOT to Do

- No `express` / `fastify` — Hono
- No `prisma` / `typeorm` — Drizzle
- No `better-sqlite3` — Bun native
- No `jest` — Vitest
- No crash ถ้า LanceDB ไม่พร้อม
- No token plaintext
- No userId จาก client
- No data ข้าม userId
- No merge PR โดยไม่ได้รับอนุญาต

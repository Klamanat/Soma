---
date: 2026-06-13
slug: foundation-db-bootstrap
session: Step 1–6
---

# Retrospective — 2026-06-13 · Foundation

## 🎯 เป้าหมาย session นี้

วาง foundation ของ Soma: config, DB schema, SQLite + FTS5, bootstrap

## ✅ สิ่งที่ทำสำเร็จ

- `package.json` + `tsconfig.json` + `drizzle.config.ts`
- `src/db/schema.ts` — 10 tables ครบ (users, documents, edges, threads, messages, traces, token_usage, tasks, rate_limits, security_events)
- `src/db/index.ts` — Bun SQLite singleton + WAL mode + foreign keys
- `src/db/migrate.ts` — FTS5 virtual table + 3 sync triggers (INSERT/DELETE/UPDATE)
- `src/bootstrap.ts` — auto-setup ที่ run standalone ได้ (`bun run bootstrap`)
- Smoke test ผ่าน: `✓ Soma awakened — v1.0.0 @ D:\Soma\data`
- DB verified: 15 tables/virtual tables ใน soma.db

## 🐛 ปัญหาที่เจอ

### esbuild postinstall conflict

- **อาการ:** `bun install` fail ด้วย `Expected "0.27.7" but got "0.25.12"`
- **สาเหตุ:** vite มี esbuild เป็น nested dep ที่ version ต่างจาก system binary
- **แก้:** `bun install --ignore-scripts`
- **ป้องกัน:** ใส่ใน onboarding docs

## 💡 Lessons Learned

- Bootstrap แยกออกมาเป็น `src/bootstrap.ts` ที่ run standalone ได้ → ทดสอบง่าย ไม่ต้องเริ่ม server
- FTS5 sync triggers ต้องสร้างหลังจาก main tables เท่านั้น → migrate.ts แยกจาก schema.ts ถูกต้อง
- `pushSchema()` ใช้ raw SQL `CREATE TABLE IF NOT EXISTS` แทน Drizzle push → bootstrap ไม่ต้องพึ่ง drizzle-kit ตอน runtime
- WAL + `busy_timeout = 5000` สำคัญมากสำหรับ concurrent MCP + server + watcher

## 🚧 ยังค้างอยู่

- Step 7: `src/auth/tokens.ts` + `src/auth/middleware.ts`
- Step 8: `src/mcp.ts` — MCP stdio server
- Step 9–19: routes, tools, vector, indexer, web, bin, Dockerfile

## 🔮 Session ถัดไป

```
xxx → Step 7: auth layer (bcrypt tokens, Bearer middleware, brute-force lock)
```

---

## Lessons Learned (append — ไม่ลบ)

- `bun install --ignore-scripts` ใช้เมื่อมี esbuild/vite version conflict
- Bootstrap pattern: standalone runnable + imported by server/mcp = ดีกว่า inline setup

/**
 * src/watcher.ts
 *
 * Watches ink/ directory for changes using Bun's built-in fs.watch().
 * Debounces events 500ms before reindexing — only the changed file,
 * not the whole corpus.
 *
 * Usage:
 *   startWatcher(userId)   // watch continuously
 *   stopWatcher()          // clean up (tests / graceful shutdown)
 */

import { watch, existsSync } from "fs";
import { resolve, extname } from "path";
import { indexFile, removeFile } from "./indexer";

const INK_DIR_NAME = "ink";
const DEBOUNCE_MS = 500;

// ── Module state ──────────────────────────────────────────────────────────────

let watcher: ReturnType<typeof watch> | null = null;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ── Public API ────────────────────────────────────────────────────────────────

export function startWatcher(userId?: string): void {
  if (watcher) return; // already running

  const repoRoot = resolve(process.env.SOMA_REPO_ROOT ?? ".");
  const inkDir = resolve(repoRoot, INK_DIR_NAME);

  try {
    // ink/ may not exist in Docker/cloud deployments — skip silently
    if (!existsSync(inkDir)) {
      console.error(`[watcher] ink/ not found at ${inkDir} — skipping`);
      return;
    }

    watcher = watch(inkDir, { recursive: true }, (event, filename) => {
      if (!filename) return;
      if (extname(filename) !== ".md") return;

      const fullPath = resolve(inkDir, filename);

      // Cancel any pending debounce for this file
      const existing = debounceTimers.get(fullPath);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        debounceTimers.delete(fullPath);

        if (!userId) return;

        if (event === "rename") {
          // Could be create or delete — check if file still exists
          if (existsSync(fullPath)) {
            // File was created or moved here
            await indexFile(fullPath, userId, inkDir).catch((err) =>
              console.error(`[watcher] indexFile error: ${err}`),
            );
          } else {
            // File was deleted
            await removeFile(fullPath, userId).catch((err) =>
              console.error(`[watcher] removeFile error: ${err}`),
            );
          }
        } else {
          // "change" event — content modified
          await indexFile(fullPath, userId, inkDir, true).catch((err) =>
            console.error(`[watcher] indexFile error: ${err}`),
          );
        }
      }, DEBOUNCE_MS);

      debounceTimers.set(fullPath, timer);
    });

    console.error(`[watcher] watching ink/ @ ${inkDir}`);

    // Handle async errors (e.g. directory deleted after watch starts)
    watcher.on("error", (err) => {
      console.error(`[watcher] error: ${err}`);
      watcher?.close();
      watcher = null;
    });
  } catch (err) {
    // ink/ may not exist yet — not fatal
    console.error(`[watcher] could not start: ${err}`);
  }
}

export function stopWatcher(): void {
  for (const timer of debounceTimers.values()) clearTimeout(timer);
  debounceTimers.clear();
  watcher?.close();
  watcher = null;
}

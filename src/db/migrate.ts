import { sqlite } from "./index";

export function runMigrations(): void {
  // FTS5 virtual table for full-text search over soma_documents
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS soma_fts
    USING fts5(
      id UNINDEXED,
      user_id UNINDEXED,
      title,
      content,
      concepts,
      content='soma_documents',
      content_rowid='rowid'
    )
  `);

  // Keep FTS index in sync via triggers
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS soma_documents_ai
    AFTER INSERT ON soma_documents BEGIN
      INSERT INTO soma_fts(rowid, id, user_id, title, content, concepts)
      VALUES (new.rowid, new.id, new.user_id, new.title, new.content, new.concepts);
    END
  `);

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS soma_documents_ad
    AFTER DELETE ON soma_documents BEGIN
      INSERT INTO soma_fts(soma_fts, rowid, id, user_id, title, content, concepts)
      VALUES ('delete', old.rowid, old.id, old.user_id, old.title, old.content, old.concepts);
    END
  `);

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS soma_documents_au
    AFTER UPDATE ON soma_documents BEGIN
      INSERT INTO soma_fts(soma_fts, rowid, id, user_id, title, content, concepts)
      VALUES ('delete', old.rowid, old.id, old.user_id, old.title, old.content, old.concepts);
      INSERT INTO soma_fts(rowid, id, user_id, title, content, concepts)
      VALUES (new.rowid, new.id, new.user_id, new.title, new.content, new.concepts);
    END
  `);
}

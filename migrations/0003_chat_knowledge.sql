CREATE TABLE IF NOT EXISTS chat_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chat_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES chat_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  UNIQUE(document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_chat_chunks_document ON chat_chunks(document_id);
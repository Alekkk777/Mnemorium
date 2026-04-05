-- Memorium SQLite Schema - Migration 003
-- Sessioni di recall, sostituisce localStorage recall_sessions

CREATE TABLE IF NOT EXISTS recall_sessions (
    id          TEXT PRIMARY KEY,
    palace_id   TEXT NOT NULL REFERENCES palaces(id) ON DELETE CASCADE,
    started_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    total_cards INTEGER NOT NULL DEFAULT 0,
    remembered  INTEGER NOT NULL DEFAULT 0,
    forgotten   INTEGER NOT NULL DEFAULT 0,
    accuracy    REAL
);

CREATE TABLE IF NOT EXISTS recall_results (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES recall_sessions(id) ON DELETE CASCADE,
    annotation_id TEXT NOT NULL,
    rating        INTEGER NOT NULL,
    time_spent_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recall_sessions_palace_id ON recall_sessions(palace_id);
CREATE INDEX IF NOT EXISTS idx_recall_sessions_started_at ON recall_sessions(started_at);

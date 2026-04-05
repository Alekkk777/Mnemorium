-- Memorium SQLite Schema - Migration 001
-- Sostituisce localStorage (palaces JSON) e IndexedDB (images blob)

CREATE TABLE IF NOT EXISTS palaces (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS palace_images (
    id              TEXT PRIMARY KEY,
    palace_id       TEXT NOT NULL REFERENCES palaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    local_file_path TEXT,
    width           INTEGER NOT NULL DEFAULT 0,
    height          INTEGER NOT NULL DEFAULT 0,
    is_360          INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS annotations (
    id              TEXT PRIMARY KEY,
    image_id        TEXT NOT NULL REFERENCES palace_images(id) ON DELETE CASCADE,
    text            TEXT NOT NULL,
    note            TEXT,
    pos_x           REAL NOT NULL DEFAULT 0,
    pos_y           REAL NOT NULL DEFAULT 0,
    pos_z           REAL NOT NULL DEFAULT 0,
    rot_x           REAL NOT NULL DEFAULT 0,
    rot_y           REAL NOT NULL DEFAULT 0,
    rot_z           REAL NOT NULL DEFAULT 0,
    is_visible      INTEGER NOT NULL DEFAULT 1,
    is_generated    INTEGER NOT NULL DEFAULT 0,
    image_file_path TEXT,
    ai_prompt       TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_palace_images_palace_id ON palace_images(palace_id);
CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);

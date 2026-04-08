-- Mnemorium SQLite Schema - Migration 004
-- Settings key-value store, sostituisce localStorage settings

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Valori default
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('ai_provider',        '"none"'),
    ('openai_key',         '""'),
    ('gemini_key',         '""'),
    ('theme',              '"dark"'),
    ('onboarding_done',    'false'),
    ('setup_wizard_done',  'false'),
    ('show_tips',          'true');

-- Mnemorium SQLite Schema - Migration 002
-- Aggiunge campi FSRS (Free Spaced Repetition Scheduler) alle annotations

ALTER TABLE annotations ADD COLUMN fsrs_stability   REAL;
ALTER TABLE annotations ADD COLUMN fsrs_difficulty  REAL;
ALTER TABLE annotations ADD COLUMN fsrs_due         INTEGER;
ALTER TABLE annotations ADD COLUMN fsrs_state       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE annotations ADD COLUMN fsrs_reps        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE annotations ADD COLUMN fsrs_lapses      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE annotations ADD COLUMN fsrs_last_review INTEGER;

-- fsrs_state values:
-- 0 = New (mai visto)
-- 1 = Learning (in apprendimento)
-- 2 = Review (in revisione periodica)
-- 3 = Relearning (dimenticato, si reimpara)

CREATE INDEX IF NOT EXISTS idx_annotations_fsrs_due ON annotations(fsrs_due);
CREATE INDEX IF NOT EXISTS idx_annotations_fsrs_state ON annotations(fsrs_state);

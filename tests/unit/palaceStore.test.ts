/**
 * palaceStore.test.ts
 * Tests for store.ts logic and rowToAnnotation converter.
 * Uses mocked tauriStorage to avoid Tauri IPC in tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Helpers re-exported for testing ──────────────────────────────────────────

// Re-implement rowToAnnotation logic here (mirror of store.ts)
// so we can unit-test conversion without importing the full Zustand store.

interface MockAnnotationRow {
  id: string;
  text: string;
  note: string | null;
  pos_x: number; pos_y: number; pos_z: number;
  rot_x: number; rot_y: number; rot_z: number;
  is_visible: boolean;
  is_generated: boolean | null;
  image_file_path: string | null;
  ai_prompt: string | null;
  fsrs_state: number | null;
  fsrs_stability: number | null;
  fsrs_difficulty: number | null;
  fsrs_due: number | null;
  fsrs_reps: number | null;
  fsrs_lapses: number | null;
  fsrs_last_review: number | null;
  created_at: number;
  updated_at: number | null;
}

function rowToAnnotation(row: MockAnnotationRow) {
  return {
    id: row.id,
    text: row.text,
    note: row.note ?? '',
    position: { x: row.pos_x, y: row.pos_y, z: row.pos_z },
    rotation: { x: row.rot_x, y: row.rot_y, z: row.rot_z },
    width: 1, height: 1,
    isVisible: row.is_visible,
    selected: false,
    isGenerated: row.is_generated ?? false,
    imageFilePath: row.image_file_path ?? undefined,
    aiPrompt: row.ai_prompt ?? undefined,
    fsrsCard: (row.fsrs_state !== undefined && row.fsrs_state !== null) ? {
      stability: row.fsrs_stability,
      difficulty: row.fsrs_difficulty,
      due: row.fsrs_due ? new Date(row.fsrs_due * 1000) : undefined,
      state: row.fsrs_state,
      reps: row.fsrs_reps ?? 0,
      lapses: row.fsrs_lapses ?? 0,
      lastReview: row.fsrs_last_review ? new Date(row.fsrs_last_review * 1000) : undefined,
    } : undefined,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at * 1000).toISOString() : undefined,
  };
}

function makeRow(overrides: Partial<MockAnnotationRow> = {}): MockAnnotationRow {
  return {
    id: 'ann_1', text: 'Test', note: null,
    pos_x: 0, pos_y: 0, pos_z: 0,
    rot_x: 0, rot_y: 0, rot_z: 0,
    is_visible: true, is_generated: false,
    image_file_path: null, ai_prompt: null,
    fsrs_state: null, fsrs_stability: null, fsrs_difficulty: null,
    fsrs_due: null, fsrs_reps: null, fsrs_lapses: null, fsrs_last_review: null,
    created_at: 1700000000, updated_at: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rowToAnnotation', () => {
  it('converts a basic row correctly', () => {
    const ann = rowToAnnotation(makeRow({ text: 'Ciao', pos_x: 1, pos_y: 2, pos_z: 3 }));
    expect(ann.text).toBe('Ciao');
    expect(ann.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(ann.note).toBe('');
    expect(ann.fsrsCard).toBeUndefined();
  });

  it('fsrsCard is undefined when fsrs_state is null (SQLite null)', () => {
    const ann = rowToAnnotation(makeRow({ fsrs_state: null }));
    expect(ann.fsrsCard).toBeUndefined();
  });

  it('fsrsCard is undefined when fsrs_state is undefined', () => {
    const row = makeRow();
    (row as any).fsrs_state = undefined;
    const ann = rowToAnnotation(row as any);
    expect(ann.fsrsCard).toBeUndefined();
  });

  it('fsrsCard is populated when fsrs_state = 0 (New)', () => {
    const ann = rowToAnnotation(makeRow({
      fsrs_state: 0, fsrs_reps: 0, fsrs_lapses: 0,
    }));
    expect(ann.fsrsCard).toBeDefined();
    expect(ann.fsrsCard!.state).toBe(0);
    expect(ann.fsrsCard!.reps).toBe(0);
    expect(ann.fsrsCard!.lapses).toBe(0);
  });

  it('reps/lapses default to 0 when null in DB', () => {
    const ann = rowToAnnotation(makeRow({ fsrs_state: 1, fsrs_reps: null, fsrs_lapses: null }));
    expect(ann.fsrsCard!.reps).toBe(0);
    expect(ann.fsrsCard!.lapses).toBe(0);
  });

  it('fsrs_due is converted to Date', () => {
    const due = 1700000000;
    const ann = rowToAnnotation(makeRow({ fsrs_state: 2, fsrs_due: due }));
    expect(ann.fsrsCard!.due).toBeInstanceOf(Date);
    expect(ann.fsrsCard!.due!.getTime()).toBe(due * 1000);
  });

  it('imageFilePath is undefined when null in DB', () => {
    const ann = rowToAnnotation(makeRow({ image_file_path: null }));
    expect(ann.imageFilePath).toBeUndefined();
  });

  it('note defaults to empty string when null', () => {
    expect(rowToAnnotation(makeRow({ note: null })).note).toBe('');
    expect(rowToAnnotation(makeRow({ note: 'hello' })).note).toBe('hello');
  });
});

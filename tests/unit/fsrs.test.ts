import { describe, it, expect } from 'vitest';
import {
  scheduleAnnotation,
  getDueAnnotations,
  countDueAnnotations,
  getRetentionAtTime,
} from '@/lib/fsrs';
import type { Annotation } from '@/types';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'ann_test',
    text: 'Test',
    note: '',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    width: 1,
    height: 1,
    isVisible: true,
    selected: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('FSRS scheduleAnnotation', () => {
  it('schedules a new card with rating Good (3)', () => {
    const ann = makeAnnotation();
    const result = scheduleAnnotation(ann, 3);

    expect(result.updatedCard.state).toBeGreaterThanOrEqual(1); // Not New anymore
    expect(result.updatedCard.reps).toBe(1);
    expect(result.nextDue).toBeInstanceOf(Date);
  });

  it('increases reps after each successful review', () => {
    const ann = makeAnnotation();
    const first = scheduleAnnotation(ann, 3);
    const secondAnn = makeAnnotation({ fsrsCard: first.updatedCard });
    const second = scheduleAnnotation(secondAnn, 3);

    expect(second.updatedCard.reps).toBe(2);
  });

  it('increases lapses after Again (1) on a Review-state card', () => {
    // FSRS-5 spec: lapses only increment when Again is given in Review state (state=2)
    const reviewCard = makeAnnotation({
      fsrsCard: { state: 2, reps: 3, lapses: 0, stability: 5, due: new Date() },
    });
    const again = scheduleAnnotation(reviewCard, 1);

    expect(again.updatedCard.lapses).toBe(1);
  });

  it('Easy (4) gives longer interval than Good (3)', () => {
    const ann = makeAnnotation();
    const good = scheduleAnnotation(ann, 3);
    const easy = scheduleAnnotation(makeAnnotation(), 4);

    expect(easy.interval).toBeGreaterThanOrEqual(good.interval);
  });
});

describe('getDueAnnotations', () => {
  it('returns all New annotations as due', () => {
    const ann = makeAnnotation({ fsrsCard: { state: 0, reps: 0, lapses: 0 } });
    const result = getDueAnnotations([ann]);
    expect(result).toHaveLength(1);
  });

  it('returns overdue annotations as due', () => {
    const pastDue = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const ann = makeAnnotation({
      fsrsCard: { state: 2, reps: 3, lapses: 0, due: pastDue },
    });
    expect(getDueAnnotations([ann])).toHaveLength(1);
  });

  it('does not return future-scheduled annotations', () => {
    const futureDue = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const ann = makeAnnotation({
      fsrsCard: { state: 2, reps: 3, lapses: 0, due: futureDue },
    });
    expect(getDueAnnotations([ann])).toHaveLength(0);
  });
});

describe('countDueAnnotations', () => {
  it('counts correctly', () => {
    const anns = [
      makeAnnotation({ id: '1' }),
      makeAnnotation({ id: '2', fsrsCard: { state: 2, reps: 5, lapses: 0, due: new Date(Date.now() + 1e9) } }),
    ];
    expect(countDueAnnotations(anns)).toBe(1);
  });
});

describe('getRetentionAtTime', () => {
  it('returns 0 if no fsrsCard', () => {
    expect(getRetentionAtTime(undefined)).toBe(0);
  });

  it('returns ~1.0 immediately after review', () => {
    const now = new Date();
    const card = {
      state: 2, reps: 1, lapses: 0,
      stability: 10,
      lastReview: new Date(now.getTime() - 1),
    };
    const r = getRetentionAtTime(card, now);
    expect(r).toBeGreaterThan(0.99);
  });

  it('decays over time', () => {
    const lastReview = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const card = { state: 2, reps: 3, lapses: 0, stability: 10, lastReview };
    const r = getRetentionAtTime(card);
    expect(r).toBeLessThan(0.99);
    expect(r).toBeGreaterThan(0);
  });
});

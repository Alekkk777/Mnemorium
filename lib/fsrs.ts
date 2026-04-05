/**
 * fsrs.ts
 * Wrapper around ts-fsrs for Memorium.
 * Provides helper functions for scheduling annotations.
 */

import { FSRS, createEmptyCard, Rating, Card, RecordLog, State } from 'ts-fsrs';
import { Annotation, FSRSCard, FSRSRating } from '@/types';

const f = new FSRS({});

// ─── Convert between Memorium FSRSCard and ts-fsrs Card ───────────────────────

function memoriumCardToFSRS(fsrsCard?: FSRSCard): Card {
  if (!fsrsCard) return createEmptyCard();

  return {
    due: fsrsCard.due ?? new Date(),
    stability: fsrsCard.stability ?? 0,
    difficulty: fsrsCard.difficulty ?? 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: fsrsCard.reps ?? 0,
    lapses: fsrsCard.lapses ?? 0,
    state: fsrsCard.state as State ?? State.New,
    last_review: fsrsCard.lastReview,
  };
}

function fsrsCardToMemoriumCard(card: Card): FSRSCard {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due,
    state: card.state as number,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review,
  };
}

// ─── Map Memorium ratings to ts-fsrs Rating ───────────────────────────────────

function toFSRSRating(rating: FSRSRating): Rating {
  switch (rating) {
    case 1: return Rating.Again;
    case 2: return Rating.Hard;
    case 3: return Rating.Good;
    case 4: return Rating.Easy;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ScheduleResult {
  updatedCard: FSRSCard;
  /** Next review date */
  nextDue: Date;
  /** Interval in days */
  interval: number;
}

/**
 * Schedule an annotation after a recall rating.
 * Returns the updated FSRSCard to persist.
 */
export function scheduleAnnotation(
  annotation: Annotation,
  rating: FSRSRating,
  reviewedAt: Date = new Date()
): ScheduleResult {
  const card = memoriumCardToFSRS(annotation.fsrsCard);
  const fsrsRating = toFSRSRating(rating);

  const scheduling: RecordLog = f.repeat(card, reviewedAt);
  const updated = scheduling[fsrsRating].card;

  return {
    updatedCard: fsrsCardToMemoriumCard(updated),
    nextDue: updated.due,
    interval: updated.scheduled_days,
  };
}

/**
 * Returns annotations that are due for review (state=New or due <= now).
 */
export function getDueAnnotations(annotations: Annotation[]): Annotation[] {
  const now = new Date();
  return annotations.filter((ann) => {
    const card = ann.fsrsCard;
    if (!card || card.state === 0) return true; // New
    if (!card.due) return true;
    return card.due <= now;
  });
}

/**
 * Returns number of annotations due today.
 */
export function countDueAnnotations(annotations: Annotation[]): number {
  return getDueAnnotations(annotations).length;
}

/**
 * Returns the retention probability for an annotation at a given time.
 * Uses FSRS forgetting curve: R = e^(-t/S)
 */
export function getRetentionAtTime(fsrsCard: FSRSCard | undefined, at: Date = new Date()): number {
  if (!fsrsCard || !fsrsCard.stability || !fsrsCard.lastReview) return 0;
  const elapsed = (at.getTime() - fsrsCard.lastReview.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-elapsed / fsrsCard.stability);
}

/**
 * Returns a simple label for the annotation's FSRS state.
 */
export function fsrsStateLabel(state: number): string {
  switch (state) {
    case 0: return 'Nuovo';
    case 1: return 'In apprendimento';
    case 2: return 'In revisione';
    case 3: return 'Da reimparare';
    default: return 'Sconosciuto';
  }
}

export { Rating as FSRSRatingEnum, State as FSRSState };

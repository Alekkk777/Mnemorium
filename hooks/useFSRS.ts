/**
 * useFSRS.ts
 * Hook for FSRS scheduling operations within components.
 */

import { useMemo } from 'react';
import { usePalaceStore } from '@/lib/store';
import {
  getDueAnnotations,
  countDueAnnotations,
  scheduleAnnotation,
  getRetentionAtTime,
} from '@/lib/fsrs';
import { Annotation, FSRSRating } from '@/types';

export function useFSRS(palaceId?: string) {
  const { palaces, updateAnnotation } = usePalaceStore();

  const allAnnotations = useMemo(() => {
    if (!palaceId) {
      return palaces.flatMap((p) => p.images.flatMap((i) => i.annotations));
    }
    const palace = palaces.find((p) => p._id === palaceId);
    return palace?.images.flatMap((i) => i.annotations) ?? [];
  }, [palaces, palaceId]);

  const dueAnnotations = useMemo(() => getDueAnnotations(allAnnotations), [allAnnotations]);
  const dueCount = dueAnnotations.length;

  // Find next due date across all annotations
  const nextReviewDate = useMemo(() => {
    const future = allAnnotations
      .filter((a) => a.fsrsCard?.due && a.fsrsCard.due > new Date())
      .map((a) => a.fsrsCard!.due!.getTime());
    if (future.length === 0) return null;
    return new Date(Math.min(...future));
  }, [allAnnotations]);

  async function recordRating(
    palaceId: string,
    imageId: string,
    annotation: Annotation,
    rating: FSRSRating
  ) {
    const { updatedCard } = scheduleAnnotation(annotation, rating);
    await updateAnnotation(palaceId, imageId, annotation.id, {
      fsrsCard: updatedCard,
    });
    return updatedCard;
  }

  return {
    dueCount,
    dueAnnotations,
    nextReviewDate,
    recordRating,
    getRetention: (annotation: Annotation) =>
      getRetentionAtTime(annotation.fsrsCard),
  };
}

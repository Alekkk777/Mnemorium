/**
 * RecallModeNew.tsx
 * Full-screen FSRS recall experience.
 * Replaces RecallMode.tsx — uses FSRS due queue instead of binary recall.
 */
import { useState, useCallback, useRef } from 'react';
import { Palace, FSRSRating } from '@/types';
import { getDueAnnotations } from '@/lib/fsrs';
import { useFSRS } from '@/hooks/useFSRS';
import { X, Brain, Target } from 'lucide-react';
import RecallAnnotationCard from './RecallAnnotationCard';

interface RecallModeNewProps {
  palace: Palace;
  onClose: () => void;
  onComplete: (results: RecallModeNewResults) => void;
}

export interface RecallModeNewResults {
  totalAnnotations: number;
  remembered: number;   // rating >= 3
  forgotten: number;    // rating <= 2
  skipped: number;
  accuracy: number;
  duration: number;
  ratingCounts: Record<FSRSRating, number>;
}

type Phase = 'splash' | 'recall' | 'done';

interface RatingEntry {
  annotationId: string;
  rating: FSRSRating;
}

export default function RecallModeNew({ palace, onClose, onComplete }: RecallModeNewProps) {
  const { recordRating } = useFSRS(palace._id);

  // Freeze the queue at mount — do NOT recompute it as the store updates mid-session
  const [allAnnotations] = useState(() =>
    palace.images.flatMap(img => img.annotations.map(ann => ({ ann, imageId: img.id })))
  );
  const [dueQueue] = useState(() => getDueAnnotations(allAnnotations.map(x => x.ann)));

  const [phase, setPhase] = useState<Phase>('splash');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [skipped, setSkipped] = useState(0);
  const skippedRef = useRef(0);
  const [startTime] = useState(Date.now());

  // imageId lookup is stable because allAnnotations is frozen
  const getImageId = useCallback((annotationId: string): string => {
    return allAnnotations.find(x => x.ann.id === annotationId)?.imageId ?? '';
  }, [allAnnotations]);

  const handleRate = useCallback(async (rating: FSRSRating) => {
    const annotation = dueQueue[currentIndex];
    if (!annotation) return;

    const imageId = getImageId(annotation.id);
    if (imageId) {
      await recordRating(palace._id, imageId, annotation, rating).catch(() => {});
    }

    const newRatings = [...ratings, { annotationId: annotation.id, rating }];
    setRatings(newRatings);

    if (currentIndex + 1 >= dueQueue.length) {
      // Compute results immediately with the complete ratings list (no stale closure)
      const ratingCounts: Record<FSRSRating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      let remembered = 0;
      let forgotten = 0;
      for (const { rating: r } of newRatings) {
        ratingCounts[r]++;
        if (r >= 3) remembered++;
        else forgotten++;
      }
      const finalSkipped = skippedRef.current;
      const rated = dueQueue.length - finalSkipped;
      const results: RecallModeNewResults = {
        totalAnnotations: dueQueue.length,
        remembered,
        forgotten,
        skipped: finalSkipped,
        accuracy: rated > 0 ? (remembered / rated) * 100 : 0,
        duration: Date.now() - startTime,
        ratingCounts,
      };
      setPhase('done');
      onComplete(results);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, dueQueue, ratings, palace._id, getImageId, recordRating, startTime, onComplete]);

  const handleSkip = useCallback(() => {
    skippedRef.current += 1;
    setSkipped(s => s + 1);
    if (currentIndex + 1 >= dueQueue.length) {
      // All remaining were skipped — compute results
      const ratingCounts: Record<FSRSRating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      let remembered = 0;
      let forgotten = 0;
      for (const { rating: r } of ratings) {
        ratingCounts[r]++;
        if (r >= 3) remembered++;
        else forgotten++;
      }
      const finalSkipped = skippedRef.current;
      const rated = dueQueue.length - finalSkipped;
      const results: RecallModeNewResults = {
        totalAnnotations: dueQueue.length,
        remembered,
        forgotten,
        skipped: finalSkipped,
        accuracy: rated > 0 ? (remembered / rated) * 100 : 0,
        duration: Date.now() - startTime,
        ratingCounts,
      };
      setPhase('done');
      onComplete(results);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, dueQueue.length, ratings, startTime, onComplete]);

  // ── Splash ──────────────────────────────────────────────────────────────────
  if (phase === 'splash') {
    const totalAnnotations = allAnnotations.length;
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-muted" />
        </button>

        <div className="text-center max-w-md px-8">
          <div className="mb-8">
            <div className="relative inline-block">
              <Target className="w-24 h-24 text-accent mx-auto mb-4" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">Recall Mode</h1>
            <p className="text-muted text-lg mb-2">
              {palace.name}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-surface rounded-xl">
              <p className="text-2xl font-bold text-accent">{dueQueue.length}</p>
              <p className="text-xs text-muted mt-1">To review</p>
            </div>
            <div className="p-4 bg-surface rounded-xl">
              <p className="text-2xl font-bold text-foreground">{totalAnnotations}</p>
              <p className="text-xs text-muted mt-1">Total</p>
            </div>
            <div className="p-4 bg-surface rounded-xl">
              <p className="text-2xl font-bold text-success">
                {totalAnnotations - dueQueue.length}
              </p>
              <p className="text-xs text-muted mt-1">Up to date</p>
            </div>
          </div>

          {dueQueue.length === 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
                <p className="text-success font-medium mb-1">All caught up!</p>
                <p className="text-sm text-muted">
                  You have no annotations to review right now. Come back tomorrow!
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-surface text-foreground rounded-xl hover:bg-white/10 transition-colors"
              >
                Back to palace
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setPhase('recall')}
                className="w-full py-4 bg-accent text-white rounded-xl hover:bg-accent-hover transition-all font-semibold text-lg shadow-lg"
              >
                Start Review
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 bg-surface text-muted hover:text-foreground rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Recall ───────────────────────────────────────────────────────────────────
  if (phase === 'recall') {
    const annotation = dueQueue[currentIndex];
    if (!annotation) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-foreground">{palace.name}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Card */}
        <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full">
          <RecallAnnotationCard
            annotation={annotation}
            onRate={handleRate}
            onSkip={handleSkip}
            index={currentIndex}
            total={dueQueue.length}
          />
        </div>
      </div>
    );
  }

  // ── Done (onComplete called synchronously from handleRate) ──────────────────
  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto" />
      </div>
    </div>
  );
}

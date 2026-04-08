/**
 * PalaceDashboard.tsx
 * Homepage shown when no palace is selected.
 * Shows palace grid with FSRS due counts.
 */
import { useMemo, useState, useEffect } from 'react';
import { Brain, Plus, Target, Image as ImageIcon, BookOpen } from 'lucide-react';
import { usePalaceStore } from '@/lib/store';
import { getDueAnnotations } from '@/lib/fsrs';
import { getImageUrl } from '@/lib/tauriImageStorage';
import { Palace } from '@/types';

interface PalaceDashboardProps {
  onCreatePalace: () => void;
  onSelectPalace: (palaceId: string) => void;
  onStartRecall: (palaceId: string) => void;
}

function PalaceCard({
  palace,
  onSelect,
  onRecall,
}: {
  palace: Palace;
  onSelect: () => void;
  onRecall: () => void;
}) {
  const allAnnotations = useMemo(
    () => palace.images.flatMap(img => img.annotations),
    [palace.images]
  );
  const dueCount = useMemo(() => getDueAnnotations(allAnnotations).length, [allAnnotations]);
  const totalAnnotations = allAnnotations.length;

  // Use first image as thumbnail
  const firstImage = palace.images[0];
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (firstImage?.localFilePath) {
      getImageUrl(firstImage.localFilePath).then(setThumbUrl).catch(() => {});
    } else {
      setThumbUrl(null);
    }
  }, [firstImage?.localFilePath]);

  return (
    <div
      className="group relative p-4 bg-surface border border-white/10 rounded-xl hover:border-accent/40 transition-all cursor-pointer"
      onClick={onSelect}
    >
      {/* Due badge */}
      {dueCount > 0 && (
        <div className="absolute -top-2 -right-2 z-10 px-2 py-0.5 bg-accent text-white text-xs font-bold rounded-full shadow-lg">
          {dueCount} today
        </div>
      )}

      {/* Thumbnail */}
      <div className="w-full h-32 bg-background rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {thumbUrl ? (
          <img src={thumbUrl} alt={firstImage?.name} className="w-full h-full object-cover" />
        ) : firstImage ? (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white/20" />
          </div>
        ) : (
          <Brain className="w-12 h-12 text-white/10" />
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-foreground truncate mb-1">{palace.name}</h3>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {palace.images.length} images
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          {totalAnnotations} notes
        </span>
      </div>

      {/* Recall button (shown on hover if there are due annotations) */}
      {dueCount > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onRecall(); }}
          className="mt-3 w-full py-1.5 bg-accent/20 text-accent text-xs font-medium rounded-lg hover:bg-accent hover:text-white transition-colors flex items-center justify-center gap-1"
        >
          <Target className="w-3 h-3" />
          Review {dueCount} annotations
        </button>
      )}
    </div>
  );
}

export default function PalaceDashboard({
  onCreatePalace,
  onSelectPalace,
  onStartRecall,
}: PalaceDashboardProps) {
  const { palaces } = usePalaceStore();

  const totalDue = useMemo(() => {
    return palaces.reduce((sum, palace) => {
      const annotations = palace.images.flatMap(img => img.annotations);
      return sum + getDueAnnotations(annotations).length;
    }, 0);
  }, [palaces]);

  if (palaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md px-8">
          <Brain className="w-20 h-20 text-accent/30 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Start your journey
          </h2>
          <p className="text-muted mb-8">
            Create your first memory palace to start using the method of loci.
          </p>
          <button
            onClick={onCreatePalace}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors font-semibold mx-auto"
          >
            <Plus className="w-5 h-5" />
            Create First Palace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Daily review bar */}
      {totalDue > 0 && (
        <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-accent" />
            <div>
              <p className="font-semibold text-foreground">
                {totalDue} annotations to review today
              </p>
              <p className="text-xs text-muted">Recommended review session</p>
            </div>
          </div>
          <button
            onClick={() => {
              // Start recall for the palace with most due annotations
              const mostDue = palaces.reduce((best, palace) => {
                const count = getDueAnnotations(
                  palace.images.flatMap(img => img.annotations)
                ).length;
                const bestCount = getDueAnnotations(
                  best.images.flatMap(img => img.annotations)
                ).length;
                return count > bestCount ? palace : best;
              });
              onStartRecall(mostDue._id);
            }}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            Start
          </button>
        </div>
      )}

      {/* Palace grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Your palaces</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {palaces.map(palace => (
            <PalaceCard
              key={palace._id}
              palace={palace}
              onSelect={() => onSelectPalace(palace._id)}
              onRecall={() => onStartRecall(palace._id)}
            />
          ))}
          <button
            onClick={onCreatePalace}
            className="p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-accent/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted hover:text-foreground h-full min-h-[180px]"
          >
            <Plus className="w-8 h-8" />
            <span className="text-sm font-medium">New Palace</span>
          </button>
        </div>
      </div>
    </div>
  );
}

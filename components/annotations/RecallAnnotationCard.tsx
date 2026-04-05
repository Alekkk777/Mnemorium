import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/tauriImageStorage';
import { Annotation, FSRSRating } from '@/types';

interface RecallAnnotationCardProps {
  annotation: Annotation;
  onRate: (rating: FSRSRating) => void;
  index: number;
  total: number;
}

const RATINGS: { rating: FSRSRating; label: string; color: string; key: string }[] = [
  { rating: 1, label: 'Ancora', color: 'bg-danger hover:bg-red-600', key: '1' },
  { rating: 2, label: 'Difficile', color: 'bg-warning hover:bg-amber-600', key: '2' },
  { rating: 3, label: 'Bene', color: 'bg-success hover:bg-emerald-600', key: '3' },
  { rating: 4, label: 'Facile', color: 'bg-accent hover:bg-accent-hover', key: '4' },
];

export default function RecallAnnotationCard({
  annotation,
  onRate,
  index,
  total,
}: RecallAnnotationCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Reset when annotation changes
  useEffect(() => {
    setRevealed(false);
    setImageUrl(null);

    if (annotation.imageFilePath) {
      getImageUrl(annotation.imageFilePath)
        .then(setImageUrl)
        .catch(() => setImageUrl(annotation.imageUrl ?? null));
    } else if (annotation.imageUrl) {
      setImageUrl(annotation.imageUrl);
    }
  }, [annotation.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!revealed) { e.preventDefault(); setRevealed(true); }
        return;
      }
      if (!revealed) return;
      const r = RATINGS.find(r => r.key === e.key);
      if (r) { e.preventDefault(); onRate(r.rating); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [revealed, onRate]);

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>{index + 1} / {total}</span>
          <span>{Math.round(((index) / total) * 100)}%</span>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full">
          <div
            className="h-1 bg-accent rounded-full transition-all duration-300"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="p-6 bg-surface rounded-xl border border-white/10 mb-4">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Domanda</p>
          <p className="text-xl font-semibold text-foreground leading-relaxed">
            {annotation.text}
          </p>
        </div>

        {/* Reveal */}
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 bg-white/5 border border-white/20 text-muted hover:text-foreground hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"
          >
            Rivela risposta <span className="ml-1 opacity-50">(Spazio)</span>
          </button>
        ) : (
          <div className="space-y-4">
            {/* Answer */}
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl">
              <p className="text-xs text-accent uppercase tracking-wider mb-2">Risposta</p>
              <p className="text-foreground leading-relaxed">
                {annotation.note || <span className="text-muted italic">Nessuna nota</span>}
              </p>
            </div>

            {/* Annotation image */}
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Immagine annotazione"
                className="w-full max-h-40 object-contain rounded-lg bg-surface"
              />
            )}

            {/* Rating buttons */}
            <div>
              <p className="text-xs text-muted text-center mb-3">
                Come è andata? <span className="opacity-50">(usa 1–4)</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                {RATINGS.map(({ rating, label, color, key }) => (
                  <button
                    key={rating}
                    onClick={() => onRate(rating)}
                    className={`flex flex-col items-center py-3 px-2 rounded-lg text-white font-semibold text-sm transition-colors ${color}`}
                  >
                    <span className="text-lg leading-none mb-1">{key}</span>
                    <span className="text-xs font-normal">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

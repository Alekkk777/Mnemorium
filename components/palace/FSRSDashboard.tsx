/**
 * FSRSDashboard.tsx
 * FSRS statistics panel for a palace.
 * Replaces RecallStatsView.tsx.
 */
import { useMemo } from 'react';
import { TrendingUp, Calendar, Target, BookOpen } from 'lucide-react';
import { Palace, Annotation } from '@/types';
import { getDueAnnotations, getRetentionAtTime } from '@/lib/fsrs';

interface FSRSDashboardProps {
  palace: Palace;
}

// FSRS state names
const STATE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Nuovo', color: 'text-muted' },
  1: { label: 'In studio', color: 'text-warning' },
  2: { label: 'In ripasso', color: 'text-success' },
  3: { label: 'Ripassato', color: 'text-accent' },
};

function RetentionBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90 ? 'bg-success' : pct >= 70 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full">
        <div
          className={`h-1.5 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function FSRSDashboard({ palace }: FSRSDashboardProps) {
  const allAnnotations = useMemo(
    () => palace.images.flatMap(img => img.annotations),
    [palace.images]
  );

  const dueAnnotations = useMemo(() => getDueAnnotations(allAnnotations), [allAnnotations]);
  const dueCount = dueAnnotations.length;

  // Count by FSRS state
  const stateCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const ann of allAnnotations) {
      const state = ann.fsrsCard?.state ?? 0;
      counts[state] = (counts[state] ?? 0) + 1;
    }
    return counts;
  }, [allAnnotations]);

  // Next review date across all annotations
  const nextReviewDate = useMemo(() => {
    const future = allAnnotations
      .filter(a => a.fsrsCard?.due && a.fsrsCard.due > new Date())
      .map(a => a.fsrsCard!.due!.getTime());
    if (future.length === 0) return null;
    return new Date(Math.min(...future));
  }, [allAnnotations]);

  const totalAnnotations = allAnnotations.length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-surface rounded-lg">
          <p className="text-2xl font-bold text-accent">{dueCount}</p>
          <p className="text-xs text-muted mt-0.5">Da ripassare</p>
        </div>
        <div className="p-3 bg-surface rounded-lg">
          <p className="text-2xl font-bold text-foreground">{totalAnnotations}</p>
          <p className="text-xs text-muted mt-0.5">Totale</p>
        </div>
      </div>

      {/* Next review */}
      {nextReviewDate && (
        <div className="flex items-center gap-2 p-3 bg-surface rounded-lg">
          <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
          <div>
            <p className="text-xs text-muted">Prossimo ripasso</p>
            <p className="text-sm font-medium text-foreground">
              {nextReviewDate.toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      )}

      {/* State distribution */}
      {totalAnnotations > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Distribuzione FSRS</p>
          <div className="space-y-2">
            {Object.entries(stateCounts).map(([state, count]) => {
              const stateNum = Number(state);
              const info = STATE_LABELS[stateNum] ?? { label: 'Sconosciuto', color: 'text-muted' };
              const pct = totalAnnotations > 0 ? (count / totalAnnotations) * 100 : 0;
              return (
                <div key={state} className="flex items-center gap-2">
                  <span className={`text-xs w-20 flex-shrink-0 ${info.color}`}>{info.label}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                    <div
                      className="h-1.5 rounded-full bg-accent/60 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Annotations table */}
      {allAnnotations.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Annotazioni</p>
          <div className="space-y-2">
            {allAnnotations.slice(0, 20).map(ann => {
              const state = ann.fsrsCard?.state ?? 0;
              const info = STATE_LABELS[state] ?? STATE_LABELS[0];
              const retention = getRetentionAtTime(ann.fsrsCard);
              const dueDate = ann.fsrsCard?.due;
              const isOverdue = dueDate && dueDate <= new Date();

              return (
                <div
                  key={ann.id}
                  className="p-3 bg-surface rounded-lg border border-white/5"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm text-foreground truncate flex-1 mr-2">
                      {ann.text}
                    </p>
                    <span className={`text-xs flex-shrink-0 ${info.color}`}>{info.label}</span>
                  </div>
                  <RetentionBar value={retention} />
                  {dueDate && (
                    <p className={`text-xs mt-1 ${isOverdue ? 'text-danger' : 'text-muted'}`}>
                      {isOverdue ? 'Scaduto: ' : 'Prossimo: '}
                      {dueDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              );
            })}
            {allAnnotations.length > 20 && (
              <p className="text-xs text-muted text-center py-2">
                ... e altre {allAnnotations.length - 20} annotazioni
              </p>
            )}
          </div>
        </div>
      )}

      {totalAnnotations === 0 && (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-muted">Nessuna annotazione ancora.</p>
          <p className="text-xs text-muted mt-1">Aggiungi annotazioni nel viewer 3D.</p>
        </div>
      )}
    </div>
  );
}

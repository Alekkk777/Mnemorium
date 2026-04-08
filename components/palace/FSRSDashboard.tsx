/**
 * FSRSDashboard.tsx
 * FSRS statistics panel for a palace.
 * Shows annotation-level FSRS state + real session history from SQLite.
 */
import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Calendar, Target, BookOpen, Trophy, BarChart3 } from 'lucide-react';
import { Palace } from '@/types';
import { getDueAnnotations, getRetentionAtTime } from '@/lib/fsrs';

interface FSRSDashboardProps {
  palace: Palace;
}

// FSRS state names
const STATE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'New', color: 'text-muted' },
  1: { label: 'Learning', color: 'text-warning' },
  2: { label: 'Reviewing', color: 'text-success' },
  3: { label: 'Reviewed', color: 'text-accent' },
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

interface SessionRow {
  id: string;
  palace_id: string;
  started_at: number;
  ended_at: number | null;
  total_cards: number;
  remembered: number;
  forgotten: number;
  accuracy: number | null;
}

interface PalaceStats {
  total_sessions: number;
  average_accuracy: number;
  best_accuracy: number;
  last_session_date: number | null;
  total_due: number;
}

export default function FSRSDashboard({ palace }: FSRSDashboardProps) {
  const allAnnotations = useMemo(
    () => palace.images.flatMap(img => img.annotations),
    [palace.images]
  );

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [palaceStats, setPalaceStats] = useState<PalaceStats | null>(null);

  useEffect(() => {
    if (!(window as any).__TAURI__) return;
    async function loadStats() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const inv = invoke as (cmd: string, a?: unknown) => Promise<unknown>;
        const [rows, stats] = await Promise.all([
          inv('get_recent_sessions', { palaceId: palace._id, limit: 10 }) as Promise<SessionRow[]>,
          inv('get_palace_recall_stats', { palaceId: palace._id }) as Promise<PalaceStats>,
        ]);
        setSessions(rows);
        setPalaceStats(stats);
      } catch { /* non-critical */ }
    }
    loadStats();
  }, [palace._id]);

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
          <p className="text-xs text-muted mt-0.5">To review</p>
        </div>
        <div className="p-3 bg-surface rounded-lg">
          <p className="text-2xl font-bold text-foreground">{totalAnnotations}</p>
          <p className="text-xs text-muted mt-0.5">Total</p>
        </div>
      </div>

      {/* Next review */}
      {nextReviewDate && (
        <div className="flex items-center gap-2 p-3 bg-surface rounded-lg">
          <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
          <div>
            <p className="text-xs text-muted">Next review</p>
            <p className="text-sm font-medium text-foreground">
              {nextReviewDate.toLocaleDateString('en-US', {
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
          <p className="text-xs text-muted uppercase tracking-wider mb-3">FSRS Distribution</p>
          <div className="space-y-2">
            {Object.entries(stateCounts).map(([state, count]) => {
              const stateNum = Number(state);
              const info = STATE_LABELS[stateNum] ?? { label: 'Unknown', color: 'text-muted' };
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
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Annotations</p>
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
                      {isOverdue ? 'Overdue: ' : 'Next: '}
                      {dueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              );
            })}
            {allAnnotations.length > 20 && (
              <p className="text-xs text-muted text-center py-2">
                ... and {allAnnotations.length - 20} more annotations
              </p>
            )}
          </div>
        </div>
      )}

      {/* Session history from SQLite */}
      {palaceStats && palaceStats.total_sessions > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Sessioni
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 bg-surface rounded-lg">
              <p className="text-lg font-bold text-accent">{palaceStats.total_sessions}</p>
              <p className="text-[11px] text-muted">Total sessions</p>
            </div>
            <div className="p-2.5 bg-surface rounded-lg">
              <p className="text-lg font-bold text-success">
                {palaceStats.best_accuracy.toFixed(0)}%
              </p>
              <p className="text-[11px] text-muted">Best</p>
            </div>
          </div>

          {sessions.length > 0 && (
            <div className="space-y-1.5">
              {sessions.map((s, i) => {
                const acc = s.accuracy ?? 0;
                const color = acc >= 80 ? 'text-success' : acc >= 60 ? 'text-warning' : 'text-danger';
                return (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-surface rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        #{sessions.length - i}
                      </p>
                      <p className="text-[11px] text-muted">
                        {new Date(s.started_at * 1000).toLocaleDateString('en-US', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${color}`}>{acc.toFixed(0)}%</p>
                      <p className="text-[11px] text-muted">{s.remembered}/{s.total_cards}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {totalAnnotations === 0 && (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-muted">No annotations yet.</p>
          <p className="text-xs text-muted mt-1">Add annotations in the 3D viewer.</p>
        </div>
      )}
    </div>
  );
}

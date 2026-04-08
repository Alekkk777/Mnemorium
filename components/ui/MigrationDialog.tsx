/**
 * MigrationDialog.tsx
 * Shows progress while migrating data from the web PWA to the Tauri SQLite database.
 * Shown once at first launch when old localStorage data is detected.
 */

import { useEffect, useState } from 'react';
import { isMigrationNeeded, runMigration, MigrationProgressCallback } from '@/lib/migration';
import { usePalaceStore } from '@/lib/store';
import { Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface MigrationDialogProps {
  onComplete: () => void;
}

type Phase = 'detecting' | 'confirming' | 'running' | 'done' | 'error' | 'skip';

export default function MigrationDialog({ onComplete }: MigrationDialogProps) {
  const [phase, setPhase] = useState<Phase>('detecting');
  const [step, setStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ palaces: number; images: number; annotations: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { loadPalaces } = usePalaceStore();

  useEffect(() => {
    async function check() {
      const needed = await isMigrationNeeded().catch(() => false);
      setPhase(needed ? 'confirming' : 'skip');
      if (!needed) onComplete();
    }
    check();
  }, []);

  async function startMigration() {
    setPhase('running');
    const cb: MigrationProgressCallback = (s, p) => {
      setStep(s);
      setProgress(p);
    };
    try {
      const res = await runMigration(cb);
      setResult({ palaces: res.migratedPalaces, images: res.migratedImages, annotations: res.migratedAnnotations });
      await loadPalaces();
      setPhase('done');
    } catch (e) {
      setError(String(e));
      setPhase('error');
    }
  }

  if (phase === 'detecting' || phase === 'skip') return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-white/10">

        {phase === 'confirming' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-accent/20 rounded-xl">
                <Database className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Data migration</h2>
                <p className="text-sm text-muted">Web app data detected</p>
              </div>
            </div>
            <p className="text-sm text-foreground/80 mb-6">
              We found palaces saved from the web version of Mnemorium.
              Do you want to import them into the desktop app? The original data is preserved as a backup.
            </p>
            <div className="flex gap-3">
              <button
                onClick={startMigration}
                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors"
              >
                Import data
              </button>
              <button
                onClick={onComplete}
                className="px-4 py-2.5 text-muted hover:text-foreground rounded-xl transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <>
            <h2 className="text-lg font-bold text-foreground mb-2">Migration in progress…</h2>
            <p className="text-sm text-muted mb-4">{step}</p>
            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted text-right">{progress}%</p>
          </>
        )}

        {phase === 'done' && result && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <h2 className="text-lg font-bold text-foreground">Migration completed!</h2>
            </div>
            <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Palaces imported</span>
                <span className="font-bold text-foreground">{result.palaces}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Images imported</span>
                <span className="font-bold text-foreground">{result.images}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Annotations imported</span>
                <span className="font-bold text-foreground">{result.annotations}</span>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="w-full px-4 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors"
            >
              Start using Mnemorium
            </button>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <h2 className="text-lg font-bold text-foreground">Migration error</h2>
            </div>
            <p className="text-sm text-muted mb-6">{error}</p>
            <button
              onClick={onComplete}
              className="w-full px-4 py-2.5 bg-surface-elevated hover:bg-white/10 text-foreground rounded-xl font-medium transition-colors"
            >
              Continue without migrating
            </button>
          </>
        )}
      </div>
    </div>
  );
}

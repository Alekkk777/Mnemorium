/**
 * AIStatusBar.tsx
 * Always-visible status bar in the bottom-left corner showing the active AI provider.
 */

import { useAI } from '@/hooks/useAI';
import { Zap, ZapOff, Loader2 } from 'lucide-react';

const PROVIDER_LABELS: Record<string, string> = {
  local: 'Local AI',
  gemini: 'Gemini AI',
  openai: 'OpenAI',
  none: 'AI offline',
};

export default function AIStatusBar() {
  const { providerType, isAvailable, isLoading } = useAI();

  const label = PROVIDER_LABELS[providerType] ?? 'AI offline';

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                   bg-surface-elevated border border-white/10 shadow-lg backdrop-blur-sm
                   cursor-default select-none"
        title={isAvailable ? `Provider: ${label}` : 'AI not available'}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted" />
        ) : isAvailable ? (
          <Zap className="w-3 h-3 text-green-400" />
        ) : (
          <ZapOff className="w-3 h-3 text-muted" />
        )}
        <span className={isAvailable ? 'text-foreground' : 'text-muted'}>
          {isLoading ? 'Loading AI…' : label}
        </span>
      </div>
    </div>
  );
}

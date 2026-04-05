/**
 * SetupWizard.tsx
 * 3-step first-launch wizard. No technical forms.
 * Step 1: Welcome
 * Step 2: AI setup (local via Ollama, Gemini free, OpenAI, or skip)
 * Step 3: Ready
 */

import { useState } from 'react';
import { Brain, Zap, Globe, Key, ChevronRight, Check } from 'lucide-react';
import { setSetting } from '@/lib/tauriStorage';
import { saveGeminiKey } from '@/lib/providers/geminiProvider';
import { saveOpenAIKey } from '@/lib/providers/openAIProvider';
import { setActiveProviderType } from '@/lib/aiProvider';
import { AIProviderType } from '@/types/ai';

interface SetupWizardProps {
  onComplete: () => void;
}

type AIChoice = 'local' | 'gemini' | 'openai' | 'skip';

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [aiChoice, setAIChoice] = useState<AIChoice | null>(null);
  const [apiKey, setApiKey] = useState('');

  async function finish() {
    // Persist choice
    if (aiChoice === 'gemini' && apiKey.trim()) {
      saveGeminiKey(apiKey.trim());
      setActiveProviderType('gemini');
      await setSetting('ai_provider', 'gemini');
    } else if (aiChoice === 'openai' && apiKey.trim()) {
      saveOpenAIKey(apiKey.trim());
      setActiveProviderType('openai');
      await setSetting('ai_provider', 'openai');
    } else if (aiChoice === 'local') {
      setActiveProviderType('local');
      await setSetting('ai_provider', 'local');
    } else {
      setActiveProviderType('none');
      await setSetting('ai_provider', 'none');
    }
    await setSetting('setup_wizard_done', true);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
      <div className="max-w-lg w-full mx-4">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                s === step ? 'w-6 h-2 bg-accent' : s < step ? 'w-2 h-2 bg-accent/50' : 'w-2 h-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <div className="text-6xl mb-6">🏛️</div>
            <h1 className="text-3xl font-bold text-foreground mb-3">Benvenuto in Memorium</h1>
            <p className="text-muted text-lg mb-8 leading-relaxed">
              Il tuo palazzo della memoria digitale.<br />
              Completamente locale, gratuito per sempre.
            </p>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 mx-auto px-8 py-3 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium text-lg transition-colors"
            >
              Inizia <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: AI setup */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Configura l'AI</h2>
            <p className="text-muted mb-6">
              L'AI genera immagini mnemoniche per i tuoi concetti. Puoi cambiare questa scelta in qualsiasi momento.
            </p>

            <div className="space-y-3 mb-6">
              <AIOption
                icon={<Zap className="w-5 h-5 text-accent" />}
                title="AI locale (Ollama)"
                subtitle="Completamente offline — installa Ollama separatamente"
                selected={aiChoice === 'local'}
                onClick={() => setAIChoice('local')}
              />
              <AIOption
                icon={<Globe className="w-5 h-5 text-blue-400" />}
                title="Gemini AI (gratuito)"
                subtitle="Google Gemini — gratuito con account Google"
                selected={aiChoice === 'gemini'}
                onClick={() => setAIChoice('gemini')}
              />
              <AIOption
                icon={<Key className="w-5 h-5 text-orange-400" />}
                title="OpenAI"
                subtitle="GPT-4o-mini — richiede API key a pagamento"
                selected={aiChoice === 'openai'}
                onClick={() => setAIChoice('openai')}
              />
              <AIOption
                icon={<Brain className="w-5 h-5 text-muted" />}
                title="Salta per ora"
                subtitle="Puoi configurare l'AI in seguito dalle impostazioni"
                selected={aiChoice === 'skip'}
                onClick={() => setAIChoice('skip')}
              />
            </div>

            {(aiChoice === 'gemini' || aiChoice === 'openai') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted mb-2">
                  {aiChoice === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={aiChoice === 'gemini' ? 'AIza...' : 'sk-...'}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-white/10 rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-accent"
                />
              </div>
            )}

            <button
              onClick={() => aiChoice && setStep(3)}
              disabled={!aiChoice || ((aiChoice === 'gemini' || aiChoice === 'openai') && !apiKey.trim())}
              className="w-full px-4 py-3 bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              Continua
            </button>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Tutto pronto!</h2>
            <p className="text-muted mb-8">
              Crea il tuo primo palazzo della memoria e inizia a memorizzare qualsiasi cosa.
            </p>
            <button
              onClick={finish}
              className="px-8 py-3 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium text-lg transition-colors"
            >
              Inizia →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface AIOptionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}

function AIOption({ icon, title, subtitle, selected, onClick }: AIOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left ${
        selected
          ? 'border-accent bg-accent/10'
          : 'border-white/10 bg-surface-elevated hover:border-white/20'
      }`}
    >
      <div className={`p-2 rounded-lg ${selected ? 'bg-accent/20' : 'bg-white/5'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted truncate">{subtitle}</p>
      </div>
      {selected && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
    </button>
  );
}

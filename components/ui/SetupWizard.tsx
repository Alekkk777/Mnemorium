/**
 * SetupWizard.tsx
 * 3-step first-launch wizard. No technical forms.
 * Step 1: Welcome
 * Step 2: AI setup (local via Ollama, Gemini free, OpenAI, or skip)
 * Step 3: Ready
 */

import { useState, useEffect } from 'react';
import { Brain, Zap, Globe, Key, ChevronRight, Check, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { setSetting } from '@/lib/tauriStorage';
import { saveGeminiKey } from '@/lib/providers/geminiProvider';
import { saveOpenAIKey } from '@/lib/providers/openAIProvider';
import { setActiveProviderType } from '@/lib/aiProvider';
import { AIProviderType } from '@/types/ai';

interface SetupWizardProps {
  onComplete: () => void;
}

type AIChoice = 'local' | 'gemini' | 'openai' | 'skip';

type OllamaStatus = 'unknown' | 'checking' | 'not_installed' | 'installed_no_model' | 'ready' | 'pulling';

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [aiChoice, setAIChoice] = useState<AIChoice | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('unknown');

  // Check Ollama status when local AI is selected
  useEffect(() => {
    if (aiChoice !== 'local') return;
    setOllamaStatus('checking');
    checkOllama();
  }, [aiChoice]);

  async function checkOllama() {
    setOllamaStatus('checking');
    try {
      // Get Python server port
      let port: number | null = null;
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        port = await (invoke as (cmd: string) => Promise<number | null>)('get_python_server_port').catch(() => null);
      }
      if (!port) { setOllamaStatus('not_installed'); return; }

      const res = await fetch(`http://127.0.0.1:${port}/ollama/status`);
      const data = await res.json();
      if (!data.installed) setOllamaStatus('not_installed');
      else if (!data.model_ready) setOllamaStatus('installed_no_model');
      else setOllamaStatus('ready');
    } catch {
      setOllamaStatus('not_installed');
    }
  }

  async function pullOllamaModel() {
    setOllamaStatus('pulling');
    try {
      let port: number | null = null;
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        port = await (invoke as (cmd: string) => Promise<number | null>)('get_python_server_port').catch(() => null);
      }
      if (!port) return;
      await fetch(`http://127.0.0.1:${port}/ollama/pull`, { method: 'POST' });
      // Poll status every 5s
      const id = setInterval(async () => {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/ollama/status`);
          const data = await res.json();
          if (data.model_ready) { clearInterval(id); setOllamaStatus('ready'); }
        } catch { /* keep polling */ }
      }, 5000);
    } catch {
      setOllamaStatus('installed_no_model');
    }
  }

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
            <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to Mnemorium</h1>
            <p className="text-muted text-lg mb-8 leading-relaxed">
              Your digital memory palace.<br />
              Completely local, free forever.
            </p>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 mx-auto px-8 py-3 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium text-lg transition-colors"
            >
              Get started <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: AI setup */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Configure AI</h2>
            <p className="text-muted mb-6">
              AI generates mnemonic images for your concepts. You can change this choice at any time.
            </p>

            <div className="space-y-3 mb-6">
              <AIOption
                icon={<Zap className="w-5 h-5 text-accent" />}
                title="AI locale (Ollama)"
                subtitle="Completely offline — no cloud, no cost"
                selected={aiChoice === 'local'}
                onClick={() => setAIChoice('local')}
              />
              <AIOption
                icon={<Globe className="w-5 h-5 text-blue-400" />}
                title="Gemini AI (gratuito)"
                subtitle="Google Gemini — free with a Google account"
                selected={aiChoice === 'gemini'}
                onClick={() => setAIChoice('gemini')}
              />
              <AIOption
                icon={<Key className="w-5 h-5 text-orange-400" />}
                title="OpenAI"
                subtitle="GPT-4o-mini — requires paid API key"
                selected={aiChoice === 'openai'}
                onClick={() => setAIChoice('openai')}
              />
              <AIOption
                icon={<Brain className="w-5 h-5 text-muted" />}
                title="Skip for now"
                subtitle="You can configure AI later from settings"
                selected={aiChoice === 'skip'}
                onClick={() => setAIChoice('skip')}
              />
            </div>

            {/* Ollama status widget */}
            {aiChoice === 'local' && (
              <div className="mb-6 p-4 bg-surface border border-white/10 rounded-xl">
                {ollamaStatus === 'checking' && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    <span className="text-sm text-muted">Checking Ollama...</span>
                  </div>
                )}
                {ollamaStatus === 'not_installed' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium text-foreground">Ollama not found</span>
                    </div>
                    <p className="text-xs text-muted mb-3">
                      Download and install Ollama from{' '}
                      <span className="text-accent">ollama.com</span>, then come back here.
                    </p>
                    <button onClick={checkOllama} className="text-xs text-accent hover:underline">
                      Check again →
                    </button>
                  </div>
                )}
                {ollamaStatus === 'installed_no_model' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium text-foreground">Model not installed</span>
                    </div>
                    <p className="text-xs text-muted mb-3">
                      Ollama is installed but the <strong>llava</strong> (vision) model is missing. Download it now.
                    </p>
                    <button
                      onClick={pullOllamaModel}
                      className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download model (~4GB)
                    </button>
                  </div>
                )}
                {ollamaStatus === 'pulling' && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Downloading...</p>
                      <p className="text-xs text-muted">This may take a few minutes.</p>
                    </div>
                  </div>
                )}
                {ollamaStatus === 'ready' && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Ollama ready!</p>
                      <p className="text-xs text-muted">The llava model is installed and working.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">All set!</h2>
            <p className="text-muted mb-8">
              Create your first memory palace and start memorizing anything.
            </p>
            <button
              onClick={finish}
              className="px-8 py-3 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium text-lg transition-colors"
            >
              Get started →
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

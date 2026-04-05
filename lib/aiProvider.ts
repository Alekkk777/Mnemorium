/**
 * aiProvider.ts
 * Factory pattern — returns the active AIProvider based on user settings.
 * Cascade: local → gemini → openai → null
 */

import { AIProvider, AIProviderType } from '@/types/ai';
import { LocalAIProvider } from './providers/localAIProvider';
import { GeminiProvider, getGeminiKey } from './providers/geminiProvider';
import { OpenAIProvider, getOpenAIKey } from './providers/openAIProvider';

let _activeProvider: AIProvider | null = null;
let _activeType: AIProviderType = 'none';

/** Call this on settings change or app start */
export function setActiveProviderType(type: AIProviderType): void {
  _activeType = type;
  _activeProvider = null; // reset cache
}

export function getActiveProvider(): AIProvider | null {
  if (_activeProvider) return _activeProvider;

  switch (_activeType) {
    case 'local':
      _activeProvider = new LocalAIProvider();
      break;
    case 'gemini':
      _activeProvider = new GeminiProvider();
      break;
    case 'openai':
      _activeProvider = new OpenAIProvider();
      break;
    default:
      return null;
  }

  return _activeProvider;
}

/**
 * Auto-detect best available provider.
 * Priority: local > gemini (if key set) > openai (if key set) > none
 */
export async function autoDetectProvider(): Promise<AIProviderType> {
  // 1. Try local AI server
  const local = new LocalAIProvider();
  if (await local.isAvailable()) {
    setActiveProviderType('local');
    return 'local';
  }

  // 2. Gemini if key configured
  if (getGeminiKey()) {
    setActiveProviderType('gemini');
    return 'gemini';
  }

  // 3. OpenAI if key configured
  if (getOpenAIKey()) {
    setActiveProviderType('openai');
    return 'openai';
  }

  setActiveProviderType('none');
  return 'none';
}

/** Convenience: generate mnemonic with active provider */
export async function generateMnemonic(text: string, language?: string): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) throw new Error('Nessun provider AI configurato');
  return provider.generateMnemonic(text, language);
}

/** Convenience: generate image with active provider */
export async function generateImage(prompt: string): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) throw new Error('Nessun provider AI configurato');
  return provider.generateImage(prompt);
}

/**
 * aiProvider.ts
 * Factory pattern — returns the active AIProvider based on user settings.
 * Cascade: local → gemini → openai → null
 */

import { AIProvider, AIProviderType } from '@/types/ai';
import { LocalAIProvider } from './providers/localAIProvider';
import { GeminiProvider, getGeminiKey } from './providers/geminiProvider';
import {
  OpenAIProvider,
  getOpenAIKey,
  generateAnnotations as openAIGenerateAnnotations,
  AIGenerationRequest,
  AIGeneratedAnnotation,
} from './providers/openAIProvider';

export type { AIGenerationRequest, AIGeneratedAnnotation };

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
  if (!provider) throw new Error('No AI provider configured');
  return provider.generateMnemonic(text, language);
}

/** Convenience: generate image with active provider */
export async function generateImage(prompt: string): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No AI provider configured');
  return provider.generateImage(prompt);
}

/** Returns true if any AI provider is configured and ready */
export function isAIEnabled(): boolean {
  return getActiveProvider() !== null;
}

/**
 * Generate mnemonic annotations from notes text.
 * Currently routes to OpenAI implementation; falls back to per-annotation generateMnemonic for other providers.
 */
export async function generateAnnotations(
  request: AIGenerationRequest
): Promise<AIGeneratedAnnotation[]> {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No AI provider configured');

  const { notesText, targetCount, imagesCount, language = 'italiano' } = request;

  if (provider.type === 'openai') {
    return openAIGenerateAnnotations(request);
  }

  // Gemini: single batch call
  if (provider.type === 'gemini') {
    const gemini = provider as GeminiProvider;
    const results = await gemini.generateAnnotationsBatch(notesText, targetCount, imagesCount, language);
    if (results.length > 0) return results;
    // fallthrough to line-by-line if batch returned empty
  }

  // Local / fallback: generate one mnemonic per line
  const lines = notesText.split(/\n+/).filter(Boolean).slice(0, targetCount);
  const results: AIGeneratedAnnotation[] = [];
  for (let i = 0; i < Math.min(lines.length, targetCount); i++) {
    const note = await provider.generateMnemonic(lines[i], language);
    results.push({
      description: lines[i].slice(0, 50),
      note,
      imageIndex: i % imagesCount,
    });
  }
  return results;
}

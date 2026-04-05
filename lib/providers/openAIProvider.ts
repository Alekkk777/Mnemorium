/**
 * openAIProvider.ts
 * Refactored from aiGenerator.ts — implements AIProvider interface.
 * Supports GPT-4o-mini for text; no image gen (use localAIProvider for that).
 */

import { AIProvider, AIProviderType, VisionObject } from '@/types/ai';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const LS_KEY = 'memorium_openai_key';

const SYSTEM_PROMPT = `Sei un esperto di tecniche mnemoniche. Trasforma ogni concetto in un'immagine mentale VIVIDA, bizzarra e memorabile.
Usa colori brillanti, azioni esagerate, proporzioni assurde. Coinvolgi più sensi.
Rispondi SOLO con l'immagine mnemonica, max 150 parole, senza introduzioni.`;

export function saveOpenAIKey(key: string): void {
  localStorage.setItem(LS_KEY, btoa(key));
}

export function getOpenAIKey(): string | null {
  const stored = localStorage.getItem(LS_KEY);
  if (!stored) return null;
  try { return atob(stored); } catch { return null; }
}

export function clearOpenAIKey(): void {
  localStorage.removeItem(LS_KEY);
}

export class OpenAIProvider implements AIProvider {
  readonly type: AIProviderType = 'openai';

  async isAvailable(): Promise<boolean> {
    const key = getOpenAIKey();
    return !!(key && key.startsWith('sk-'));
  }

  async generateMnemonic(text: string, language = 'italiano'): Promise<string> {
    const key = getOpenAIKey();
    if (!key) throw new Error('OpenAI API key non configurata');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Concetto da memorizzare (lingua: ${language}): ${text}` },
        ],
        temperature: 0.9,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async generateImage(_prompt: string): Promise<string> {
    throw new Error('Generazione immagini non supportata con OpenAI provider. Usa il provider locale.');
  }

  async analyzeImage(_imageBase64: string): Promise<VisionObject[]> {
    throw new Error('Analisi immagini non supportata in questo provider. Usa il provider locale.');
  }
}

// ─── Legacy compatibility: generateAnnotations ────────────────────────────────

export interface AIGenerationRequest {
  notesText: string;
  targetCount: number;
  imagesCount: number;
  language?: string;
}

export interface AIGeneratedAnnotation {
  description: string;
  note: string;
  imageIndex: number;
}

export async function generateAnnotations(
  request: AIGenerationRequest
): Promise<AIGeneratedAnnotation[]> {
  const key = getOpenAIKey();
  if (!key) throw new Error('OpenAI API key non configurata');

  const systemPrompt = `Sei un esperto di tecniche mnemoniche (metodo dei loci).
Devi distribuire ${request.targetCount} annotazioni su ${request.imagesCount} immagini di un palazzo della memoria.
Per ogni annotazione crea: description (concetto, max 50 char) e note (immagine mnemonica vivida, max 200 char).
imageIndex deve essere distribuito equamente tra 0 e ${request.imagesCount - 1}.
Rispondi con JSON: {"annotations": [{"description":"...","note":"...","imageIndex":0}]}`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Testo da memorizzare:\n\n${request.notesText}` },
      ],
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  const content = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  return content.annotations ?? [];
}

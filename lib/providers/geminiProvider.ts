/**
 * geminiProvider.ts
 * Gemini API free tier — fallback when no local AI is available.
 * Uses gemini-1.5-flash (free, generous limits).
 */

import { AIProvider, AIProviderType, VisionObject } from '@/types/ai';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const TEXT_MODEL = 'gemini-1.5-flash';
const VISION_MODEL = 'gemini-1.5-flash';
const LS_KEY = 'mnemorium_gemini_key';

const MNEMONIC_SYSTEM =
  'Sei un esperto di tecniche mnemoniche. Trasforma il concetto in un\'immagine mentale VIVIDA, bizzarra e memorabile. ' +
  'Usa colori brillanti, azioni esagerate. Max 150 parole. Rispondi solo con l\'immagine, nessuna introduzione.';

export function saveGeminiKey(key: string): void {
  const encoded = btoa(key);
  localStorage.setItem(LS_KEY, encoded);
  // Also persist to SQLite so it survives WebView rebuilds
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    import('@tauri-apps/api/core').then(({ invoke }) =>
      (invoke as (cmd: string, a?: unknown) => Promise<void>)('set_setting', {
        key: 'gemini_api_key_b64',
        value: encoded,
      })
    ).catch(() => {});
  }
}

export function getGeminiKey(): string | null {
  const stored = localStorage.getItem(LS_KEY);
  if (!stored) return null;
  try { return atob(stored); } catch { return null; }
}

export function clearGeminiKey(): void {
  localStorage.removeItem(LS_KEY);
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    import('@tauri-apps/api/core').then(({ invoke }) =>
      (invoke as (cmd: string, a?: unknown) => Promise<void>)('set_setting', {
        key: 'gemini_api_key_b64',
        value: null,
      })
    ).catch(() => {});
  }
}

async function geminiRequest(
  model: string,
  key: string,
  contents: object[]
): Promise<string> {
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

export class GeminiProvider implements AIProvider {
  readonly type: AIProviderType = 'gemini';

  async isAvailable(): Promise<boolean> {
    const key = getGeminiKey();
    return !!(key && key.length > 10);
  }

  async generateMnemonic(text: string, language = 'italiano'): Promise<string> {
    const key = getGeminiKey();
    if (!key) throw new Error('Gemini API key non configurata');

    return geminiRequest(TEXT_MODEL, key, [
      {
        role: 'user',
        parts: [
          { text: MNEMONIC_SYSTEM },
          { text: `Concetto (lingua: ${language}): ${text}` },
        ],
      },
    ]);
  }

  async generateImage(_prompt: string): Promise<string> {
    throw new Error('Image generation not supported with Gemini. Use the local provider.');
  }

  async analyzeImage(imageBase64: string): Promise<VisionObject[]> {
    const key = getGeminiKey();
    if (!key) throw new Error('Gemini API key non configurata');

    // Strip data URL prefix
    const base64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const text = await geminiRequest(VISION_MODEL, key, [
      {
        role: 'user',
        parts: [
          {
            text: 'Analizza questa immagine e identifica 5-8 oggetti distinti. ' +
              'Rispondi in JSON: {"objects":[{"name":"...","position":"...","description":"..."}]}',
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64,
            },
          },
        ],
      },
    ]);

    try {
      // Strip markdown code blocks if present
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      return parsed.objects ?? [];
    } catch {
      return [];
    }
  }

  async generateAnnotationsBatch(
    notesText: string,
    targetCount: number,
    imagesCount: number,
    language = 'italiano'
  ): Promise<Array<{ description: string; note: string; imageIndex: number }>> {
    const key = getGeminiKey();
    if (!key) throw new Error('Gemini API key non configurata');

    const systemPrompt =
      `Sei un esperto di tecniche mnemoniche (metodo dei loci). ` +
      `Distribuisci ${targetCount} annotazioni su ${imagesCount} immagini. ` +
      `Per ogni annotazione: description (concetto, max 50 char), note (immagine mnemonica vivida in ${language}, max 200 char), imageIndex (0-${imagesCount - 1}). ` +
      `Rispondi SOLO con JSON valido: {"annotations":[{"description":"...","note":"...","imageIndex":0}]}`;

    const raw = await geminiRequest(TEXT_MODEL, key, [
      {
        role: 'user',
        parts: [
          { text: systemPrompt },
          { text: `Testo da memorizzare:\n\n${notesText}` },
        ],
      },
    ]);

    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      return parsed.annotations ?? [];
    } catch {
      return [];
    }
  }
}

/**
 * localAIProvider.ts
 * HTTP client to the Python FastAPI server running locally.
 * Port is discovered via Tauri command get_python_server_port.
 */

import { AIProvider, AIProviderType, VisionObject } from '@/types/ai';

let cachedPort: number | null = null;

async function getPort(): Promise<number | null> {
  if (cachedPort !== null) return cachedPort;

  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      cachedPort = await (invoke as (cmd: string) => Promise<number | null>)('get_python_server_port');
      return cachedPort;
    } catch {
      return null;
    }
  }

  // Dev: try default port
  return 7891;
}

async function serverUrl(): Promise<string> {
  const port = await getPort();
  if (!port) throw new Error('AI server non disponibile');
  return `http://127.0.0.1:${port}`;
}

export class LocalAIProvider implements AIProvider {
  readonly type: AIProviderType = 'local';

  async isAvailable(): Promise<boolean> {
    try {
      const base = await serverUrl();
      const resp = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async generateMnemonic(text: string, language = 'italiano'): Promise<string> {
    const base = await serverUrl();
    const resp = await fetch(`${base}/generate-mnemonic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail ?? 'Errore server AI');
    }

    const data = await resp.json();
    return data.mnemonic ?? '';
  }

  async generateImage(prompt: string): Promise<string> {
    const base = await serverUrl();
    const resp = await fetch(`${base}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width: 512, height: 512, steps: 4 }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail ?? 'Errore generazione immagine');
    }

    const data = await resp.json();
    return `data:image/png;base64,${data.image_base64}`;
  }

  async analyzeImage(imageBase64: string): Promise<VisionObject[]> {
    const base = await serverUrl();
    // Strip data URL prefix
    const b64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const resp = await fetch(`${base}/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: b64 }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail ?? 'Errore analisi immagine');
    }

    const data = await resp.json();
    return data.objects ?? [];
  }
}

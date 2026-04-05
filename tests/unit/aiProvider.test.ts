import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setActiveProviderType,
  getActiveProvider,
  autoDetectProvider,
} from '@/lib/aiProvider';

describe('aiProvider factory', () => {
  beforeEach(() => {
    setActiveProviderType('none');
  });

  it('returns null for "none" provider', () => {
    expect(getActiveProvider()).toBeNull();
  });

  it('returns LocalAIProvider for "local"', () => {
    setActiveProviderType('local');
    const p = getActiveProvider();
    expect(p?.type).toBe('local');
  });

  it('returns GeminiProvider for "gemini"', () => {
    setActiveProviderType('gemini');
    const p = getActiveProvider();
    expect(p?.type).toBe('gemini');
  });

  it('returns OpenAIProvider for "openai"', () => {
    setActiveProviderType('openai');
    const p = getActiveProvider();
    expect(p?.type).toBe('openai');
  });
});

describe('autoDetectProvider', () => {
  it('returns "none" when no keys or local server', async () => {
    localStorage.clear();
    const type = await autoDetectProvider();
    // Local server won't be available in test, no keys set
    expect(['none', 'local']).toContain(type);
  });

  it('returns "gemini" when gemini key is set', async () => {
    localStorage.setItem('memorium_gemini_key', btoa('AIzaTestKey123456'));
    const type = await autoDetectProvider();
    // Local server wins if available, otherwise gemini
    expect(['gemini', 'local']).toContain(type);
    localStorage.clear();
  });
});

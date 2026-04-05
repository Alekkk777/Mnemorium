/**
 * useAI.ts
 * Hook that exposes the active AI provider status and generation functions.
 */

import { useEffect, useState, useCallback } from 'react';
import { AIProviderType } from '@/types/ai';
import {
  autoDetectProvider,
  getActiveProvider,
  setActiveProviderType,
  generateMnemonic as libGenerateMnemonic,
  generateImage as libGenerateImage,
} from '@/lib/aiProvider';

export interface AIState {
  providerType: AIProviderType;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAI() {
  const [state, setState] = useState<AIState>({
    providerType: 'none',
    isAvailable: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const type = await autoDetectProvider();
        if (!cancelled) {
          setState({ providerType: type, isAvailable: type !== 'none', isLoading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({ ...s, isLoading: false, error: String(e) }));
        }
      }
    }
    detect();
    return () => { cancelled = true; };
  }, []);

  const generateMnemonic = useCallback(async (text: string, language?: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const result = await libGenerateMnemonic(text, language);
      setState((s) => ({ ...s, isLoading: false }));
      return result;
    } catch (e) {
      setState((s) => ({ ...s, isLoading: false, error: String(e) }));
      throw e;
    }
  }, []);

  const generateImage = useCallback(async (prompt: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const result = await libGenerateImage(prompt);
      setState((s) => ({ ...s, isLoading: false }));
      return result;
    } catch (e) {
      setState((s) => ({ ...s, isLoading: false, error: String(e) }));
      throw e;
    }
  }, []);

  const switchProvider = useCallback((type: AIProviderType) => {
    setActiveProviderType(type);
    setState((s) => ({ ...s, providerType: type, isAvailable: type !== 'none' }));
  }, []);

  return { ...state, generateMnemonic, generateImage, switchProvider };
}

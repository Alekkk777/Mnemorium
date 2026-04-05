// tests/setup.ts — Vitest global setup
import { vi } from 'vitest';

// Mock Tauri API — not available in test environment
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(null),
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'sessionStorage', { value: localStorageMock });

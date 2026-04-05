/**
 * useTauri.ts
 * Simple hook to check if running inside Tauri desktop context.
 */

import { useEffect, useState } from 'react';

export function useTauri() {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(typeof window !== 'undefined' && !!(window as any).__TAURI__);
  }, []);

  return { isTauri };
}

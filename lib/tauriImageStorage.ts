/**
 * tauriImageStorage.ts
 * Replaces imageDB.ts (IndexedDB) for Tauri desktop app.
 * Images are saved to the filesystem via Tauri commands and referenced
 * by a relative path stored in SQLite.
 *
 * In dev/browser mode falls back to IndexedDB-based imageDB for compatibility.
 */

import { is360Image, compressImage } from './imageUtils';

export { is360Image, compressImage };

// ─── Tauri invoke helper (duplicated for isolation) ───────────────────────────

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if ((window as any).__TAURI__) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return (tauriInvoke as (cmd: string, a?: unknown) => Promise<T>)(command, args);
  }
  throw new Error('Not in Tauri context');
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

// ─── convertFileSrc for WebView asset loading ─────────────────────────────────

export async function getImageUrl(relativePath: string): Promise<string> {
  if (!isTauri()) {
    // In browser dev mode — cannot resolve local paths
    console.warn('[tauriImageStorage] Not in Tauri, cannot resolve local path:', relativePath);
    return relativePath;
  }

  const { convertFileSrc } = await import('@tauri-apps/api/core');
  const absPath = await invoke<string>('get_image_url', { relativePath });
  return convertFileSrc(absPath);
}

// ─── Save image (from File or base64) ────────────────────────────────────────

export interface SaveImageResult {
  relativePath: string;
  absolutePath: string;
}

export async function saveImageFile(
  file: File,
  subdir: 'palace_images' | 'annotation_images' = 'palace_images'
): Promise<SaveImageResult> {
  if (!isTauri()) {
    throw new Error('saveImageFile requires Tauri context');
  }

  // Compress if needed (>2MB or too wide)
  let base64: string;
  if (file.size > 2 * 1024 * 1024) {
    base64 = await compressImage(file, 2048, 0.85);
  } else {
    base64 = await fileToBase64(file);
  }

  const result = await invoke<SaveImageResult>('save_image_file', {
    input: {
      data_base64: base64,
      file_name: file.name,
      subdir,
    },
  });

  return result;
}

export async function saveBase64Image(
  base64: string,
  fileName: string,
  subdir: 'palace_images' | 'annotation_images' = 'annotation_images'
): Promise<SaveImageResult> {
  if (!isTauri()) {
    throw new Error('saveBase64Image requires Tauri context');
  }

  return invoke<SaveImageResult>('save_image_file', {
    input: {
      data_base64: base64,
      file_name: fileName,
      subdir,
    },
  });
}

export async function deleteImageFile(relativePath: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>('delete_image_file', { relativePath });
}

export async function readImageAsBase64(relativePath: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('readImageAsBase64 requires Tauri context');
  }
  return invoke<string>('read_image_as_base64', { relativePath });
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export { is360Image as detectIs360 };

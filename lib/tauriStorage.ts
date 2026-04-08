/**
 * tauriStorage.ts
 * Wrapper around Tauri IPC commands for all SQLite operations.
 * Replaces localStorage/security.ts for palace/annotation persistence.
 *
 * Falls back to a no-op/mock when running outside Tauri (e.g. `next dev`)
 * so the frontend still compiles and can be previewed in the browser.
 */

import type {
  Palace,
  PalaceImage,
  Annotation,
} from '@/types';

// ─── Tauri invoke helper ──────────────────────────────────────────────────────

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window === 'undefined') {
    throw new Error('invoke() called server-side');
  }

  // In Tauri context __TAURI__ is injected by the runtime
  if ((window as any).__TAURI__) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return (tauriInvoke as (cmd: string, a?: unknown) => Promise<T>)(command, args);
  }

  // Dev browser fallback — use localStorage shim
  console.warn(`[tauriStorage] Running outside Tauri — using localStorage shim for: ${command}`);
  return browserShim<T>(command, args);
}

// ─── Browser shim (dev only) ──────────────────────────────────────────────────

function browserShim<T>(command: string, args?: Record<string, unknown>): T {
  const KEY = 'mnemorium_dev_palaces';
  const load = (): Palace[] => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  };
  const save = (palaces: Palace[]) => localStorage.setItem(KEY, JSON.stringify(palaces));

  switch (command) {
    case 'get_palaces':      return load() as unknown as T;
    case 'create_palace': {
      const palaces = load();
      const now = Date.now();
      const p: Palace = {
        _id: `palace_${now}`,
        name: (args?.input as any)?.name ?? 'Nuovo Palazzo',
        description: (args?.input as any)?.description,
        images: [],
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      save([...palaces, p]);
      return p as unknown as T;
    }
    case 'delete_palace': {
      const id = args?.id as string;
      save(load().filter(p => p._id !== id));
      return undefined as unknown as T;
    }
    default:
      console.warn(`[tauriStorage] Unhandled shim command: ${command}`);
      return undefined as unknown as T;
  }
}

// ─── Palace operations ────────────────────────────────────────────────────────

export interface TauriPalaceRow {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  updated_at: number;
}

export interface TauriImageRow {
  id: string;
  palace_id: string;
  name: string;
  file_name: string;
  local_file_path?: string;
  width: number;
  height: number;
  is_360: boolean;
  sort_order: number;
  created_at: number;
}

export interface TauriAnnotationRow {
  id: string;
  image_id: string;
  text: string;
  note?: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_x: number;
  rot_y: number;
  rot_z: number;
  is_visible: boolean;
  is_generated: boolean;
  image_file_path?: string;
  ai_prompt?: string;
  fsrs_stability?: number;
  fsrs_difficulty?: number;
  fsrs_due?: number;
  fsrs_state: number;
  fsrs_reps: number;
  fsrs_lapses: number;
  fsrs_last_review?: number;
  created_at: number;
  updated_at?: number;
}

export async function getPalaces(): Promise<TauriPalaceRow[]> {
  return invoke<TauriPalaceRow[]>('get_palaces');
}

// ─── Full palace load (single JOIN) ──────────────────────────────────────────

export interface TauriPalaceFullRow {
  // Palace
  palace_id: string;
  palace_name: string;
  palace_description?: string;
  palace_created_at: number;
  palace_updated_at: number;
  // Image (null when palace has no images)
  image_id?: string;
  image_name?: string;
  image_file_name?: string;
  image_local_file_path?: string;
  image_width?: number;
  image_height?: number;
  image_is_360?: boolean;
  image_sort_order?: number;
  image_created_at?: number;
  // Annotation (null when image has no annotations)
  ann_id?: string;
  ann_text?: string;
  ann_note?: string;
  ann_pos_x?: number;
  ann_pos_y?: number;
  ann_pos_z?: number;
  ann_rot_x?: number;
  ann_rot_y?: number;
  ann_rot_z?: number;
  ann_is_visible?: boolean;
  ann_is_generated?: boolean;
  ann_image_file_path?: string;
  ann_ai_prompt?: string;
  ann_fsrs_stability?: number;
  ann_fsrs_difficulty?: number;
  ann_fsrs_due?: number;
  ann_fsrs_state?: number;
  ann_fsrs_reps?: number;
  ann_fsrs_lapses?: number;
  ann_fsrs_last_review?: number;
  ann_created_at?: number;
  ann_updated_at?: number;
}

export async function getPalacesFull(): Promise<TauriPalaceFullRow[]> {
  return invoke<TauriPalaceFullRow[]>('get_palaces_full');
}

export async function createPalace(name: string, description?: string): Promise<TauriPalaceRow> {
  return invoke<TauriPalaceRow>('create_palace', {
    input: { name, description: description ?? null },
  });
}

export async function updatePalace(id: string, name?: string, description?: string): Promise<void> {
  return invoke<void>('update_palace', {
    id,
    input: { name: name ?? null, description: description ?? null },
  });
}

export async function deletePalace(id: string): Promise<void> {
  return invoke<void>('delete_palace', { id });
}

// ─── Image operations ─────────────────────────────────────────────────────────

export async function getPalaceImages(palaceId: string): Promise<TauriImageRow[]> {
  return invoke<TauriImageRow[]>('get_palace_images', { palaceId });
}

export async function addPalaceImage(input: {
  palaceId: string;
  name: string;
  fileName: string;
  localFilePath?: string;
  width: number;
  height: number;
  is360: boolean;
  sortOrder: number;
}): Promise<TauriImageRow> {
  return invoke<TauriImageRow>('add_palace_image', {
    input: {
      palace_id: input.palaceId,
      name: input.name,
      file_name: input.fileName,
      local_file_path: input.localFilePath ?? null,
      width: input.width,
      height: input.height,
      is_360: input.is360,
      sort_order: input.sortOrder,
    },
  });
}

export async function deletePalaceImage(id: string): Promise<void> {
  return invoke<void>('delete_palace_image', { id });
}

// ─── Annotation operations ────────────────────────────────────────────────────

export async function getAnnotations(imageId: string): Promise<TauriAnnotationRow[]> {
  return invoke<TauriAnnotationRow[]>('get_annotations', { imageId });
}

export async function getDueAnnotations(palaceId: string): Promise<TauriAnnotationRow[]> {
  return invoke<TauriAnnotationRow[]>('get_due_annotations', { palaceId });
}

export async function addAnnotation(input: {
  imageId: string;
  text: string;
  note?: string;
  posX: number;
  posY: number;
  posZ: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  isGenerated?: boolean;
  imageFilePath?: string;
  aiPrompt?: string;
}): Promise<TauriAnnotationRow> {
  return invoke<TauriAnnotationRow>('add_annotation', {
    input: {
      image_id: input.imageId,
      text: input.text,
      note: input.note ?? null,
      pos_x: input.posX,
      pos_y: input.posY,
      pos_z: input.posZ,
      rot_x: input.rotX ?? 0,
      rot_y: input.rotY ?? 0,
      rot_z: input.rotZ ?? 0,
      is_generated: input.isGenerated ?? false,
      image_file_path: input.imageFilePath ?? null,
      ai_prompt: input.aiPrompt ?? null,
    },
  });
}

export async function updateAnnotation(
  id: string,
  updates: Partial<{
    text: string;
    note: string;
    posX: number;
    posY: number;
    posZ: number;
    isVisible: boolean;
    imageFilePath: string;
    aiPrompt: string;
    fsrsStability: number;
    fsrsDifficulty: number;
    fsrsDue: number;
    fsrsState: number;
    fsrsReps: number;
    fsrsLapses: number;
    fsrsLastReview: number;
  }>
): Promise<void> {
  return invoke<void>('update_annotation', {
    id,
    input: {
      text: updates.text ?? null,
      note: updates.note ?? null,
      pos_x: updates.posX ?? null,
      pos_y: updates.posY ?? null,
      pos_z: updates.posZ ?? null,
      is_visible: updates.isVisible ?? null,
      image_file_path: updates.imageFilePath ?? null,
      ai_prompt: updates.aiPrompt ?? null,
      fsrs_stability: updates.fsrsStability ?? null,
      fsrs_difficulty: updates.fsrsDifficulty ?? null,
      fsrs_due: updates.fsrsDue ?? null,
      fsrs_state: updates.fsrsState ?? null,
      fsrs_reps: updates.fsrsReps ?? null,
      fsrs_lapses: updates.fsrsLapses ?? null,
      fsrs_last_review: updates.fsrsLastReview ?? null,
    },
  });
}

export async function deleteAnnotation(id: string): Promise<void> {
  return invoke<void>('delete_annotation', { id });
}

// ─── Settings operations ──────────────────────────────────────────────────────

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  return invoke<T | null>('get_setting', { key });
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  return invoke<void>('set_setting', { key, value });
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const pairs = await invoke<[string, unknown][]>('get_all_settings');
  return Object.fromEntries(pairs);
}

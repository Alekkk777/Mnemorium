/**
 * store.ts — Zustand store riscritto per Tauri IPC
 *
 * Tutte le operazioni di persistenza passano per tauriStorage.ts
 * che a sua volta chiama Tauri commands → SQLite.
 *
 * Il layer di stato in memoria (Zustand) rimane compatibile con
 * i tipi esistenti (Palace, PalaceImage, Annotation) così tutti
 * i componenti React non richiedono modifiche.
 */

import { create } from 'zustand';
import { Palace, PalaceImage, Annotation } from '@/types';
import {
  getPalaces as dbGetPalaces,
  createPalace as dbCreatePalace,
  updatePalace as dbUpdatePalace,
  deletePalace as dbDeletePalace,
  getPalaceImages,
  addPalaceImage,
  deletePalaceImage,
  getAnnotations,
  addAnnotation as dbAddAnnotation,
  updateAnnotation as dbUpdateAnnotation,
  deleteAnnotation as dbDeleteAnnotation,
  TauriPalaceRow,
  TauriImageRow,
  TauriAnnotationRow,
} from './tauriStorage';
import { deleteImageFile } from './tauriImageStorage';

// ─── Type converters (DB rows → domain types) ─────────────────────────────────

function rowToPalace(row: TauriPalaceRow, images: PalaceImage[] = []): Palace {
  return {
    _id: row.id,
    name: row.name,
    description: row.description,
    images,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

function rowToImage(row: TauriImageRow, annotations: Annotation[] = []): PalaceImage {
  return {
    id: row.id,
    name: row.name,
    fileName: row.file_name,
    indexedDBKey: undefined,
    localFilePath: row.local_file_path,
    width: row.width,
    height: row.height,
    is360: row.is_360,
    annotations,
    createdAt: new Date(row.created_at * 1000).toISOString(),
  };
}

function rowToAnnotation(row: TauriAnnotationRow): Annotation {
  return {
    id: row.id,
    text: row.text,
    note: row.note ?? '',
    position: { x: row.pos_x, y: row.pos_y, z: row.pos_z },
    rotation: { x: row.rot_x, y: row.rot_y, z: row.rot_z },
    width: 1,
    height: 1,
    isVisible: row.is_visible,
    selected: false,
    isGenerated: row.is_generated,
    imageFilePath: row.image_file_path,
    aiPrompt: row.ai_prompt,
    fsrsCard: row.fsrs_state !== undefined ? {
      stability: row.fsrs_stability,
      difficulty: row.fsrs_difficulty,
      due: row.fsrs_due ? new Date(row.fsrs_due * 1000) : undefined,
      state: row.fsrs_state,
      reps: row.fsrs_reps,
      lapses: row.fsrs_lapses,
      lastReview: row.fsrs_last_review ? new Date(row.fsrs_last_review * 1000) : undefined,
    } : undefined,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at * 1000).toISOString() : undefined,
  };
}

// ─── Palace Store ─────────────────────────────────────────────────────────────

interface PalaceStore {
  palaces: Palace[];
  currentPalaceId: string | null;
  currentImageIndex: number;
  isLoading: boolean;

  // Palace Actions
  loadPalaces: () => Promise<void>;
  addPalace: (palace: { name: string; description?: string }) => Promise<Palace>;
  deletePalace: (id: string) => Promise<void>;
  updatePalace: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  setCurrentPalace: (id: string | null) => void;
  setCurrentImage: (index: number) => void;

  // Image Actions
  addImage: (palaceId: string, image: {
    name: string;
    fileName: string;
    localFilePath?: string;
    width: number;
    height: number;
    is360: boolean;
  }) => Promise<PalaceImage>;
  removeImage: (palaceId: string, imageId: string) => Promise<void>;

  // Annotation Actions
  addAnnotation: (
    palaceId: string,
    imageId: string,
    annotation: Omit<Annotation, 'id' | 'createdAt'>
  ) => Promise<Annotation>;
  deleteAnnotation: (palaceId: string, imageId: string, annotationId: string) => Promise<void>;
  updateAnnotation: (
    palaceId: string,
    imageId: string,
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>;
}

export const usePalaceStore = create<PalaceStore>((set, get) => ({
  palaces: [],
  currentPalaceId: null,
  currentImageIndex: 0,
  isLoading: false,

  // ── Load all palaces with their images and annotations ─────────────────────
  loadPalaces: async () => {
    set({ isLoading: true });
    try {
      const palaceRows = await dbGetPalaces();
      const palaces: Palace[] = [];

      for (const palaceRow of palaceRows) {
        const imageRows = await getPalaceImages(palaceRow.id);
        const images: PalaceImage[] = [];

        for (const imageRow of imageRows) {
          const annotationRows = await getAnnotations(imageRow.id);
          const annotations = annotationRows.map(rowToAnnotation);
          images.push(rowToImage(imageRow, annotations));
        }

        palaces.push(rowToPalace(palaceRow, images));
      }

      set({ palaces, isLoading: false });
    } catch (error) {
      console.error('[store] Error loading palaces:', error);
      set({ palaces: [], isLoading: false });
    }
  },

  // ── Add palace ─────────────────────────────────────────────────────────────
  addPalace: async ({ name, description }) => {
    const row = await dbCreatePalace(name, description);
    const palace = rowToPalace(row, []);

    set((state) => ({
      palaces: [palace, ...state.palaces],
      currentPalaceId: palace._id,
      currentImageIndex: 0,
    }));

    return palace;
  },

  // ── Delete palace ──────────────────────────────────────────────────────────
  deletePalace: async (id) => {
    const { palaces } = get();
    const palace = palaces.find((p) => p._id === id);

    // Clean up image files
    if (palace) {
      for (const image of palace.images) {
        if (image.localFilePath) {
          await deleteImageFile(image.localFilePath).catch(() => {});
        }
        for (const ann of image.annotations) {
          if (ann.imageFilePath) {
            await deleteImageFile(ann.imageFilePath).catch(() => {});
          }
        }
      }
    }

    await dbDeletePalace(id);

    set((state) => ({
      palaces: state.palaces.filter((p) => p._id !== id),
      currentPalaceId: state.currentPalaceId === id ? null : state.currentPalaceId,
      currentImageIndex: state.currentPalaceId === id ? 0 : state.currentImageIndex,
    }));
  },

  // ── Update palace ──────────────────────────────────────────────────────────
  updatePalace: async (id, updates) => {
    await dbUpdatePalace(id, updates.name, updates.description);
    set((state) => ({
      palaces: state.palaces.map((p) =>
        p._id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }));
  },

  setCurrentPalace: (id) => set({ currentPalaceId: id, currentImageIndex: 0 }),
  setCurrentImage: (index) => set({ currentImageIndex: index }),

  // ── Add image to palace ────────────────────────────────────────────────────
  addImage: async (palaceId, imageData) => {
    const { palaces } = get();
    const palace = palaces.find((p) => p._id === palaceId);
    const sortOrder = palace?.images.length ?? 0;

    const row = await addPalaceImage({
      palaceId,
      name: imageData.name,
      fileName: imageData.fileName,
      localFilePath: imageData.localFilePath,
      width: imageData.width,
      height: imageData.height,
      is360: imageData.is360,
      sortOrder,
    });

    const image = rowToImage(row, []);

    set((state) => ({
      palaces: state.palaces.map((p) =>
        p._id === palaceId
          ? { ...p, images: [...p.images, image], updatedAt: new Date() }
          : p
      ),
    }));

    return image;
  },

  // ── Remove image ───────────────────────────────────────────────────────────
  removeImage: async (palaceId, imageId) => {
    const { palaces } = get();
    const palace = palaces.find((p) => p._id === palaceId);
    const image = palace?.images.find((i) => i.id === imageId);

    if (image?.localFilePath) {
      await deleteImageFile(image.localFilePath).catch(() => {});
    }

    await deletePalaceImage(imageId);

    set((state) => ({
      palaces: state.palaces.map((p) =>
        p._id === palaceId
          ? { ...p, images: p.images.filter((i) => i.id !== imageId), updatedAt: new Date() }
          : p
      ),
    }));
  },

  // ── Add annotation ─────────────────────────────────────────────────────────
  addAnnotation: async (palaceId, imageId, annotationData) => {
    const row = await dbAddAnnotation({
      imageId,
      text: annotationData.text,
      note: annotationData.note || undefined,
      posX: annotationData.position.x,
      posY: annotationData.position.y,
      posZ: annotationData.position.z,
      rotX: annotationData.rotation?.x,
      rotY: annotationData.rotation?.y,
      rotZ: annotationData.rotation?.z,
      isGenerated: annotationData.isGenerated,
      imageFilePath: annotationData.imageFilePath,
      aiPrompt: annotationData.aiPrompt,
    });

    const annotation = rowToAnnotation(row);

    set((state) => ({
      palaces: state.palaces.map((palace) =>
        palace._id === palaceId
          ? {
              ...palace,
              updatedAt: new Date(),
              images: palace.images.map((image) =>
                image.id === imageId
                  ? { ...image, annotations: [...image.annotations, annotation] }
                  : image
              ),
            }
          : palace
      ),
    }));

    return annotation;
  },

  // ── Delete annotation ──────────────────────────────────────────────────────
  deleteAnnotation: async (palaceId, imageId, annotationId) => {
    const { palaces } = get();
    const palace = palaces.find((p) => p._id === palaceId);
    const image = palace?.images.find((i) => i.id === imageId);
    const annotation = image?.annotations.find((a) => a.id === annotationId);

    if (annotation?.imageFilePath) {
      await deleteImageFile(annotation.imageFilePath).catch(() => {});
    }

    await dbDeleteAnnotation(annotationId);

    set((state) => ({
      palaces: state.palaces.map((palace) =>
        palace._id === palaceId
          ? {
              ...palace,
              updatedAt: new Date(),
              images: palace.images.map((image) =>
                image.id === imageId
                  ? { ...image, annotations: image.annotations.filter((a) => a.id !== annotationId) }
                  : image
              ),
            }
          : palace
      ),
    }));
  },

  // ── Update annotation ──────────────────────────────────────────────────────
  updateAnnotation: async (palaceId, imageId, annotationId, updates) => {
    await dbUpdateAnnotation(annotationId, {
      text: updates.text,
      note: updates.note,
      posX: updates.position?.x,
      posY: updates.position?.y,
      posZ: updates.position?.z,
      isVisible: updates.isVisible,
      imageFilePath: updates.imageFilePath,
      aiPrompt: updates.aiPrompt,
      fsrsStability: updates.fsrsCard?.stability,
      fsrsDifficulty: updates.fsrsCard?.difficulty,
      fsrsDue: updates.fsrsCard?.due
        ? Math.floor(updates.fsrsCard.due.getTime() / 1000)
        : undefined,
      fsrsState: updates.fsrsCard?.state,
      fsrsReps: updates.fsrsCard?.reps,
      fsrsLapses: updates.fsrsCard?.lapses,
      fsrsLastReview: updates.fsrsCard?.lastReview
        ? Math.floor(updates.fsrsCard.lastReview.getTime() / 1000)
        : undefined,
    });

    set((state) => ({
      palaces: state.palaces.map((palace) =>
        palace._id === palaceId
          ? {
              ...palace,
              updatedAt: new Date(),
              images: palace.images.map((image) =>
                image.id === imageId
                  ? {
                      ...image,
                      annotations: image.annotations.map((a) =>
                        a.id === annotationId ? { ...a, ...updates } : a
                      ),
                    }
                  : image
              ),
            }
          : palace
      ),
    }));
  },
}));

// ─── UI Store (invariato) ─────────────────────────────────────────────────────

interface UIStore {
  isCreateModalOpen: boolean;
  isAnnotationFormOpen: boolean;
  isSettingsOpen: boolean;
  selectedAnnotationId: string | null;

  setCreateModalOpen: (open: boolean) => void;
  setAnnotationFormOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSelectedAnnotation: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isCreateModalOpen: false,
  isAnnotationFormOpen: false,
  isSettingsOpen: false,
  selectedAnnotationId: null,

  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  setAnnotationFormOpen: (open) => set({ isAnnotationFormOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setSelectedAnnotation: (id) => set({ selectedAnnotationId: id }),
}));

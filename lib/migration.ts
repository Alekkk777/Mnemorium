/**
 * migration.ts
 * One-shot migration from localStorage/IndexedDB (web app) → SQLite (Tauri).
 *
 * Called once at first app launch after migrating from the web PWA.
 * Shows a progress dialog with steps.
 *
 * After completion sets settings.migration_v2_done = true to skip on future launches.
 */

import {
  createPalace,
  addPalaceImage,
  addAnnotation as dbAddAnnotation,
  setSetting,
  getSetting,
} from './tauriStorage';
import { saveBase64Image } from './tauriImageStorage';
import { is360Image } from './imageUtils';

const MIGRATION_FLAG = 'migration_v2_done';
const LS_KEY = 'mnemorium_palaces';

export type MigrationProgressCallback = (step: string, progress: number) => void;

export async function isMigrationNeeded(): Promise<boolean> {
  // Check if migration already ran
  const done = await getSetting<boolean>(MIGRATION_FLAG).catch(() => null);
  if (done === true) return false;

  // Check if there is web app data to migrate
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
  return raw !== null && raw !== '[]';
}

export async function runMigration(
  onProgress: MigrationProgressCallback = () => {}
): Promise<{ migratedPalaces: number; migratedImages: number; migratedAnnotations: number }> {
  onProgress('Lettura dati esistenti…', 0);

  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    await setSetting(MIGRATION_FLAG, true);
    return { migratedPalaces: 0, migratedImages: 0, migratedAnnotations: 0 };
  }

  let palaces: any[] = [];
  try {
    palaces = JSON.parse(raw);
    if (!Array.isArray(palaces)) palaces = [];
  } catch {
    await setSetting(MIGRATION_FLAG, true);
    return { migratedPalaces: 0, migratedImages: 0, migratedAnnotations: 0 };
  }

  // Try to decrypt if encrypted (skip encrypted data — user needs to re-enter password)
  const isEncrypted = localStorage.getItem('mnemorium_encrypted') === 'true';
  if (isEncrypted) {
    onProgress('Dati cifrati rilevati — skippo migrazione automatica', 100);
    await setSetting(MIGRATION_FLAG, true);
    return { migratedPalaces: 0, migratedImages: 0, migratedAnnotations: 0 };
  }

  let migratedPalaces = 0;
  let migratedImages = 0;
  let migratedAnnotations = 0;
  const total = palaces.length;

  for (let pi = 0; pi < palaces.length; pi++) {
    const oldPalace = palaces[pi];
    const pct = Math.round((pi / total) * 90);
    onProgress(`Migro palazzo: ${oldPalace.name}`, pct);

    try {
      const newPalace = await createPalace(oldPalace.name, oldPalace.description);
      migratedPalaces++;

      const images: any[] = oldPalace.images ?? [];
      for (let ii = 0; ii < images.length; ii++) {
        const oldImage = images[ii];
        let localFilePath: string | undefined;

        // Migrate image data
        try {
          const imageData: string | undefined = oldImage.dataUrl;
          if (imageData) {
            const res = await saveBase64Image(imageData, oldImage.fileName || 'image.jpg', 'palace_images');
            localFilePath = res.relativePath;
          }
          // IndexedDB-stored images cannot be accessed from migration context
          // (IndexedDB is async/same-origin but we can attempt it)
          else if (oldImage.indexedDBKey) {
            try {
              const blob = await readFromIndexedDB(oldImage.indexedDBKey);
              if (blob) {
                const base64 = await blobToBase64(blob);
                const res = await saveBase64Image(base64, oldImage.fileName || 'image.jpg', 'palace_images');
                localFilePath = res.relativePath;
              }
            } catch {
              // Skip if IndexedDB read fails
            }
          }
        } catch (e) {
          console.warn('[migration] Failed to migrate image data:', e);
        }

        let width = oldImage.width ?? 0;
        let height = oldImage.height ?? 0;
        const detected360 = oldImage.is360 ?? is360Image(width, height);

        const newImage = await addPalaceImage({
          palaceId: newPalace.id,
          name: oldImage.name || `Stanza ${ii + 1}`,
          fileName: oldImage.fileName || 'image.jpg',
          localFilePath,
          width,
          height,
          is360: detected360,
          sortOrder: ii,
        });
        migratedImages++;

        // Migrate annotations
        const annotations: any[] = oldImage.annotations ?? [];
        for (const oldAnn of annotations) {
          try {
            await dbAddAnnotation({
              imageId: newImage.id,
              text: oldAnn.text || '',
              note: oldAnn.note,
              posX: oldAnn.position?.x ?? 0,
              posY: oldAnn.position?.y ?? 0,
              posZ: oldAnn.position?.z ?? 0,
              rotX: oldAnn.rotation?.x ?? 0,
              rotY: oldAnn.rotation?.y ?? 0,
              rotZ: oldAnn.rotation?.z ?? 0,
              isGenerated: oldAnn.isGenerated ?? false,
              aiPrompt: oldAnn.aiPrompt,
            });
            migratedAnnotations++;
          } catch (e) {
            console.warn('[migration] Failed to migrate annotation:', e);
          }
        }
      }
    } catch (e) {
      console.error('[migration] Failed to migrate palace:', oldPalace.name, e);
    }
  }

  onProgress('Pulizia dati vecchi…', 95);

  // Mark migration as done
  await setSetting(MIGRATION_FLAG, true);

  // Optionally clear old localStorage data (keep as backup for 1 launch)
  localStorage.setItem('mnemorium_palaces_backup', raw);
  localStorage.removeItem(LS_KEY);

  onProgress('Migrazione completata!', 100);

  return { migratedPalaces, migratedImages, migratedAnnotations };
}

// ─── IndexedDB helper ─────────────────────────────────────────────────────────

function readFromIndexedDB(key: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open('mnemorium-images', 1);
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('images')) {
        resolve(null);
        return;
      }
      const tx = db.transaction(['images'], 'readonly');
      const store = tx.objectStore('images');
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result ?? null);
      getReq.onerror = () => resolve(null);
    };
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

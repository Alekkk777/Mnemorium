/**
 * exportImport.ts
 * Export/Import logic for Tauri desktop app.
 * Uses Tauri dialog + fs plugins instead of browser download links.
 * Falls back to browser Blob download when running outside Tauri (dev mode).
 */

import { Palace, ExportData } from '@/types';
import { readImageAsBase64, saveBase64Image } from './tauriImageStorage';
import { getPalaces, createPalace, addPalaceImage, addAnnotation } from './tauriStorage';

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportBackup(palaces: Palace[]): Promise<void> {
  try {
    // Embed images as base64 in the export file
    const imagesMap: Record<string, string> = {};

    for (const palace of palaces) {
      for (const image of palace.images) {
        if (image.localFilePath) {
          try {
            const b64 = await readImageAsBase64(image.localFilePath);
            imagesMap[image.localFilePath] = b64;
          } catch {
            // Skip unreadable images
          }
        }
        for (const annotation of image.annotations) {
          if (annotation.imageFilePath) {
            try {
              const b64 = await readImageAsBase64(annotation.imageFilePath);
              imagesMap[annotation.imageFilePath] = b64;
            } catch {
              // Skip
            }
          }
        }
      }
    }

    const exportData: ExportData & { images?: Record<string, string> } = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      palaces,
      images: Object.keys(imagesMap).length > 0 ? imagesMap : undefined,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const fileName = `mnemorium-backup-${Date.now()}.mnemorium`;

    if (isTauri()) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — plugin installed at Tauri build time
      const { save } = await import('@tauri-apps/plugin-dialog');
      // @ts-ignore
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: 'Mnemorium Backup', extensions: ['mnemorium', 'json'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, dataStr);
      }
    } else {
      // Browser fallback for dev mode
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Errore durante l'export:", error);
    throw new Error('Impossibile esportare il backup');
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importBackup(): Promise<void> {
  try {
    let dataStr: string;

    if (isTauri()) {
      // @ts-ignore — plugin installed at Tauri build time
      const { open } = await import('@tauri-apps/plugin-dialog');
      // @ts-ignore
      const { readTextFile } = await import('@tauri-apps/plugin-fs');

      const filePath = await open({
        filters: [{ name: 'Mnemorium Backup', extensions: ['mnemorium', 'json'] }],
        multiple: false,
      });

      if (!filePath || typeof filePath !== 'string') return;
      dataStr = await readTextFile(filePath);
    } else {
      // Browser fallback: open file picker
      dataStr = await new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mnemorium,.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) { reject(new Error('No file selected')); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        };
        input.click();
      });
    }

    const backup = JSON.parse(dataStr);
    if (!backup.palaces || !Array.isArray(backup.palaces)) {
      throw new Error('Formato backup non valido');
    }

    // Restore embedded images
    const keyRemap: Record<string, string> = {};
    if (backup.images && typeof backup.images === 'object') {
      for (const [oldPath, b64] of Object.entries(backup.images)) {
        try {
          const ext = oldPath.split('.').pop() ?? 'jpg';
          const fileName = `imported_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const subdir = oldPath.includes('annotation') ? 'annotation_images' : 'palace_images';
          const result = await saveBase64Image(b64 as string, fileName, subdir);
          keyRemap[oldPath] = result.relativePath;
        } catch {
          console.error(`Failed to restore image: ${oldPath}`);
        }
      }
    }

    // Restore palaces
    for (const palaceData of backup.palaces) {
      const row = await createPalace(palaceData.name, palaceData.description);
      const palaceId = row.id;

      for (const imageData of (palaceData.images ?? [])) {
        const newLocalPath = imageData.localFilePath
          ? keyRemap[imageData.localFilePath] ?? imageData.localFilePath
          : undefined;

        const imageRow = await addPalaceImage({
          palaceId,
          name: imageData.name,
          fileName: imageData.fileName,
          localFilePath: newLocalPath,
          width: imageData.width ?? 0,
          height: imageData.height ?? 0,
          is360: imageData.is360 ?? false,
          sortOrder: 0,
        });

        for (const ann of (imageData.annotations ?? [])) {
          const newImageFilePath = ann.imageFilePath
            ? keyRemap[ann.imageFilePath] ?? ann.imageFilePath
            : undefined;

          await addAnnotation({
            imageId: imageRow.id,
            text: ann.text,
            note: ann.note,
            posX: ann.position?.x ?? 0,
            posY: ann.position?.y ?? 0,
            posZ: ann.position?.z ?? 0,
            rotX: ann.rotation?.x ?? 0,
            rotY: ann.rotation?.y ?? 0,
            rotZ: ann.rotation?.z ?? 0,
            isGenerated: ann.isGenerated ?? false,
            imageFilePath: newImageFilePath,
            aiPrompt: ann.aiPrompt,
          });
        }
      }
    }
  } catch (error) {
    console.error("Errore durante l'import:", error);
    throw new Error('Impossibile importare il backup: ' + (error as Error).message);
  }
}

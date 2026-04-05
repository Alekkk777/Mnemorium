import { useState } from 'react';
import { Copy, Image as ImagesIcon } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { usePalaceStore } from '@/lib/store';
import { saveImageFile, is360Image } from '@/lib/tauriImageStorage';

interface StandardPalacesGalleryProps {
  onClose: () => void;
}

export default function StandardPalacesGallery({ onClose }: StandardPalacesGalleryProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [palaceName, setPalaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addPalace, addImage } = usePalaceStore();

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith('image/') && f.size <= 50 * 1024 * 1024
    );

    if (files.length === 0) {
      setError('Nessuna immagine valida selezionata');
      return;
    }

    setSelectedFiles(files);
    if (!palaceName && files[0]) {
      setPalaceName(files[0].name.replace(/\.[^/.]+$/, '') || 'Palazzo Standard');
    }
    setError(null);
  };

  const handleCreate = async () => {
    if (!palaceName.trim()) {
      setError('Inserisci un nome per il palazzo');
      return;
    }
    if (selectedFiles.length === 0) {
      setError('Seleziona almeno una immagine');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const palace = await addPalace({
        name: palaceName.trim(),
        description: `Palazzo standard — ${selectedFiles.length} immagini`,
      });

      for (const file of selectedFiles) {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => { resolve({ width: img.width, height: img.height }); URL.revokeObjectURL(url); };
          img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
          img.src = url;
        });

        const { relativePath } = await saveImageFile(file, 'palace_images');

        await addImage(palace._id, {
          name: file.name,
          fileName: file.name,
          localFilePath: relativePath,
          width: dimensions.width,
          height: dimensions.height,
          is360: is360Image(dimensions.width, dimensions.height),
        });
      }

      onClose();
    } catch (err) {
      console.error('Error creating standard palace:', err);
      setError('Errore durante la creazione del palazzo');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Carica Palazzo da Immagini"
      size="lg"
    >
      <ModalBody>
        <div className="space-y-6">
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-foreground mb-1 font-medium">Come funziona</p>
            <p className="text-xs text-muted">
              Seleziona tutte le foto 360° che vuoi usare nel palazzo.
              Verranno salvate localmente sul tuo computer.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nome del Palazzo *
            </label>
            <input
              type="text"
              value={palaceName}
              onChange={(e) => setPalaceName(e.target.value)}
              placeholder="Es: Foro Romano, Biblioteca Classica..."
              className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Seleziona Immagini *
            </label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-accent transition-colors bg-surface">
              <div className="flex flex-col items-center pt-5 pb-6">
                <ImagesIcon className="w-12 h-12 text-muted mb-3" />
                <p className="text-sm text-muted font-medium mb-1">
                  Clicca per selezionare le immagini
                </p>
                <p className="text-xs text-muted">
                  Seleziona più file con Ctrl/Cmd+click
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesSelect}
                className="hidden"
                disabled={isCreating}
              />
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="p-4 bg-surface rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">
                {selectedFiles.length} immagini selezionate
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {selectedFiles.slice(0, 5).map((file, index) => (
                  <p key={index} className="text-xs text-muted truncate">{file.name}</p>
                ))}
                {selectedFiles.length > 5 && (
                  <p className="text-xs text-muted italic">
                    ... e altre {selectedFiles.length - 5} immagini
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 text-muted hover:text-foreground hover:bg-white/10 rounded-lg transition-colors"
          disabled={isCreating}
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !palaceName.trim() || selectedFiles.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Copy className="w-4 h-4" />
          {isCreating ? 'Creazione...' : 'Crea Palazzo'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

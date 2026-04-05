import { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { usePalaceStore } from '@/lib/store';
import { saveImageFile, is360Image } from '@/lib/tauriImageStorage';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';

interface CreatePalaceProps {
  onClose: () => void;
}

export default function CreatePalace({ onClose }: CreatePalaceProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addPalace, addImage } = usePalaceStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const validFiles = selectedFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Solo file immagine sono supportati');
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('Le immagini devono essere sotto i 50MB');
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Inserisci un nome per il palazzo');
      return;
    }

    if (files.length === 0) {
      setError('Carica almeno una immagine');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const palace = await addPalace({ name: name.trim(), description: description.trim() });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Get image dimensions
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
            URL.revokeObjectURL(url);
          };
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
      console.error('Error creating palace:', err);
      setError('Errore durante la creazione del palazzo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Crea Palazzo da Zero"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-6">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: La mia casa, Ufficio, Università..."
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent"
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descrizione (opzionale)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi brevemente questo palazzo..."
                rows={3}
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                disabled={isUploading}
              />
            </div>

            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">Come creare foto 360°</p>
                <p className="text-muted">
                  Usa la app Google Street View per creare immagini panoramiche dei tuoi ambienti.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Immagini 360° *
              </label>

              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-accent transition-colors bg-surface">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-muted mb-2" />
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-foreground">Clicca per caricare</span> o trascina qui
                  </p>
                  <p className="text-xs text-muted mt-1">PNG, JPG fino a 50MB</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-4 p-1 hover:bg-white/10 rounded transition-colors"
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4 text-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-muted hover:text-foreground hover:bg-white/10 rounded-lg transition-colors"
            disabled={isUploading}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isUploading || !name.trim() || files.length === 0}
            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Creazione...' : 'Crea Palazzo'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

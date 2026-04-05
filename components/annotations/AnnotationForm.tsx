// components/annotations/AnnotationForm.tsx
import { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { usePalaceStore, useUIStore } from '@/lib/store';

interface AnnotationFormProps {
  palaceId: string;
  imageId: string;
}

export default function AnnotationForm({ palaceId, imageId }: AnnotationFormProps) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addAnnotation } = usePalaceStore();
  const { setAnnotationFormOpen } = useUIStore();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida
    if (!file.type.startsWith('image/')) {
      setError('Solo file immagine sono supportati');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB max per immagini annotazioni
      setError('L\'immagine deve essere sotto i 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setError('Inserisci il testo dell\'annotazione');
      return;
    }

    if (!note.trim()) {
      setError('Inserisci una nota');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Salva l'immagine se presente
      let imageUrl: string | undefined;

      if (imageFile) {
        if ((window as any).__TAURI__) {
          const { saveImageFile: saveFn } = await import('@/lib/tauriImageStorage');
          const result = await saveFn(imageFile, 'annotation_images');
          imageUrl = result.relativePath;
        } else {
          imageUrl = imagePreview ?? undefined;
        }
      }

      // Posizione casuale per ora (TODO: permettere selezione click su viewer)
      const position = {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
      };

      // Aggiungi l'annotazione
      addAnnotation(palaceId, imageId, {
        text: text.trim(),
        note: note.trim(),
        position,
        rotation: { x: 0, y: 0, z: 0 },
        width: 100,
        height: 100,
        isVisible: true,
        selected: false,
        imageUrl,
        isGenerated: false,
      });

      // Chiudi il modal
      setAnnotationFormOpen(false);
    } catch (err) {
      console.error('Error creating annotation:', err);
      setError('Errore durante la creazione dell\'annotazione');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Nuova Annotazione</h2>
          <button
            onClick={() => setAnnotationFormOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Testo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Testo/Concetto *
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Es: Formula chimica del glucosio"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          {/* Nota */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota/Spiegazione *
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Descrivi l'immagine mentale o la mnemonica..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Immagine (opzionale) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Immagine Associata (opzionale)
            </label>
            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Carica un'immagine
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG fino a 5MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setAnnotationFormOpen(false)}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Aggiunta...' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
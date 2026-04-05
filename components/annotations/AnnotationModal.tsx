import { useState, useRef, useEffect } from 'react';
import { X, Upload, Pencil, Eraser, Save, Palette } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { usePalaceStore } from '@/lib/store';
import { saveImageFile } from '@/lib/tauriImageStorage';
import { Annotation } from '@/types';

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  palaceId: string;
  imageId: string;
  position: { x: number; y: number; z: number };
  editingAnnotation?: Annotation | null;
}

type DrawMode = 'none' | 'draw' | 'erase';

export default function AnnotationModal({
  isOpen,
  onClose,
  palaceId,
  imageId,
  position,
  editingAnnotation,
}: AnnotationModalProps) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [imageSource, setImageSource] = useState<'none' | 'upload' | 'draw'>('none');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('draw');
  const [brushSize, setBrushSize] = useState(3);
  const [color, setColor] = useState('#e2e8f0');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const { addAnnotation, updateAnnotation } = usePalaceStore();

  useEffect(() => {
    if (editingAnnotation) {
      setText(editingAnnotation.text);
      setNote(editingAnnotation.note || '');
      if (editingAnnotation.imageUrl) {
        setImagePreview(editingAnnotation.imageUrl);
        setImageSource('upload');
      }
    } else {
      setText('');
      setNote('');
      setImageSource('none');
      setImagePreview(null);
      setImageFile(null);
    }
  }, [editingAnnotation, isOpen]);

  useEffect(() => {
    if (imageSource === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [imageSource]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo file immagine sono supportati');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("L'immagine deve essere sotto i 5MB");
      return;
    }

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setError(null);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === 'draw') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    } else {
      ctx.strokeStyle = '#1a1a28';
      ctx.lineWidth = brushSize * 2;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) {
      setError("Inserisci il testo dell'annotazione");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let imageFilePath: string | undefined;
      let imageUrl: string | undefined;

      if (imageSource === 'draw' && canvasRef.current) {
        // Drawing saved as dataUrl (small enough inline)
        imageUrl = canvasRef.current.toDataURL('image/png');
      } else if (imageSource === 'upload' && imageFile) {
        if ((window as any).__TAURI__) {
          const { relativePath } = await saveImageFile(imageFile, 'annotation_images');
          imageFilePath = relativePath;
        } else {
          // Dev fallback: use object URL / preview
          imageUrl = imagePreview ?? undefined;
        }
      }

      if (editingAnnotation) {
        await updateAnnotation(palaceId, imageId, editingAnnotation.id, {
          text: text.trim(),
          note: note.trim(),
          imageUrl,
          imageFilePath,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addAnnotation(palaceId, imageId, {
          text: text.trim(),
          note: note.trim(),
          position,
          rotation: { x: 0, y: 0, z: 0 },
          width: 1,
          height: 1,
          isVisible: true,
          selected: false,
          imageUrl,
          imageFilePath,
          isGenerated: false,
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving annotation:', err);
      setError('Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAnnotation ? 'Modifica Annotazione' : 'Nuova Annotazione'}
      size="lg"
    >
      <div>
        <ModalBody>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Testo/Concetto *
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Es: Formula chimica del glucosio"
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nota/Spiegazione
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Descrivi l'immagine mentale..."
                rows={4}
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Immagine Associata (opzionale)
              </label>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['none', 'upload', 'draw'] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImageSource(src)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      imageSource === src
                        ? 'bg-accent text-white'
                        : 'bg-surface text-muted hover:text-foreground hover:bg-white/10'
                    }`}
                  >
                    {src === 'none' && 'Nessuna'}
                    {src === 'upload' && <><Upload className="w-4 h-4" /> Carica</>}
                    {src === 'draw' && <><Pencil className="w-4 h-4" /> Disegna</>}
                  </button>
                ))}
              </div>

              {imageSource === 'upload' && (
                <div>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full rounded-lg max-h-64 object-contain bg-surface"
                      />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 p-2 bg-surface rounded-lg shadow-lg hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-accent transition-colors bg-surface">
                      <div className="flex flex-col items-center pt-5 pb-6">
                        <Upload className="w-12 h-12 text-muted mb-3" />
                        <p className="text-sm text-muted font-medium mb-1">Carica un&apos;immagine</p>
                        <p className="text-xs text-muted">PNG, JPG fino a 5MB</p>
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
              )}

              {imageSource === 'draw' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-surface rounded-lg">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawMode('draw')}
                        className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium ${
                          drawMode === 'draw' ? 'bg-accent text-white' : 'bg-white/10 text-muted hover:text-foreground'
                        }`}
                      >
                        <Pencil className="w-4 h-4" /> Disegna
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawMode('erase')}
                        className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium ${
                          drawMode === 'erase' ? 'bg-accent text-white' : 'bg-white/10 text-muted hover:text-foreground'
                        }`}
                      >
                        <Eraser className="w-4 h-4" /> Gomma
                      </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <Palette className="w-4 h-4 text-muted" />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-white/10"
                      />
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-xs text-muted w-8">{brushSize}px</span>
                    </div>

                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3 py-2 bg-white/10 text-muted hover:text-foreground rounded text-sm font-medium"
                    >
                      Pulisci
                    </button>
                  </div>

                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={400}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full cursor-crosshair"
                      style={{ touchAction: 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-muted hover:text-foreground hover:bg-white/10 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Salvataggio...' : editingAnnotation ? 'Salva Modifiche' : 'Crea Annotazione'}
          </button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

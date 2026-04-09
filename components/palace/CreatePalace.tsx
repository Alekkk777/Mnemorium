import { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { usePalaceStore } from '@/lib/store';
import { is360Image, getImageUrl } from '@/lib/tauriImageStorage';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';

interface CreatePalaceProps {
  onClose: () => void;
}

interface SelectedFile {
  path: string;
  name: string;
}

async function invokeRust<T>(cmd: string, args?: unknown): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return (invoke as (c: string, a?: unknown) => Promise<T>)(cmd, args);
}

export default function CreatePalace({ onClose }: CreatePalaceProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addPalace, addImage } = usePalaceStore();

  const handlePickFiles = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'tiff'] }],
      });
      if (!result) return;
      const paths = Array.isArray(result) ? result : [result];
      const newFiles: SelectedFile[] = paths.map((p: string) => ({
        path: p,
        name: p.split('/').pop() || p.split('\\').pop() || p,
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setError(null);
    } catch (err) {
      console.error('File picker error:', err);
      setError('Could not open file picker');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { setError('Enter a name for the palace'); return; }
    if (selectedFiles.length === 0) { setError('Upload at least one image'); return; }

    setIsUploading(true);
    setError(null);

    try {
      const palace = await addPalace({ name: name.trim(), description: description.trim() });

      for (const file of selectedFiles) {
        // Copy file directly on disk (no base64 roundtrip)
        const result = await invokeRust<{ relative_path: string; absolute_path: string }>(
          'copy_image_from_path',
          { srcPath: file.path, subdir: 'palace_images' }
        );

        // Get dimensions via asset URL
        const assetUrl = await getImageUrl(result.relative_path);
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = assetUrl;
        });

        await addImage(palace._id, {
          name: file.name,
          fileName: file.name,
          localFilePath: result.relative_path,
          width: dimensions.width,
          height: dimensions.height,
          is360: is360Image(dimensions.width, dimensions.height),
        });
      }

      onClose();
    } catch (err) {
      console.error('Error creating palace:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create Palace from Scratch"
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
                Palace Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g.: My house, Office, University..."
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent"
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe this palace..."
                rows={3}
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                disabled={isUploading}
              />
            </div>

            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">How to create 360° photos</p>
                <p className="text-muted">
                  Use the Google Street View app to create panoramic images of your environments.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                360° Images *
              </label>

              <button
                type="button"
                onClick={handlePickFiles}
                disabled={isUploading}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-accent transition-colors bg-surface disabled:opacity-50"
              >
                <Upload className="w-10 h-10 text-muted mb-2" />
                <p className="text-sm text-muted">
                  <span className="font-semibold text-foreground">Click to choose images</span>
                </p>
                <p className="text-xs text-muted mt-1">PNG, JPG, WEBP — 360° or standard</p>
              </button>

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg"
                    >
                      <p className="text-sm font-medium text-foreground truncate flex-1">{file.name}</p>
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading || !name.trim() || selectedFiles.length === 0}
            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Creating...' : 'Create Palace'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

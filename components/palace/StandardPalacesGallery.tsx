import { useState, useEffect, useRef } from 'react';
import { Copy, Image as ImagesIcon, X as XIcon } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { usePalaceStore } from '@/lib/store';
import { saveImageFile, is360Image } from '@/lib/tauriImageStorage';

interface StandardPalacesGalleryProps {
  onClose: () => void;
}

export default function StandardPalacesGallery({ onClose }: StandardPalacesGalleryProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [palaceName, setPalaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thumbUrlsRef = useRef<string[]>([]);

  const { addPalace, addImage } = usePalaceStore();

  // Revoke all blob URLs when files change or component unmounts
  useEffect(() => {
    const urls = selectedFiles.map(f => URL.createObjectURL(f));
    thumbUrlsRef.current = urls;
    setThumbnails(urls);
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [selectedFiles]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith('image/') && f.size <= 50 * 1024 * 1024
    );

    if (files.length === 0) {
      setError('No valid images selected');
      return;
    }

    setSelectedFiles(files);
    if (!palaceName && files[0]) {
      setPalaceName(files[0].name.replace(/\.[^/.]+$/, '') || 'Standard Palace');
    }
    setError(null);
  };

  const handleCreate = async () => {
    if (!palaceName.trim()) {
      setError('Enter a name for the palace');
      return;
    }
    if (selectedFiles.length === 0) {
      setError('Select at least one image');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const palace = await addPalace({
        name: palaceName.trim(),
        description: `Standard palace — ${selectedFiles.length} images`,
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
      setError('Error creating the palace');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upload Palace from Images"
      size="lg"
    >
      <ModalBody>
        <div className="space-y-6">
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-foreground mb-1 font-medium">How it works</p>
            <p className="text-xs text-muted">
              Select all the 360° photos you want to use in the palace.
              They will be saved locally on your computer.
            </p>
          </div>

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
              value={palaceName}
              onChange={(e) => setPalaceName(e.target.value)}
              placeholder="E.g.: Roman Forum, Classic Library..."
              className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Images *
            </label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-accent transition-colors bg-surface">
              <div className="flex flex-col items-center pt-5 pb-6">
                <ImagesIcon className="w-12 h-12 text-muted mb-3" />
                <p className="text-sm text-muted font-medium mb-1">
                  Click to select images
                </p>
                <p className="text-xs text-muted">
                  Select multiple files with Ctrl/Cmd+click
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
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'} selected
                </p>
                <p className="text-xs text-muted">
                  {(selectedFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(1)} MB total
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {thumbnails.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={selectedFiles[index]?.name}
                      className="w-full h-full object-cover rounded-lg bg-surface"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-0.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isCreating}
                    >
                      <XIcon className="w-3 h-3 text-white" />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 text-[9px] text-white bg-black/60 truncate px-1 py-0.5 rounded-b-lg">
                      {selectedFiles[index]?.name}
                    </p>
                  </div>
                ))}
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
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !palaceName.trim() || selectedFiles.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Copy className="w-4 h-4" />
          {isCreating ? 'Creating...' : 'Create Palace'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

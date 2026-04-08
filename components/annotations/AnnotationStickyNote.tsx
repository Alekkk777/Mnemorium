/**
 * AnnotationStickyNote.tsx
 * Inline quick-add annotation in the 3D viewer.
 * Opened by pressing N or clicking a spot in the canvas.
 * Saves directly via store.addAnnotation without opening the full modal.
 */
import { useState, useEffect, useRef } from 'react';
import { usePalaceStore } from '@/lib/store';

interface AnnotationStickyNoteProps {
  palaceId: string;
  imageId: string;
  position: { x: number; y: number; z: number };
  screenX: number;
  screenY: number;
  onClose: () => void;
  onSaved?: (annotationId: string) => void;
}

export default function AnnotationStickyNote({
  palaceId,
  imageId,
  position,
  screenX,
  screenY,
  onClose,
  onSaved,
}: AnnotationStickyNoteProps) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addAnnotation } = usePalaceStore();

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes, keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const ann = await addAnnotation(palaceId, imageId, {
        text: text.trim(),
        note: '',
        position,
        rotation: { x: 0, y: 0, z: 0 },
        width: 1,
        height: 1,
        isVisible: true,
        selected: false,
        isGenerated: false,
      });
      onSaved?.(ann.id);
      onClose();
    } catch (err) {
      console.error('Failed to save quick annotation:', err);
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Position the note near the click point, clamping to viewport
  const CARD_W = 260;
  const CARD_H = 80;
  const left = Math.min(screenX, window.innerWidth - CARD_W - 12);
  const top = Math.min(screenY + 12, window.innerHeight - CARD_H - 12);

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-64 shadow-2xl"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-surface border border-accent/40 rounded-xl overflow-hidden">
          <div className="px-3 py-1.5 bg-accent/20 border-b border-accent/20 flex items-center justify-between">
            <span className="text-xs text-accent font-medium">New annotation</span>
            <span className="text-xs text-muted opacity-60">Enter to save</span>
          </div>
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write the concept..."
              className="w-full bg-transparent text-sm text-foreground placeholder-muted outline-none py-1"
              disabled={isSaving}
              maxLength={200}
            />
          </div>
          <div className="px-2 pb-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs text-muted hover:text-foreground rounded transition-colors"
            >
              Esc
            </button>
            <button
              onClick={handleSave}
              disabled={!text.trim() || isSaving}
              className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {isSaving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

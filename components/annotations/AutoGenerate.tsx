// components/annotations/AutoGenerate.tsx - CORRETTO
import { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { Palace } from '@/types';
import { usePalaceStore } from '@/lib/store';
import { useAIGeneration } from '@/hooks/useAIGeneration';

interface AutoGenerateProps {
  palace: Palace;
  onClose: () => void;
}

export default function AutoGenerate({ palace, onClose }: AutoGenerateProps) {
  const [notesText, setNotesText] = useState('');
  const [targetCount, setTargetCount] = useState(10);

  const { addAnnotation } = usePalaceStore();
  const { isGenerating, error, progress, setProgress, setError, generate, isAIEnabled } = useAIGeneration();

  const handleGenerate = async () => {
    if (!notesText.trim()) {
      setError('Enter some text to generate annotations from');
      return;
    }

    const generated = await generate({ notesText, targetCount, imagesCount: palace.images.length });
    if (!generated) return;

    setProgress(`Generated ${generated.length} annotations. Adding to palace...`);

    await Promise.all(
      generated.map((annotation) => {
        const imageId = palace.images[annotation.imageIndex]?.id;
        if (!imageId) return Promise.resolve();
        const position = {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 2,
        };
        return addAnnotation(palace._id, imageId, {
          text: annotation.description,
          note: annotation.note,
          position,
          rotation: { x: 0, y: 0, z: 0 },
          width: 100,
          height: 100,
          isVisible: true,
          selected: false,
          isGenerated: true,
        });
      })
    );

    setProgress('Completed!');
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Generate with AI</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isAIEnabled() && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">API Key not configured</p>
                <p>
                  Go to Settings and add your OpenAI API key to use this feature.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes to Memorize
            </label>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Paste your notes here...&#10;&#10;E.g.: Glucose (C6H12O6) is a monosaccharide..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Annotations
            </label>
            <input
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value) || 10)}
              min={1}
              max={50}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-2">
              They will be distributed across the {palace.images.length} images of the palace
            </p>
          </div>

          {progress && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-3">
                {isGenerating && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                )}
                <p className="text-sm text-purple-800">{progress}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !isAIEnabled()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Annotations
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
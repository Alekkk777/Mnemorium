// components/palace/PalaceCreationChoice.tsx - Modal scelta tipo creazione
import { useState } from 'react';
import { Plus, Library, X } from 'lucide-react';
import { Modal, ModalBody } from '../ui/Modal';
import CreatePalace from './CreatePalace';
import StandardPalacesGallery from './StandardPalacesGallery';

interface PalaceCreationChoiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PalaceCreationChoice({ isOpen, onClose }: PalaceCreationChoiceProps) {
  const [showCreatePalace, setShowCreatePalace] = useState(false);
  const [showStandardGallery, setShowStandardGallery] = useState(false);

  if (showCreatePalace) {
    return <CreatePalace onClose={onClose} />;
  }

  if (showStandardGallery) {
    return <StandardPalacesGallery onClose={onClose} />;
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Create New Palace"
      size="md"
    >
      <ModalBody>
        <div className="py-8">
          <p className="text-center text-gray-600 mb-8">
            Choose how you want to create your memory palace
          </p>

          <div className="grid gap-4">
            {/* Opzione 1: Crea da Zero */}
            <button
              onClick={() => setShowCreatePalace(true)}
              className="group relative overflow-hidden rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-blue-500 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg group-hover:bg-blue-600 transition-colors">
                  <Plus className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Create from Scratch
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload your personal 360° photos (home, office, visited places) and create a fully customized palace
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 font-medium">
                    <span>Maximum customization</span>
                    <span>•</span>
                    <span>100% yours</span>
                  </div>
                </div>
              </div>
            </button>

            {/* Opzione 2: Usa Palazzo Standard */}
            <button
              onClick={() => setShowStandardGallery(true)}
              className="group relative overflow-hidden rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-purple-500 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg group-hover:bg-purple-600 transition-colors">
                  <Library className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Use Standard Palace
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose from pre-configured palaces (e.g.: Roman Forum, Lab, Library) with annotations already set up
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-purple-600 font-medium">
                    <span>Ready immediately</span>
                    <span>•</span>
                    <span>With examples</span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> If it&apos;s your first time, try a standard palace first to understand how it works, then create your own!
            </p>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
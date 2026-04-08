// components/annotations/AnnotationList.tsx - COMPLETO
import { useState, useEffect } from 'react';
import { Palace, Annotation } from '@/types';
import { usePalaceStore } from '@/lib/store';
import { Trash2, Plus, Sparkles, Edit2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import AnnotationModal from './AnnotationModal';
import ImprovedAIFlow from './ImprovedAIFlow';
import { getImageUrl } from '@/lib/tauriImageStorage';

interface AnnotationListProps {
  palace: Palace;
}

export default function AnnotationList({ palace }: AnnotationListProps) {
  const { currentImageIndex, deleteAnnotation } = usePalaceStore();
  const [isAIFlowOpen, setIsAIFlowOpen] = useState(false);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  const currentImage = palace.images[currentImageIndex];
  const annotations = currentImage?.annotations || [];

  const handleDelete = async (annotationId: string) => {
    if (confirm('Delete this annotation?')) {
      await deleteAnnotation(palace._id, currentImage.id, annotationId);
    }
  };

  const handleEdit = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setIsAnnotationModalOpen(true);
  };

  const handleView = (annotation: Annotation) => {
    setSelectedAnnotation(selectedAnnotation?.id === annotation.id ? null : annotation);
  };

  const handleCloseModal = () => {
    setIsAnnotationModalOpen(false);
    setEditingAnnotation(null);
  };

  const handleNewAnnotation = () => {
    setEditingAnnotation(null);
    setIsAnnotationModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleNewAnnotation}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
      >
        <Plus className="w-5 h-5" />
        New Annotation
      </button>

      <button
        onClick={() => setIsAIFlowOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
      >
        <Sparkles className="w-5 h-5" />
        Generate with AI
      </button>

      {annotations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No annotations</p>
          <p className="text-xs mt-1">Add one to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {annotations.length} {annotations.length === 1 ? 'Annotation' : 'Annotations'}
          </h3>

          {annotations.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              isExpanded={selectedAnnotation?.id === annotation.id}
              onView={() => handleView(annotation)}
              onEdit={() => handleEdit(annotation)}
              onDelete={() => handleDelete(annotation.id)}
            />
          ))}
        </div>
      )}

      {isAnnotationModalOpen && (
        <AnnotationModal
          isOpen={isAnnotationModalOpen}
          onClose={handleCloseModal}
          palaceId={palace._id}
          imageId={currentImage.id}
          position={editingAnnotation?.position || { x: 0, y: 0, z: 0 }}
          editingAnnotation={editingAnnotation}
        />
      )}
      
      {isAIFlowOpen && (
        <ImprovedAIFlow
          palace={palace}
          onClose={() => setIsAIFlowOpen(false)}
        />
      )}
    </div>
  );
}

interface AnnotationCardProps {
  annotation: Annotation;
  isExpanded: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AnnotationCard({ annotation, isExpanded, onView, onEdit, onDelete }: AnnotationCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        if (annotation.imageFilePath) {
          const url = await getImageUrl(annotation.imageFilePath);
          if (isMounted) setImageUrl(url);
        } else if (annotation.imageUrl) {
          if (isMounted) setImageUrl(annotation.imageUrl);
        }
      } catch (error) {
        console.error('Error loading annotation image:', error);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [annotation.imageFilePath, annotation.imageUrl]);

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900">
              {annotation.text}
            </h4>
          </div>

          <div className="flex gap-1">
            <button
              onClick={onView}
              className="p-1.5 hover:bg-blue-100 rounded transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-600" />
              )}
            </button>
            
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-green-100 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-green-600" />
            </button>

            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>

        {!isExpanded && annotation.note && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {annotation.note}
          </p>
        )}

        {annotation.isGenerated && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs mt-2">
            <Sparkles className="w-3 h-3" />
            AI Generated
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
          {annotation.note && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {annotation.note}
            </p>
          )}

          {imageUrl && (
            <img
              src={imageUrl}
              alt={annotation.text}
              className="rounded-lg w-full max-h-48 object-contain bg-white border border-gray-200"
            />
          )}
        </div>
      )}
    </div>
  );
}
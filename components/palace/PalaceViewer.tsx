// components/palace/PalaceViewer.tsx - VERSIONE MIGLIORATA
import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Palace, Annotation } from '@/types';
import { usePalaceStore, useUIStore } from '@/lib/store';
import { getImageUrl } from '@/lib/tauriImageStorage';
import { ChevronLeft, ChevronRight, Eye, EyeOff, MousePointer, Edit2, Plus } from 'lucide-react';
import AnnotationModal from '../annotations/AnnotationModal';
import ImprovedAIFlow from '../annotations/ImprovedAIFlow';

interface PalaceViewerProps {
  palace: Palace;
}

export default function PalaceViewer({ palace }: PalaceViewerProps) {
  const { currentImageIndex, setCurrentImage } = usePalaceStore();
  const { setAnnotationFormOpen } = useUIStore();
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isPlacingAnnotation, setIsPlacingAnnotation] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [showAIFlow, setShowAIFlow] = useState(false);
  
  // 🆕 Tooltip state
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);

  const currentImage = palace.images[currentImageIndex];
  const totalAnnotations = currentImage?.annotations.length || 0;

  // Carica l'immagine (Tauri filesystem o data URL legacy)
  useEffect(() => {
    let revoked = false;
    const loadImage = async () => {
      if (!currentImage) return;

      if (currentImage.localFilePath) {
        try {
          const url = await getImageUrl(currentImage.localFilePath);
          if (!revoked) setImageUrl(url);
        } catch (e) {
          console.error('[PalaceViewer] Failed to load image:', e);
        }
      } else if (currentImage.dataUrl) {
        setImageUrl(currentImage.dataUrl);
      } else if (currentImage.indexedDBKey) {
        // Legacy fallback: IndexedDB (web app data, pre-migration)
        try {
          const { imageDB } = await import('@/lib/imageDB');
          const url = await imageDB.getImageUrl(currentImage.indexedDBKey);
          if (!revoked) setImageUrl(url);
        } catch (e) {
          console.error('[PalaceViewer] IndexedDB fallback failed:', e);
        }
      }
    };

    loadImage();

    return () => {
      revoked = true;
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [currentImage]);

  const handlePrevImage = () => {
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : palace.images.length - 1;
    setCurrentImage(newIndex);
    setSelectedAnnotationId(null);
  };

  const handleNextImage = () => {
    const newIndex = currentImageIndex < palace.images.length - 1 ? currentImageIndex + 1 : 0;
    setCurrentImage(newIndex);
    setSelectedAnnotationId(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingAnnotation) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    let position3D: { x: number; y: number; z: number };

    if (currentImage.is360) {
      const theta = x * Math.PI;
      const phi = (y * 0.5 + 0.5) * Math.PI;

      position3D = {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta)
      };
    } else {
      position3D = {
        x: x * 8,
        y: y * 4.5,
        z: -9
      };
    }

    setPendingPosition(position3D);
    setIsPlacingAnnotation(false);
    setIsModalOpen(true);
  };

  const handleEditAnnotation = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setPendingPosition(annotation.position);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAnnotation(null);
    setPendingPosition(null);
  };

  if (!currentImage || !imageUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Caricamento immagine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div 
        className="absolute inset-0"
        onClick={isPlacingAnnotation ? handleCanvasClick : undefined}
        style={{ cursor: isPlacingAnnotation ? 'crosshair' : 'default' }}
      >
        <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
          <Scene360
            imageUrl={imageUrl}
            annotations={currentImage.annotations}
            is360={currentImage.is360}
            showAnnotations={showAnnotations && !isPlacingAnnotation}
            selectedAnnotationId={selectedAnnotationId}
            onAnnotationClick={setSelectedAnnotationId}
            onEditAnnotation={handleEditAnnotation}
          />
        </Canvas>
      </div>

      {/* 🆕 Overlay istruzioni posizionamento - MIGLIORATO */}
      {isPlacingAnnotation && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none z-50">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <MousePointer className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Posiziona l'annotazione</h3>
                  <p className="text-sm text-gray-600">Clicca nell'immagine dove vuoi aggiungere la nota</p>
                </div>
              </div>

              {/* 🆕 Visual Guide */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-900 mb-2">💡 Suggerimento</p>
                <p className="text-xs text-blue-700">
                  Scegli un punto visivamente distintivo per facilitare il ricordo!
                </p>
              </div>

              <button
                onClick={() => setIsPlacingAnnotation(false)}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Quick Actions Toolbar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md rounded-2xl p-2 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-2">
            {/* Toggle Annotations */}
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              onMouseEnter={() => setHoveredControl('toggle')}
              onMouseLeave={() => setHoveredControl(null)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                showAnnotations
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline text-sm">
                {showAnnotations ? 'Nascondi' : 'Mostra'}
              </span>
              {hoveredControl === 'toggle' && (
                <Tooltip text={showAnnotations ? "Nascondi annotazioni" : "Mostra annotazioni"} />
              )}
            </button>

            {/* Add Annotation */}
            <button
              onClick={() => setIsPlacingAnnotation(true)}
              onMouseEnter={() => setHoveredControl('add')}
              onMouseLeave={() => setHoveredControl(null)}
              className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Nuova</span>
              {hoveredControl === 'add' && <Tooltip text="Aggiungi nuova annotazione" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls - MIGLIORATO */}
      {palace.images.length > 1 && !isPlacingAnnotation && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/70 backdrop-blur-md rounded-full px-6 py-3 shadow-2xl">
          <button
            onClick={handlePrevImage}
            className="p-2 hover:bg-white/20 rounded-full transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </button>
          
          <div className="text-center">
            <span className="text-white font-bold text-lg">
              {currentImageIndex + 1} / {palace.images.length}
            </span>
            <p className="text-xs text-gray-300">{currentImage.fileName}</p>
          </div>
          
          <button
            onClick={handleNextImage}
            className="p-2 hover:bg-white/20 rounded-full transition-colors group"
          >
            <ChevronRight className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {/* 🆕 Info Badge - MIGLIORATO */}
      {!isPlacingAnnotation && (
        <div className="absolute bottom-8 left-8 z-10">
          <div className="bg-black/70 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg">
            <div className="flex flex-col gap-2 text-white">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${currentImage.is360 ? 'bg-green-400' : 'bg-blue-400'}`} />
                <span className="text-sm font-medium">
                  {currentImage.is360 ? '360° Panorama' : 'Immagine Standard'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <span>{totalAnnotations} note</span>
                <span>•</span>
                <span>{currentImage.width}x{currentImage.height}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Modal */}
      {isModalOpen && pendingPosition && (
        <AnnotationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          palaceId={palace._id}
          imageId={currentImage.id}
          position={pendingPosition}
          editingAnnotation={editingAnnotation}
        />
      )}

      {/* AI Flow */}
      {showAIFlow && (
        <ImprovedAIFlow
          palace={palace}
          onClose={() => setShowAIFlow(false)}
        />
      )}
    </div>
  );
}

// 🆕 Tooltip Component
function Tooltip({ text }: { text: string }) {
  return (
    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 pointer-events-none animate-fadeIn">
      <div className="bg-gray-900 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap">
        {text}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

// Scene 3D Component (unchanged from original)
interface Scene360Props {
  imageUrl: string;
  annotations: Annotation[];
  is360: boolean;
  showAnnotations: boolean;
  selectedAnnotationId: string | null;
  onAnnotationClick: (id: string | null) => void;
  onEditAnnotation: (annotation: Annotation) => void;
}

function Scene360({ 
  imageUrl, 
  annotations, 
  is360, 
  showAnnotations, 
  selectedAnnotationId, 
  onAnnotationClick,
  onEditAnnotation 
}: Scene360Props) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
      }
    );
  }, [imageUrl]);

  if (!texture) return null;

  return (
    <>
      {is360 ? (
        <mesh>
          <sphereGeometry args={[500, 60, 40]} />
          <meshBasicMaterial map={texture} side={THREE.BackSide} />
        </mesh>
      ) : (
        <mesh position={[0, 0, -10]}>
          <planeGeometry args={[16, 9]} />
          <meshBasicMaterial map={texture} />
        </mesh>
      )}

      {showAnnotations && annotations.map((annotation) => (
        <AnnotationMarker
          key={annotation.id}
          annotation={annotation}
          is360={is360}
          isSelected={selectedAnnotationId === annotation.id}
          onClick={() => onAnnotationClick(annotation.id === selectedAnnotationId ? null : annotation.id)}
          onEdit={() => onEditAnnotation(annotation)}
        />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        rotateSpeed={-0.5}
        minDistance={0.1}
        maxDistance={is360 ? 1 : 50}
      />
    </>
  );
}

// Annotation Marker Component (unchanged from original)
interface AnnotationMarkerProps {
  annotation: Annotation;
  is360: boolean;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
}

/** Returns FSRS-based marker color: green=well-known, yellow=due soon, red=overdue, white=new */
function fsrsMarkerColor(annotation: Annotation): string {
  const card = annotation.fsrsCard;
  if (!card || card.state === 0) return '#ffffff'; // New
  const now = Date.now();
  if (!card.due) return '#10b981'; // No due date = well known
  const dueMs = card.due.getTime();
  const diff = dueMs - now;
  if (diff < 0) return '#ef4444';                 // Overdue — red
  if (diff < 24 * 60 * 60 * 1000) return '#f59e0b'; // Due within 24h — yellow
  return '#10b981';                               // Due in future — green
}

function AnnotationMarker({ annotation, is360, isSelected, onClick, onEdit }: AnnotationMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [annotationImageUrl, setAnnotationImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    const loadAnnotationImage = async () => {
      if (annotation.imageFilePath) {
        try {
          const url = await getImageUrl(annotation.imageFilePath);
          if (!revoked) setAnnotationImageUrl(url);
        } catch (error) {
          console.error('Error loading annotation image from filesystem:', error);
        }
      } else if (annotation.imageIndexedDBKey) {
        // Legacy IndexedDB fallback
        try {
          const { imageDB } = await import('@/lib/imageDB');
          const url = await imageDB.getImageUrl(annotation.imageIndexedDBKey);
          if (!revoked) setAnnotationImageUrl(url);
        } catch (error) {
          console.error('Error loading annotation image from IndexedDB:', error);
        }
      } else if (annotation.imageUrl) {
        setAnnotationImageUrl(annotation.imageUrl);
      }
    };

    loadAnnotationImage();

    return () => {
      revoked = true;
      if (annotationImageUrl && annotationImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(annotationImageUrl);
      }
    };
  }, [annotation]);

  const position: [number, number, number] = is360
    ? [
        annotation.position.x * 400,
        annotation.position.y * 400,
        annotation.position.z * 400,
      ]
    : [annotation.position.x * 8, annotation.position.y * 4.5, -9];

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        <sphereGeometry args={[isSelected ? 0.15 : 0.1, 16, 16]} />
        <meshBasicMaterial
          color={isSelected ? '#3b82f6' : hovered ? '#60a5fa' : fsrsMarkerColor(annotation)}
          transparent
          opacity={0.9}
        />
      </mesh>

      {(hovered || isSelected) && (
        <Html distanceFactor={10}>
          <div 
            className="bg-white rounded-lg shadow-2xl p-4 min-w-[280px] max-w-[400px] pointer-events-auto animate-fadeIn"
            style={{ transform: 'translate(-50%, -120%)' }}
          >
            <div className="mb-2">
              <h3 className="font-bold text-gray-900 text-lg mb-1">{annotation.text}</h3>
              {annotation.isGenerated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                  ✨ AI Generated
                </span>
              )}
            </div>
            
            {annotation.note && (
              <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{annotation.note}</p>
            )}
            
            {annotationImageUrl && (
              <img
                src={annotationImageUrl}
                alt={annotation.text}
                className="mt-2 rounded-lg w-full max-h-48 object-contain bg-gray-50"
              />
            )}

            {isSelected && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-2 bg-blue-50 rounded hover:bg-blue-100"
                >
                  <Edit2 className="w-3 h-3" />
                  Modifica
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium px-3 py-2 hover:bg-gray-100 rounded"
                >
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
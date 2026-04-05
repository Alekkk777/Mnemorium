// components/CreatePalaceModal.tsx - Convertito a Zustand
import React, { useState, useCallback } from "react";
import { usePalaceStore } from "@/lib/store";
import { compressImage } from "@/lib/imageUtils";
import styles from "../styles/components_style/CreatePalaceStyle/CreatePalaceModal.module.css";

interface CreatePalaceModalProps {
  onClose: () => void;
}

const CreatePalaceModal: React.FC<CreatePalaceModalProps> = ({ onClose }) => {
  const [palaceName, setPalaceName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addPalace } = usePalaceStore();

  // Gestisci la selezione dei file
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Valida i file
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 25 * 1024 * 1024) {
        alert(`${file.name} is too large (max 25MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Crea preview
    const newPreviewUrls: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviewUrls.push(e.target.result as string);
          if (newPreviewUrls.length === validFiles.length) {
            setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }, []);

  // Rimuovi un file selezionato
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Crea il palazzo
  const handleCreatePalace = useCallback(async () => {
    if (!palaceName.trim()) {
      setError("Please enter a palace name");
      return;
    }

    if (selectedFiles.length === 0) {
      setError("Please select at least one image");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("🏗️ Creating palace:", palaceName);
      console.log("📸 Processing", selectedFiles.length, "images...");

      // Comprimi tutte le immagini
      const compressedImages = await Promise.all(
          selectedFiles.map(async (file, index) => {
            console.log(`Compressing image ${index + 1}/${selectedFiles.length}...`);
            const base64 = await compressImage(file);
            
            return {
              id: `img_${Date.now()}_${index}`,
              name: file.name,
              fileName: file.name,
              dataUrl: base64,
              width: 2048,
              height: 1024,
              is360: true,
              annotations: [],
              createdAt: new Date().toISOString(),
            };
          })
        );

        await addPalace({
          name: palaceName,
          description: `Created on ${new Date().toLocaleDateString()}`,
        });
        // Note: legacy component — images now saved separately via addImage()

      console.log("✅ Palace created successfully!");
      onClose();
    } catch (error) {
      console.error("❌ Error creating palace:", error);
      setError("Failed to create palace. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [palaceName, selectedFiles, addPalace, onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Palace</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="palaceName">Palace Name</label>
            <input
              id="palaceName"
              type="text"
              value={palaceName}
              onChange={(e) => setPalaceName(e.target.value)}
              placeholder="My Memory Palace"
              className={styles.input}
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label>360° Images</label>
            <div className={styles.fileUploadArea}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className={styles.fileInput}
                id="imageUpload"
                disabled={isLoading}
              />
              <label htmlFor="imageUpload" className={styles.fileLabel}>
                <span className={styles.uploadIcon}>📷</span>
                <span>Click to select images or drag and drop</span>
                <span className={styles.fileHint}>
                  JPG, PNG (max 25MB per image)
                </span>
              </label>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className={styles.selectedFiles}>
              <h3>Selected Images ({selectedFiles.length})</h3>
              <div className={styles.fileList}>
                {selectedFiles.map((file, index) => (
                  <div key={index} className={styles.fileItem}>
                    {previewUrls[index] && (
                      <img
                        src={previewUrls[index]}
                        alt={file.name}
                        className={styles.filePreview}
                      />
                    )}
                    <div className={styles.fileInfo}>
                      <p className={styles.fileName}>{file.name}</p>
                      <p className={styles.fileSize}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {!isLoading && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className={styles.removeFileButton}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.infoBox}>
            <strong>💡 Tip:</strong> Use the "Panorama 360" app to create 360° photos 
            of your rooms before uploading them here!
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreatePalace}
            className={styles.createButton}
            disabled={isLoading || !palaceName.trim() || selectedFiles.length === 0}
          >
            {isLoading ? "Creating..." : "Create Palace"}
          </button>
        </div>

        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
            <p>Creating your palace... This may take a moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePalaceModal;
// types/index.ts — Memorium v2 + FSRS + Tauri

// ─── FSRS Card ────────────────────────────────────────────────────────────────

export interface FSRSCard {
  stability?: number;
  difficulty?: number;
  due?: Date;
  /** 0=New, 1=Learning, 2=Review, 3=Relearning */
  state: number;
  reps: number;
  lapses: number;
  lastReview?: Date;
}

export type FSRSRating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

// ─── Core domain types ────────────────────────────────────────────────────────

export interface Annotation {
  id: string;
  text: string;
  note: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  width: number;
  height: number;
  isVisible: boolean;
  selected: boolean;
  generatedImage?: string;
  imageFile?: File;
  /** URL for display (blob URL or data URL) */
  imageUrl?: string;
  /** Relative path on local filesystem (Tauri) — replaces indexedDBKey */
  imageFilePath?: string;
  /** Legacy: IndexedDB key from web app (used during migration) */
  imageIndexedDBKey?: string;
  aiPrompt?: string;
  createdAt: string;
  updatedAt?: string;
  isMandatory?: boolean;
  isImportant?: boolean;
  isGenerated?: boolean;
  /** FSRS scheduling data */
  fsrsCard?: FSRSCard;
  /** Legacy recall data (pre-FSRS, kept for migration) */
  recallData?: {
    attempts: number;
    lastAttempt: string | null;
    remembered: boolean | null;
  };
}

export interface PalaceImage {
  id: string;
  name: string;
  fileName: string;
  url?: string;
  dataUrl?: string;
  /** Legacy: IndexedDB key (web app) */
  indexedDBKey?: string;
  /** Local filesystem path relative to app data dir (Tauri) */
  localFilePath?: string;
  contentType?: string;
  width: number;
  height: number;
  is360: boolean;
  annotations: Annotation[];
  fromModel?: boolean;
  createdAt: string;
}

export interface Palace {
  _id: string;
  name: string;
  description?: string;
  images: PalaceImage[];
  fromModel?: boolean;
  createdAt: Date;
  updatedAt: Date;
  recallStats?: {
    totalSessions: number;
    bestAccuracy: number;
    lastSessionDate: string | null;
  };
}

export interface UserSettings {
  openaiKey?: string;
  geminiKey?: string;
  aiProvider?: 'none' | 'local' | 'gemini' | 'openai';
  theme: 'light' | 'dark';
  autoSave: boolean;
  showTutorial: boolean;
  onboardingCompleted: boolean;
  setupWizardDone?: boolean;
  recallSettings?: {
    defaultMode: 'sequential' | 'random' | 'weakest';
    showHints: boolean;
    autoProgressDelay: number;
  };
}

// ─── AI Generation ────────────────────────────────────────────────────────────

export interface AIGenerationRequest {
  notesText: string;
  targetCount: number;
  imagesCount: number;
  language?: string;
}

export interface AIGeneratedAnnotation {
  description: string;
  note: string;
  imageIndex: number;
  mnemonicStrength?: number;
}

// ─── AI Provider ──────────────────────────────────────────────────────────────

export type AIProviderType = 'none' | 'local' | 'gemini' | 'openai';

export interface AIProviderStatus {
  type: AIProviderType;
  isAvailable: boolean;
  isLoading: boolean;
  error?: string;
}

// ─── Recall ───────────────────────────────────────────────────────────────────

export interface RecallSession {
  id: string;
  palaceId: string;
  startTime: Date;
  endTime: Date | null;
  mode: 'fsrs' | 'sequential' | 'random';
  results: RecallResults | null;
}

export interface RecallResults {
  totalAnnotations: number;
  remembered: number;
  forgotten: number;
  skipped: number;
  accuracy: number;
  duration: number;
  annotationResults: AnnotationRecallResult[];
}

export interface AnnotationRecallResult {
  annotationId: string;
  imageIndex: number;
  rating: FSRSRating | null;
  timeSpent: number;
}

export interface RecallStats {
  totalSessions: number;
  averageAccuracy: number;
  bestAccuracy: number;
  lastSessionDate: Date | null;
  totalAnnotationsStudied: number;
  totalDue: number;
  improvementTrend: number;
}

export interface RecallSettings {
  defaultMode: 'fsrs' | 'sequential' | 'random';
  showHints: boolean;
  autoProgressDelay: number;
  targetAccuracy: number;
}

// ─── Export/Import ────────────────────────────────────────────────────────────

export interface ExportData {
  version: string;
  exportDate: string;
  palaces: Palace[];
}

export interface StandardPalaceMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  imageCount: number;
  annotationCount: number;
  imagesFolder: string;
  downloadUrl?: string;
}

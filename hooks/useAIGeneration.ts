import { useState } from 'react';
import { generateAnnotations, isAIEnabled } from '@/lib/aiProvider';

export interface GeneratedAnnotation {
  description: string;
  note: string;
  imageIndex: number;
}

interface GenerateParams {
  notesText: string;
  targetCount: number;
  imagesCount: number;
  language?: string;
}

export function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const generate = async (params: GenerateParams): Promise<GeneratedAnnotation[] | null> => {
    if (!isAIEnabled()) {
      setError('API Key non configurata. Vai in Impostazioni per aggiungerla.');
      return null;
    }

    setIsGenerating(true);
    setError(null);
    setProgress('Analizzando il testo...');

    try {
      const generated = await generateAnnotations({
        notesText: params.notesText,
        targetCount: params.targetCount,
        imagesCount: params.imagesCount,
        language: params.language ?? 'italiano',
      });
      setProgress(`Generati ${generated.length} annotazioni`);
      return generated as GeneratedAnnotation[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la generazione');
      setProgress('');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, error, progress, setProgress, setError, generate, isAIEnabled };
}

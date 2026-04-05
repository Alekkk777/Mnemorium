export type AIProviderType = 'none' | 'local' | 'gemini' | 'openai';

export interface AIProvider {
  readonly type: AIProviderType;
  isAvailable(): Promise<boolean>;
  generateMnemonic(text: string, language?: string): Promise<string>;
  generateImage(prompt: string): Promise<string>; // returns base64 PNG
  analyzeImage(imageBase64: string): Promise<VisionObject[]>;
}

export interface VisionObject {
  name: string;
  position: string;
  description: string;
}

export interface AIProviderStatus {
  type: AIProviderType;
  isAvailable: boolean;
  isLoading: boolean;
  error?: string;
}

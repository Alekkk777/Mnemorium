// components/Onboarding.tsx - Aggiungi isTutorialMode
import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
  isTutorialMode?: boolean; // ✅ Aggiungi questa riga
}

const steps = [
  {
    title: "Welcome to Mnemorium!",
    description: "Create 3D memory palaces to memorize anything using the method of loci.",
    image: "🏛️",
    tips: [
      "Your data stays in the browser",
      "No account required",
      "Works offline"
    ]
  },
  {
    title: "Create your first palace",
    description: "Upload 360° photos of your environments (home, office, visited places) or use normal images.",
    image: "📸",
    tips: [
      "Use apps like Google Street View to create 360° photos",
      "Regular photos work too",
      "You can add multiple rooms to the same palace"
    ]
  },
  {
    title: "Add annotations",
    description: "Click directly in the image to place the information you want to memorize.",
    image: "📝",
    tips: [
      "Click in the image = place annotation",
      "Add text, notes and images",
      "Use AI to generate them automatically"
    ]
  },
  {
    title: "Explore and memorize",
    description: "Navigate your palace in 3D. Information in a spatial context is easier to remember.",
    image: "🧠",
    tips: [
      "Drag to rotate the view",
      "Scroll to zoom",
      "Click on annotations to expand them"
    ]
  },
  {
    title: "Generate with AI (optional)",
    description: "Paste your notes and let AI create vivid mental images for you.",
    image: "✨",
    tips: [
      "Add your OpenAI API key in settings",
      "AI transforms text into memorable scenes",
      "Completely optional"
    ]
  }
];

export default function Onboarding({ onComplete, onSkip, isTutorialMode = false }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Safety check
  const safeCurrentStep = Math.min(Math.max(0, currentStep), steps.length - 1);
  const step = steps[safeCurrentStep];
  
  if (!step) {
    console.error('Step not found:', safeCurrentStep);
    return null;
  }

  const progress = ((safeCurrentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{step.image || '📚'}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isTutorialMode ? 'Tutorial - ' : ''}{step.title}
              </h2>
              <p className="text-sm text-gray-500">Step {safeCurrentStep + 1} of {steps.length}</p>
            </div>
          </div>
          
          <button
            onClick={onSkip}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-lg text-gray-700 mb-6">
            {step.description}
          </p>

          <div className="bg-blue-50 rounded-lg p-6 space-y-3">
            <p className="font-semibold text-blue-900 text-sm uppercase tracking-wide">
              Tips
            </p>
            {step.tips && step.tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <button
            onClick={handlePrev}
            disabled={safeCurrentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === safeCurrentStep 
                    ? 'bg-blue-600 w-6' 
                    : index < safeCurrentStep 
                    ? 'bg-blue-400' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {safeCurrentStep === steps.length - 1 ? (isTutorialMode ? 'Close' : 'Start') : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
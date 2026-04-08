// components/QuickActionsPanel.tsx - Pannello azioni rapide e tips
import { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Sparkles, 
  Eye, 
  EyeOff, 
  BarChart3, 
  Zap,
  Info,
  X,
  ChevronRight,
  Brain
} from 'lucide-react';
import { Palace } from '@/types';
import { getSetting, setSetting } from '@/lib/tauriStorage';

interface QuickActionsPanelProps {
  palace: Palace | undefined;
  onStartRecall: () => void;
  onAddAnnotation: () => void;
  onToggleAnnotations: () => void;
  onViewStats: () => void;
  onGenerateAI: () => void;
  showAnnotations: boolean;
}

export default function QuickActionsPanel({
  palace,
  onStartRecall,
  onAddAnnotation,
  onToggleAnnotations,
  onViewStats,
  onGenerateAI,
  showAnnotations
}: QuickActionsPanelProps) {
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    getSetting<boolean>('show_tips').then(v => {
      if (v === false) setShowTips(false);
    }).catch(() => {});
  }, []);

  const totalAnnotations = palace?.images.reduce((sum, img) => sum + img.annotations.length, 0) || 0;
  const canRecall = palace && totalAnnotations >= 3;

  const toggleTips = () => {
    const newValue = !showTips;
    setShowTips(newValue);
    setSetting('show_tips', newValue).catch(() => {});
  };

  const tips = [
    {
      icon: <Target className="w-4 h-4" />,
      text: "Use Recall Mode to test your memory",
      action: canRecall ? onStartRecall : undefined,
      actionText: "Try now",
      condition: canRecall
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      text: "AI can generate annotations from your notes",
      action: onGenerateAI,
      actionText: "Generate with AI",
      condition: palace !== undefined
    },
    {
      icon: <Plus className="w-4 h-4" />,
      text: "Add at least 5-10 annotations per palace",
      action: onAddAnnotation,
      actionText: "Add",
      condition: totalAnnotations < 5
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      text: "Monitor your progress in the statistics",
      action: onViewStats,
      actionText: "View Stats",
      condition: palace !== undefined
    }
  ];

  const availableTips = tips.filter(tip => tip.condition);

  if (!palace) return null;

  return (
    <>
      {/* Quick Actions Toolbar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md rounded-2xl p-2 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-2">
            {/* Toggle Annotations */}
            <button
              onClick={onToggleAnnotations}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                showAnnotations
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={showAnnotations ? "Hide annotations" : "Show annotations"}
            >
              {showAnnotations ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-sm">
                {showAnnotations ? 'Hide' : 'Show'}
              </span>
            </button>

            {/* Add Annotation */}
            <button
              onClick={onAddAnnotation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              title="Add annotation"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">New</span>
            </button>

            {/* AI Generate */}
            <button
              onClick={onGenerateAI}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              title="Generate with AI"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">AI</span>
            </button>

            {/* Start Recall */}
            <button
              onClick={onStartRecall}
              disabled={!canRecall}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                canRecall
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg'
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
              title={canRecall ? "Start Recall Mode" : "Add at least 3 annotations"}
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Recall</span>
            </button>

            {/* Stats */}
            <button
              onClick={onViewStats}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors font-medium"
              title="View statistics"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Stats</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Badge */}
      <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-3 text-white">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">{totalAnnotations}</span>
              <span className="text-xs text-gray-300">annotations</span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">{palace.images.length}</span>
              <span className="text-xs text-gray-300">rooms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Panel */}
      {showTips && availableTips.length > 0 && (
        <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm pointer-events-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Tips</h3>
              </div>
              <button
                onClick={toggleTips}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {availableTips.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
                >
                  <div className="flex-shrink-0 p-2 bg-white rounded-lg text-blue-600">
                    {tip.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{tip.text}</p>
                    {tip.action && (
                      <button
                        onClick={tip.action}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {tip.actionText}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={toggleTips}
                className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
              >
                Hide tips
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
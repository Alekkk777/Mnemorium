// pages/userhome.tsx — Final (M3 complete)
import { useEffect, useState } from 'react';
import { usePalaceStore, useUIStore } from '@/lib/store';
import dynamic from 'next/dynamic';
import {
  Plus,
  Settings as SettingsIcon,
  Menu,
  X,
  HelpCircle,
  Brain,
  Target,
  BarChart3,
} from 'lucide-react';
import Onboarding from '@/components/Onboarding';
import PalaceCreationChoice from '@/components/palace/PalaceCreationChoice';
import RecallModeNew, { RecallModeNewResults } from '@/components/annotations/RecallModeNew';
import FSRSDashboard from '@/components/palace/FSRSDashboard';
import { getSetting, setSetting } from '@/lib/tauriStorage';

const PalaceList = dynamic(() => import('@/components/palace/PalaceList'), { ssr: false });
const PalaceViewer = dynamic(() => import('@/components/palace/PalaceViewer'), { ssr: false });
const AnnotationList = dynamic(() => import('@/components/annotations/AnnotationList'), { ssr: false });
const PalaceDashboard = dynamic(() => import('@/components/palace/PalaceDashboard'), { ssr: false });
const Settings = dynamic(() => import('@/components/Settings'), { ssr: false });

type ViewMode = 'explorer' | 'recall' | 'stats';

export default function UserHome() {
  const { palaces, currentPalaceId, setCurrentPalace, loadPalaces, isLoading } = usePalaceStore();
  const { isSettingsOpen, setSettingsOpen } = useUIStore();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPalaceCreation, setShowPalaceCreation] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('explorer');
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastResults, setLastResults] = useState<RecallModeNewResults | null>(null);
  // palace to recall (may be different from currentPalaceId for dashboard-initiated recall)
  const [recallPalaceId, setRecallPalaceId] = useState<string | null>(null);

  const currentPalace = palaces.find(p => p._id === currentPalaceId);
  const recallPalace = palaces.find(p => p._id === (recallPalaceId ?? currentPalaceId));
  const totalAnnotations = currentPalace?.images.reduce((sum, img) => sum + img.annotations.length, 0) || 0;

  useEffect(() => {
    loadPalaces();

    getSetting<string>('onboarding_seen').then((seen) => {
      if (!seen) setShowOnboarding(true);
    }).catch(() => {
      if (!localStorage.getItem('memorium_onboarding_seen')) setShowOnboarding(true);
    });
  }, [loadPalaces]);

  const handleOnboardingComplete = async () => {
    try { await setSetting('onboarding_seen', 'true'); }
    catch { localStorage.setItem('memorium_onboarding_seen', 'true'); }
    setShowOnboarding(false);
    setShowPalaceCreation(true);
  };

  const handleOnboardingSkip = async () => {
    try { await setSetting('onboarding_seen', 'true'); }
    catch { localStorage.setItem('memorium_onboarding_seen', 'true'); }
    setShowOnboarding(false);
  };

  const handleStartRecall = (palaceId?: string) => {
    const pid = palaceId ?? currentPalaceId;
    if (!pid) return;
    setRecallPalaceId(pid);
    setViewMode('recall');
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  };

  const handleRecallComplete = async (results: RecallModeNewResults) => {
    setLastResults(results);
    setViewMode('explorer');

    try {
      // @ts-ignore — @tauri-apps/api installed at build time
      const { invoke } = await import('@tauri-apps/api/core');
      await (invoke as (cmd: string, a?: unknown) => Promise<void>)('save_recall_session', {
        input: {
          palace_id: recallPalaceId ?? currentPalaceId,
          accuracy: results.accuracy,
          total: results.totalAnnotations,
          correct: results.remembered,
          duration_ms: results.duration,
          ended_at: Date.now(),
        },
      });
    } catch { /* non-critical */ }

    if (results.accuracy >= 80) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-accent mx-auto mb-4" />
          <p className="text-muted font-medium">Caricamento palazzi...</p>
        </div>
      </div>
    );
  }

  // Full-screen recall
  if (viewMode === 'recall' && recallPalace) {
    return (
      <RecallModeNew
        palace={recallPalace}
        onClose={() => setViewMode('explorer')}
        onComplete={handleRecallComplete}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Celebration banner */}
      {showCelebration && lastResults && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gradient-to-r from-accent to-purple-400 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="font-bold text-sm">Ottimo lavoro!</p>
              <p className="text-xs">{lastResults.accuracy.toFixed(0)}% di accuratezza</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-surface border-b border-white/10 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>

            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-accent" />
              <h1 className="text-xl font-bold text-foreground">Memorium</h1>
            </div>

            {currentPalace && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-lg">
                <span className="text-sm font-medium text-foreground">{currentPalace.name}</span>
                <span className="text-xs text-accent">•</span>
                <span className="text-xs text-muted">{totalAnnotations} note</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentPalace && (
              <button
                onClick={() => { setViewMode(viewMode === 'stats' ? 'explorer' : 'stats'); setRightSidebarOpen(true); }}
                className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  viewMode === 'stats' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm">FSRS</span>
              </button>
            )}

            <button
              onClick={() => setShowTutorial(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-muted hover:text-foreground hover:bg-white/10 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm">Tutorial</span>
            </button>

            <button
              onClick={() => handleStartRecall()}
              disabled={!currentPalace || totalAnnotations === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium shadow-sm ${
                !currentPalace || totalAnnotations === 0
                  ? 'bg-white/5 text-muted cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent-hover shadow-lg'
              }`}
            >
              <Target className="w-5 h-5" />
              <span className="hidden sm:inline">Recall</span>
            </button>

            <button
              onClick={() => setShowPalaceCreation(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nuovo</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <SettingsIcon className="w-6 h-6 text-muted" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40
            w-80 bg-surface border-r border-white/10 shadow-lg lg:shadow-none
            transform transition-transform duration-300 ease-in-out
            ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-foreground">I Miei Palazzi</h2>
              <button
                onClick={() => setLeftSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <PalaceList />
            </div>

            <div className="p-4 border-t border-white/10 bg-accent/5">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Brain className="w-4 h-4 text-accent" />
                <span className="font-medium text-foreground">{palaces.length} palazzo/i</span>
              </div>
              {currentPalace && (
                <div className="text-xs text-muted">
                  {currentPalace.images.length} immagini selezionate
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative bg-background overflow-hidden">
          {currentPalace ? (
            viewMode === 'explorer' ? (
              <PalaceViewer palace={currentPalace} />
            ) : null
          ) : (
            <PalaceDashboard
              onCreatePalace={() => setShowPalaceCreation(true)}
              onSelectPalace={(id) => { setCurrentPalace(id); setViewMode('explorer'); }}
              onStartRecall={(id) => handleStartRecall(id)}
            />
          )}
        </main>

        {/* Right Sidebar */}
        {currentPalace && (
          <aside
            className={`
              fixed lg:static inset-y-0 right-0 z-40
              w-80 bg-surface border-l border-white/10 shadow-lg lg:shadow-none
              transform transition-transform duration-300 ease-in-out
              ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {viewMode === 'stats' ? (
                    <>
                      <BarChart3 className="w-5 h-5 text-accent" />
                      <h2 className="text-lg font-semibold text-foreground">FSRS Stats</h2>
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 text-accent" />
                      <h2 className="text-lg font-semibold text-foreground">Annotazioni</h2>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'stats' ? 'explorer' : 'stats')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {viewMode === 'stats' ? (
                      <Brain className="w-5 h-5 text-muted" />
                    ) : (
                      <BarChart3 className="w-5 h-5 text-muted" />
                    )}
                  </button>

                  <button
                    onClick={() => setRightSidebarOpen(false)}
                    className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-5 h-5 text-muted" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {viewMode === 'stats' ? (
                  <FSRSDashboard palace={currentPalace} />
                ) : (
                  <AnnotationList palace={currentPalace} />
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      {showOnboarding && (
        <Onboarding
          isTutorialMode={false}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {showTutorial && (
        <Onboarding
          isTutorialMode={true}
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}

      {showPalaceCreation && (
        <PalaceCreationChoice
          isOpen={showPalaceCreation}
          onClose={() => setShowPalaceCreation(false)}
        />
      )}

      {isSettingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

      {(leftSidebarOpen || rightSidebarOpen) && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => { setLeftSidebarOpen(false); setRightSidebarOpen(false); }}
        />
      )}

      {currentPalace && !leftSidebarOpen && !rightSidebarOpen && (
        <button
          onClick={() => handleStartRecall()}
          disabled={totalAnnotations === 0}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 bg-accent text-white rounded-full shadow-2xl hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Target className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

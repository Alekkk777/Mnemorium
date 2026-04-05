// pages/_app.tsx — Memorium desktop (Tauri)
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import '../styles/globals.css';
import { usePalaceStore } from '@/lib/store';
import { getSetting } from '@/lib/tauriStorage';
import AIStatusBar from '@/components/ui/AIStatusBar';
import SetupWizard from '@/components/ui/SetupWizard';
import MigrationDialog from '@/components/ui/MigrationDialog';
import { autoDetectProvider } from '@/lib/aiProvider';
import { setActiveProviderType } from '@/lib/aiProvider';
import { AIProviderType } from '@/types/ai';

function MyApp({ Component, pageProps }: AppProps) {
  const { loadPalaces } = usePalaceStore();

  const [appReady, setAppReady] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        // 1. Check if setup wizard has been completed
        const wizardDone = await getSetting<boolean>('setup_wizard_done').catch(() => null);
        if (!wizardDone) {
          setShowWizard(true);
          return; // Migration will run after wizard
        }

        // 2. Restore AI provider from settings
        const providerType = await getSetting<AIProviderType>('ai_provider').catch(() => null);
        if (providerType && providerType !== 'none') {
          setActiveProviderType(providerType);
        } else {
          await autoDetectProvider();
        }

        // 3. Load palaces from SQLite
        await loadPalaces();

        // 4. Check if migration from web app is needed (MigrationDialog auto-completes if nothing to do)
        const migrationDone = await getSetting<boolean>('migration_v2_done').catch(() => null);
        if (migrationDone) {
          // Already migrated — skip dialog, show app directly
          setAppReady(true);
        } else {
          setShowMigration(true);
        }
      } catch (error) {
        console.error('[app] Boot error:', error);
        setAppReady(true);
      }
    }

    boot();
  }, []);

  async function onWizardComplete() {
    setShowWizard(false);
    // After wizard: check migration, then load
    await loadPalaces().catch(() => {});
    setShowMigration(true);
  }

  function onMigrationComplete() {
    setMigrationDone(true);
    setShowMigration(false);
    setAppReady(true);
  }

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Memorium</title>
      </Head>

      {/* Setup Wizard (first launch) */}
      {showWizard && <SetupWizard onComplete={onWizardComplete} />}

      {/* Migration Dialog (from web PWA to Tauri SQLite) */}
      {showMigration && !showWizard && (
        <MigrationDialog onComplete={onMigrationComplete} />
      )}

      {/* Main App */}
      {(appReady || migrationDone) && !showWizard && (
        <>
          <Component {...pageProps} />
          <AIStatusBar />
        </>
      )}
    </>
  );
}

export default MyApp;

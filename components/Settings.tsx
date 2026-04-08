import { useState, useEffect } from 'react';
import { X, Download, Upload, Trash2, Info, Key, Eye, EyeOff, Zap } from 'lucide-react';
import { usePalaceStore } from '@/lib/store';
import { saveGeminiKey, getGeminiKey, clearGeminiKey } from '@/lib/providers/geminiProvider';
import { saveOpenAIKey, getOpenAIKey, clearOpenAIKey } from '@/lib/providers/openAIProvider';
import { exportBackup, importBackup } from '@/lib/exportImport';
import { autoDetectProvider } from '@/lib/aiProvider';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { palaces, deletePalace, loadPalaces } = usePalaceStore();

  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const gk = getGeminiKey();
    const ok = getOpenAIKey();
    if (gk) setGeminiKey(gk);
    if (ok) setOpenaiKey(ok);
  }, []);

  const showMsg = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3500);
  };

  const stats = {
    palaceCount: palaces.length,
    imageCount: palaces.reduce((sum, p) => sum + (p.images?.length ?? 0), 0),
    annotationCount: palaces.reduce(
      (sum, p) => sum + p.images.reduce((s, i) => s + i.annotations.length, 0),
      0
    ),
  };

  const handleSaveGeminiKey = () => {
    if (!geminiKey.trim()) { showMsg('Enter a valid API key', false); return; }
    saveGeminiKey(geminiKey.trim());
    autoDetectProvider().catch(() => {});
    showMsg('Gemini API key saved');
  };

  const handleSaveOpenaiKey = () => {
    if (!openaiKey.trim() || !openaiKey.startsWith('sk-')) {
      showMsg('The OpenAI key must start with "sk-"', false);
      return;
    }
    saveOpenAIKey(openaiKey.trim());
    autoDetectProvider().catch(() => {});
    showMsg('OpenAI API key saved');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportBackup(palaces);
      showMsg('Backup exported');
    } catch (e) {
      showMsg('Error during export', false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await importBackup();
      await loadPalaces();
      showMsg('Backup imported successfully');
    } catch (e) {
      showMsg('Error during import: ' + (e as Error).message, false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: This will delete all palaces and data.\n\nAre you sure?')) return;
    if (!window.confirm('Final confirmation: do you want to delete everything?')) return;

    setIsDeleting(true);
    try {
      // Delete palaces one by one (cascades images + annotations via SQLite ON DELETE CASCADE)
      for (const palace of [...palaces]) {
        await deletePalace(palace._id);
      }
      // Clear AI keys
      clearGeminiKey();
      clearOpenAIKey();
      showMsg('All data deleted');
    } catch (e) {
      showMsg('Error during deletion', false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-white/10 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-foreground">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.ok ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'
            }`}>
              {message.text}
            </div>
          )}

          {/* Statistics */}
          <section>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Palaces', value: stats.palaceCount },
                { label: 'Images', value: stats.imageCount },
                { label: 'Annotations', value: stats.annotationCount },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-background rounded-lg text-center">
                  <p className="text-2xl font-bold text-accent">{value}</p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* AI Configuration */}
          <section>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" /> AI Provider
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Mnemorium uses local AI (Ollama) if available, otherwise Gemini or OpenAI.
                Add a key to enable the cloud provider.
              </p>

              {/* Gemini */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Gemini API Key (free)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-3 py-2 pr-9 bg-background border border-white/10 rounded-lg text-sm text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveGeminiKey}
                    className="px-3 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Salva
                  </button>
                  {getGeminiKey() && (
                    <button
                      onClick={() => { clearGeminiKey(); setGeminiKey(''); showMsg('Gemini key removed'); }}
                      className="px-3 py-2 bg-danger/10 text-danger text-sm rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* OpenAI */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  OpenAI API Key
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showOpenaiKey ? 'text' : 'password'}
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 pr-9 bg-background border border-white/10 rounded-lg text-sm text-foreground placeholder-muted focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveOpenaiKey}
                    className="px-3 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Salva
                  </button>
                  {getOpenAIKey() && (
                    <button
                      onClick={() => { clearOpenAIKey(); setOpenaiKey(''); showMsg('OpenAI key removed'); }}
                      className="px-3 py-2 bg-danger/10 text-danger text-sm rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Data Management
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleExport}
                disabled={isExporting || palaces.length === 0}
                className="w-full flex items-center gap-3 p-3 bg-background border border-white/10 rounded-lg hover:border-accent/40 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Download className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isExporting ? 'Exporting...' : 'Export Backup'}
                  </p>
                  <p className="text-xs text-muted">Save all palaces and images</p>
                </div>
              </button>

              <button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full flex items-center gap-3 p-3 bg-background border border-white/10 rounded-lg hover:border-accent/40 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 bg-success/20 rounded-lg">
                  <Upload className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isImporting ? 'Importing...' : 'Import Backup'}
                  </p>
                  <p className="text-xs text-muted">Restore from .mnemorium file</p>
                </div>
              </button>

              <button
                onClick={handleClearAll}
                disabled={isDeleting || palaces.length === 0}
                className="w-full flex items-center gap-3 p-3 bg-background border border-danger/20 rounded-lg hover:bg-danger/5 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 bg-danger/20 rounded-lg">
                  <Trash2 className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <p className="text-sm font-medium text-danger">
                    {isDeleting ? 'Deleting...' : 'Delete everything'}
                  </p>
                  <p className="text-xs text-muted">Permanently removes all data</p>
                </div>
              </button>
            </div>
          </section>

          <div className="pt-2 text-center">
            <p className="text-xs text-muted">
              Mnemorium v2.0 · Open Source · Privacy-first
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

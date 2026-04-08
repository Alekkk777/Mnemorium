import Head from 'next/head';
import { useState, useEffect } from 'react';

const GITHUB_REPO = 'Alekkk777/Mnemorium_open_v2';
const SITE_URL = 'https://mnemorium.com';
const VERSION = '2.1.0';

const RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}`;

const DOWNLOADS = [
  {
    label: 'macOS Apple Silicon',
    sublabel: 'M1 / M2 / M3',
    icon: '🍎',
    href: `${RELEASE_BASE}/Mnemorium_${VERSION}_aarch64.dmg`,
    ext: '.dmg',
  },
  {
    label: 'macOS Intel',
    sublabel: 'x86_64',
    icon: '🍎',
    href: `${RELEASE_BASE}/Mnemorium_${VERSION}_x64.dmg`,
    ext: '.dmg',
  },
  {
    label: 'Windows',
    sublabel: '64-bit installer',
    icon: '🪟',
    href: `${RELEASE_BASE}/Mnemorium_${VERSION}_x64-setup.exe`,
    ext: '.exe',
  },
  {
    label: 'Linux',
    sublabel: 'AppImage',
    icon: '🐧',
    href: `${RELEASE_BASE}/mnemorium_${VERSION}_amd64.AppImage`,
    ext: '.AppImage',
  },
];

const FEATURES = [
  {
    icon: '🏛️',
    title: 'Panoramic palaces',
    desc: 'Upload your 360° photos (home, office, familiar places) and turn them into navigable 3D environments.',
  },
  {
    icon: '📍',
    title: 'Annotations in space',
    desc: 'Place notes, images and descriptions directly in the 3D viewer, anchored to the points you choose.',
  },
  {
    icon: '🎯',
    title: 'Review with FSRS-5',
    desc: 'The FSRS-5 algorithm schedules recall sessions optimally. Remember more, waste less time.',
  },
  {
    icon: '🤖',
    title: 'AI Generation',
    desc: 'Paste your notes and get automatically generated mnemonics, distributed across the rooms of your palace.',
  },
  {
    icon: '📱',
    title: 'Upload from phone',
    desc: 'Scan a QR code with your phone to upload photos directly into the app from your mobile device.',
  },
  {
    icon: '🔒',
    title: 'Total privacy',
    desc: 'All data stays on your computer in local SQLite. No cloud, no account, no tracking.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Create your palace',
    desc: 'Upload 360° photos of your spaces or use standard images. The app converts them into navigable environments.',
  },
  {
    n: '2',
    title: 'Add annotations',
    desc: 'Click points in the viewer to anchor notes and concepts. Use AI to generate them automatically from your notes.',
  },
  {
    n: '3',
    title: 'Study and remember',
    desc: 'Enter Recall Mode: the FSRS-5 system shows you annotations at the right moment to maximize memorization.',
  },
];

export default function LandingPage() {
  const [os, setOs] = useState<'mac' | 'win' | 'linux' | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) setOs('mac');
    else if (ua.includes('win')) setOs('win');
    else if (ua.includes('linux')) setOs('linux');
  }, []);

  const primaryDownload =
    os === 'mac'
      ? DOWNLOADS[0]
      : os === 'win'
      ? DOWNLOADS[2]
      : os === 'linux'
      ? DOWNLOADS[3]
      : DOWNLOADS[0];

  return (
    <>
      <Head>
        <title>Mnemorium — Digital Memory Palaces</title>
        <meta name="description" content="Build memory palaces from your real spaces. Annotate in 3D, study with FSRS-5, generate mnemonics with AI. Free open-source desktop app." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content="Mnemorium — Digital Memory Palaces" />
        <meta property="og:description" content="Free desktop app to build memory palaces from your spaces. Total privacy, local data." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:site_name" content="Mnemorium" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mnemorium — Digital Memory Palaces" />
        <meta name="twitter:description" content="Free desktop app to build memory palaces from your spaces. Total privacy, local data." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-background text-foreground font-sans">

        {/* ── Nav ───────────────────────────────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Mnemorium
            </span>
            <div className="flex items-center gap-6 text-sm text-muted">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
              <a
                href={`https://github.com/${GITHUB_REPO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href={primaryDownload.href}
                className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
              >
                Download
              </a>
            </div>
          </div>
        </nav>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="pt-32 pb-24 px-6 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-medium mb-8">
            v{VERSION} — Open Source, MIT
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground leading-tight tracking-tight mb-6">
            The memory palace<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
              built from your real spaces
            </span>
          </h1>

          <p className="text-xl text-muted leading-relaxed max-w-2xl mx-auto mb-10">
            Upload photos of your spaces, place concepts in 3D, study with FSRS-5 spaced repetition.
            All local, all yours, no subscription.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={primaryDownload.href}
              className="flex items-center gap-3 px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40"
            >
              <span className="text-2xl">{primaryDownload.icon}</span>
              Download for {primaryDownload.label}
              <span className="text-xs opacity-60 font-normal">{primaryDownload.ext}</span>
            </a>
            <a
              href={`https://github.com/${GITHUB_REPO}/releases/latest`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 border border-white/10 hover:border-white/20 text-muted hover:text-foreground rounded-xl font-medium transition-colors"
            >
              All platforms ↓
            </a>
          </div>

          {/* All platforms */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {DOWNLOADS.map((d) => (
              <a
                key={d.label}
                href={d.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-white/5 hover:border-white/10 text-xs text-muted hover:text-foreground transition-colors"
              >
                <span>{d.icon}</span>
                <span>{d.label}</span>
                <span className="opacity-40">{d.ext}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── App preview placeholder ───────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 mb-24">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-surface-elevated shadow-2xl shadow-black/60">
            <div className="h-8 bg-surface flex items-center gap-2 px-4 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-danger/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="ml-2 text-xs text-muted">Mnemorium — Memory Palace</span>
            </div>
            <div className="h-72 sm:h-96 flex items-center justify-center bg-gradient-to-br from-surface to-background">
              <div className="text-center">
                <div className="text-6xl mb-4">🏛️</div>
                <p className="text-muted text-sm">Panoramic 3D viewer</p>
                <p className="text-muted/50 text-xs mt-1">Annotate, navigate, remember</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section id="features" className="max-w-6xl mx-auto px-6 pb-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">Everything you need</h2>
            <p className="text-muted">No compromise between power and simplicity.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl bg-surface border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-foreground font-semibold mb-2">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section id="how" className="max-w-4xl mx-auto px-6 pb-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">How it works</h2>
            <p className="text-muted">Ready in 3 steps.</p>
          </div>

          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex gap-6 p-6 rounded-xl bg-surface border border-white/5">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-foreground font-semibold mb-1">{s.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI section ────────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-900/10 border border-accent/20">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="text-5xl flex-shrink-0">🤖</div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Optional AI, with your own key
                </h2>
                <p className="text-muted leading-relaxed mb-4">
                  Mnemorium connects to <strong className="text-foreground">OpenAI</strong>, <strong className="text-foreground">Google Gemini</strong> or a local model via <strong className="text-foreground">Ollama</strong> — your choice.
                  Paste your notes, choose how many annotations to generate, and the AI distributes them automatically across the rooms of your palace.
                </p>
                <p className="text-xs text-muted/70">
                  AI is completely optional. The rest of the app works without any key.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Privacy ───────────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              { icon: '💾', title: 'Local SQLite', desc: 'Your data never leaves your computer.' },
              { icon: '🔑', title: 'No account', desc: 'Zero registrations, zero email, zero password.' },
              { icon: '📖', title: 'Open source', desc: 'Read every line of code on GitHub. MIT License.' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-xl bg-surface border border-white/5">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-foreground font-semibold mb-1">{item.title}</h3>
                <p className="text-muted text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-6 pb-32 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to start?</h2>
          <p className="text-muted mb-8">Free, open source, no subscription. Forever.</p>
          <a
            href={primaryDownload.href}
            className="inline-flex items-center gap-3 px-10 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-accent/20"
          >
            <span className="text-2xl">{primaryDownload.icon}</span>
            Download Mnemorium — free
          </a>
          <p className="text-muted/50 text-xs mt-4">
            macOS · Windows · Linux &nbsp;·&nbsp; v{VERSION}
          </p>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
            <span>© 2026 <a href={SITE_URL} className="hover:text-foreground transition-colors">mnemorium.com</a> — MIT License</span>
            <div className="flex items-center gap-6">
              <a
                href={`https://github.com/${GITHUB_REPO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href={`https://github.com/${GITHUB_REPO}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Bug report
              </a>
              <a
                href={`https://github.com/${GITHUB_REPO}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Releases
              </a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

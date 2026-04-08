# Changelog

All notable changes to Mnemorium will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Tauri desktop app (Windows, macOS, Linux) — replaces web PWA
- SQLite local storage — replaces localStorage/IndexedDB
- FSRS spaced repetition algorithm via `ts-fsrs` — replaces simple sequential recall
- AI provider abstraction layer (local Ollama, Gemini free tier, OpenAI)
- Local AI server (FastAPI + Python) — runs embedded in the app
- FLUX.1 Schnell image generation (opt-in, ~4GB model)
- Gemma 4B text mnemonic generation via Ollama
- FSRS marker colors in 3D viewer (green/yellow/red)
- Setup wizard (3-step, no technical forms)
- Migration dialog (web app data → SQLite)
- AIStatusBar — always-visible provider status
- Dark design system (#08080f background, #7c3aed accent)
- GitHub Actions: Tauri cross-platform build + release pipeline
- Vitest unit tests, Playwright E2E scaffold

### Changed
- `store.ts` rewritten with Tauri IPC (no more localStorage calls)
- `imageDB.ts` replaced by `tauriImageStorage.ts` (filesystem-based)
- `aiGenerator.ts` refactored into `AIProvider` interface + provider classes
- `PalaceViewer.tsx` loads images from local filesystem via Tauri
- `RecallMode.tsx` → FSRS-based scheduling (in progress)
- `next.config.js` → `output: 'export'` for Tauri static WebView

### Removed
- PWA Service Worker (sw.js)
- PWA manifest.json
- Vercel deployment config
- pages/api/data/[action].ts (incompatible with static export)

## [2.0.0] - 2024-12-01

### Added
- Initial open source release
- 360° panoramic palace viewer (Three.js)
- Annotation system with 3D placement
- OpenAI GPT-4o-mini integration (BYO key)
- AES-256-GCM optional encryption
- Export/import palaces as JSON
- Standard palace gallery (Roman Forum)
- Basic recall mode (sequential, binary feedback)
- PWA support (offline, installable)

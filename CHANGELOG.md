# Changelog

All notable changes to Mnemorium are documented here.

## [2.1.0] — 2026-04-08

### Added
- **Skip button in Recall Mode** — press `S` or click "Salta" to skip an annotation without rating it; skipped cards are excluded from accuracy calculation
- **Thumbnail preview in image upload** — 4-column grid preview after file selection, with per-file remove button and total size estimate
- **`useAIGeneration` hook** — shared AI generation logic extracted from AutoGenerate and ImprovedAIFlow
- **PyInstaller bundling** — Python AI server now ships as a standalone executable; no Python installation required on end-user machines
- **Tauri Capabilities file** — frontend filesystem access restricted to `$DOWNLOAD`, `$DOCUMENT`, `$DESKTOP` only
- **Content Security Policy** — strong CSP applied to the WebView (blocks object embeds, clickjacking, base-tag injection)
- **Updater signing** — release binaries are now signed with an Ed25519 key; auto-update verifies signature before installing

### Fixed
- **AI annotation data loss** — `addAnnotation` loop in `ImprovedAIFlow` and `AutoGenerate` was fire-and-forget; replaced with `Promise.all` so the modal waits for all DB writes before closing
- **FSRS card partial update data loss** — `updateAnnotation` was overwriting the entire `fsrsCard` with a partial object; now deep-merges with the existing card state
- **QRPhotoUpload polling race condition** — concurrent tick overlap prevented with `isPollingRef`; polling auto-stops after 5 consecutive failures

### Performance
- **Single-query palace load** — `loadPalaces` replaced N+1 IPC round-trips with a single SQL LEFT JOIN (`get_palaces_full`); boot time now independent of palace/annotation count

### Security
- Python AI server CORS restricted to `tauri://localhost` and dev origins; `allow_origins=["*"]` removed
- API keys (Gemini, OpenAI) now dual-persisted in SQLite for durability; rehydrated from SQLite at startup

### Removed
- Legacy `recallData` field (`attempts`, `lastAttempt`, `remembered`) removed from `Annotation` type — replaced by FSRS fields

## [2.0.0] — 2026-01-01

- Initial Tauri 2 desktop release
- SQLite persistence via sqlx
- FSRS-5 spaced repetition
- AI annotation generation (OpenAI, Gemini, Ollama)
- 360° panoramic viewer (Three.js)
- QR photo upload from mobile

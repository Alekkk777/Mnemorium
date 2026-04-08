# Mnemorium — Digital Memory Palace

> Build vivid memory palaces from your own spaces. Place notes in 3D, study with spaced repetition, generate mnemonics with AI.

[![Website](https://img.shields.io/badge/website-mnemorium.com-7c3aed)](https://mnemorium.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue)](https://tauri.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## What is Mnemorium?

Mnemorium is a **desktop app** (Mac, Windows, Linux) that lets you build memory palaces from your own photos — panoramic 360° images or regular photos of any space you know well. Place annotation markers in 3D, attach notes and images, then study with a built-in FSRS spaced repetition system.

All data is stored **locally on your machine** in SQLite. No account, no cloud, no telemetry.

## Features

- **360° and standard image palaces** — upload your own photos (home, library, campus, etc.)
- **3D annotation placement** — click anywhere in the viewer to place a note in 3D space
- **FSRS-5 spaced repetition** — recall sessions scheduled by a state-of-the-art algorithm
- **AI annotation generation** — paste your study notes, get mnemonics placed across your palace automatically (requires your own OpenAI or Gemini API key, or a local Ollama model)
- **QR photo upload** — scan a QR code with your phone to upload photos wirelessly from the same LAN
- **Export / Import** — full backup as a `.mnemorium` file, including all images
- **Privacy first** — SQLite database stored in your app data folder, no external connections except the AI provider you choose

## Download

Go to **[mnemorium.com](https://mnemorium.com)** or the [GitHub Releases](https://github.com/Alekkk777/Mnemorium/releases) page and download the installer for your platform:

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `Mnemorium_aarch64.dmg` |
| macOS (Intel) | `Mnemorium_x86_64.dmg` |
| Windows | `Mnemorium_x64.msi` |
| Linux | `mnemorium_amd64.AppImage` |

## Build from source

**Prerequisites:** [Rust](https://rustup.rs/), [Node.js 20+](https://nodejs.org/), Python 3.11+

```bash
git clone https://github.com/Alekkk777/Mnemorium.git
cd Mnemorium

# Build the Python AI server (bundles it as a standalone executable)
python3 scripts/build_python_server.py

# Install JS dependencies
npm install

# Run in dev mode (hot reload)
npm run tauri dev

# Or build a release binary
npm run tauri build
```

## AI providers

Mnemorium supports three AI backends for annotation generation:

| Provider | Setup |
|----------|-------|
| **OpenAI** (GPT-4o) | Enter your API key in Settings |
| **Google Gemini** | Enter your API key in Settings |
| **Local (Ollama)** | Run Ollama locally — no key needed |

The AI server runs as a local FastAPI process bundled with the app. It only makes outbound calls when you explicitly trigger generation, and only to the provider you configured.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| 3D viewer | Three.js + React Three Fiber |
| Database | SQLite via sqlx |
| State | Zustand |
| Spaced repetition | FSRS-5 |
| AI server | FastAPI + uvicorn (PyInstaller bundled) |

## Project structure

```
mnemorium/
├── components/          # React UI components
│   ├── annotations/     # Annotation system, AI flow, recall mode
│   ├── palace/          # Palace viewer, gallery, QR upload
│   └── ui/              # Shared UI primitives
├── hooks/               # Custom React hooks
├── lib/                 # Business logic (store, FSRS, AI providers)
├── pages/               # Next.js pages
├── python-server/       # FastAPI AI server (bundled via PyInstaller)
├── scripts/             # Build utilities
├── src-tauri/           # Rust/Tauri backend, SQLite commands
└── types/               # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

Before submitting, make sure `npm run build` and `cargo check` both pass with zero errors.

## License

MIT — see [LICENSE](LICENSE).

---

Made by [Alessandro Saladino](https://github.com/Alekkk777)

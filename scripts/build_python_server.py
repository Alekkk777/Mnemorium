#!/usr/bin/env python3
"""
build_python_server.py
Builds the Mnemorium AI server as a standalone executable using PyInstaller.
Run from the repo root:  python scripts/build_python_server.py
Output: python-server/dist/mnemorium-ai-server/  (bundled with all deps)
"""
import os
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SERVER_DIR = ROOT / "python-server"
DIST_DIR = SERVER_DIR / "dist"
BUILD_DIR = SERVER_DIR / "build"
SPEC_DIR = SERVER_DIR


def main():
    print(f"[build_python_server] Platform: {platform.system()} {platform.machine()}")
    print(f"[build_python_server] Server dir: {SERVER_DIR}")

    # Install build dependencies
    print("[build_python_server] Installing PyInstaller and requirements...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "pyinstaller>=6.0", "-r", "requirements.txt"],
        cwd=SERVER_DIR,
        check=True,
    )

    # Hidden imports needed for FastAPI + uvicorn
    hidden_imports = [
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "fastapi",
        "starlette",
        "anyio",
        "anyio._backends._asyncio",
        "h11",
        "httptools",
        "routes.health",
        "routes.text",
        "routes.vision",
        "routes.image",
        "routes.upload",
        "routes.ollama",
    ]

    hidden_args = []
    for h in hidden_imports:
        hidden_args += ["--hidden-import", h]

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onedir",
        "--name", "mnemorium-ai-server",
        "--distpath", str(DIST_DIR),
        "--workpath", str(BUILD_DIR),
        "--specpath", str(SPEC_DIR),
        "--noconfirm",
        "--log-level", "WARN",
        *hidden_args,
        "main.py",
    ]

    print("[build_python_server] Running PyInstaller...")
    subprocess.run(cmd, cwd=SERVER_DIR, check=True)

    exe_name = "mnemorium-ai-server.exe" if platform.system() == "Windows" else "mnemorium-ai-server"
    exe_path = DIST_DIR / "mnemorium-ai-server" / exe_name

    if exe_path.exists():
        # Make executable on Unix
        if platform.system() != "Windows":
            exe_path.chmod(0o755)
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"[build_python_server] ✓ Built: {exe_path} ({size_mb:.1f} MB)")
    else:
        print(f"[build_python_server] ✗ Executable not found at {exe_path}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

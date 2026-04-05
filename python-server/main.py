"""
Memorium AI Server
FastAPI server that provides local AI capabilities.
Started automatically by the Tauri app at launch.
Port is chosen randomly (passed as --port arg) and printed to stdout
so the Tauri manager.rs can read it.
"""
import argparse
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.health import router as health_router
from routes.text import router as text_router
from routes.vision import router as vision_router
from routes.image import router as image_router

app = FastAPI(
    title="Memorium AI Server",
    version="1.0.0",
    docs_url=None,  # Disable docs in production
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["tauri://localhost", "http://localhost", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(text_router)
app.include_router(vision_router)
app.include_router(image_router)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7891)
    args = parser.parse_args()

    # Print port to stdout so Tauri manager can read it
    print(f"MEMORIUM_AI_PORT={args.port}", flush=True)

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")

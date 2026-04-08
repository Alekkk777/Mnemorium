"""
Mnemorium AI Server
FastAPI server that provides local AI capabilities + mobile photo upload.
Started automatically by the Tauri app at launch.
Port is chosen randomly (passed as --port arg) and printed to stdout
so the Tauri manager.rs can read it.
"""
import argparse

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.health import router as health_router
from routes.text import router as text_router
from routes.vision import router as vision_router
from routes.image import router as image_router
from routes.upload import router as upload_router, set_port as set_upload_port
from routes.ollama import router as ollama_router

app = FastAPI(
    title="Mnemorium AI Server",
    version="2.0.0",
    docs_url=None,   # disable Swagger UI in production
    redoc_url=None,  # disable ReDoc in production
    openapi_url=None,  # disable OpenAPI schema endpoint
)

# CORS: allow Tauri WebView + dev server only.
# The upload router adds its own permissive CORS for LAN phone access.
TAURI_ORIGINS = [
    "tauri://localhost",
    "https://tauri.localhost",
    "http://localhost:3001",  # next dev
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=TAURI_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=False,
)

app.include_router(health_router)
app.include_router(text_router)
app.include_router(vision_router)
app.include_router(image_router)
app.include_router(upload_router)  # upload router adds its own open CORS for phones
app.include_router(ollama_router)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7891)
    args = parser.parse_args()

    # Inform upload module of our port (used to build QR URLs)
    set_upload_port(args.port)

    # Print port to stdout so Tauri manager can read it
    print(f"MNEMORIUM_AI_PORT={args.port}", flush=True)

    # Bind to 0.0.0.0 so phones on the same LAN can reach the upload page
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")

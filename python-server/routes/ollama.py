"""
ollama.py — Ollama model management endpoints.
Lets the Mnemorium app check if Ollama is installed and pull the required model.
"""
import shutil
import subprocess

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/ollama")

# Default multimodal model used for vision tasks
DEFAULT_MODEL = "llava"


@router.get("/status")
async def ollama_status():
    """Check if Ollama CLI is installed and whether the default model is available."""
    ollama_bin = shutil.which("ollama")
    if not ollama_bin:
        return JSONResponse(
            {
                "installed": False,
                "running": False,
                "model_ready": False,
                "model": DEFAULT_MODEL,
            }
        )

    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        running = result.returncode == 0
        model_ready = DEFAULT_MODEL in result.stdout if running else False
        return JSONResponse(
            {
                "installed": True,
                "running": running,
                "model_ready": model_ready,
                "model": DEFAULT_MODEL,
                "all_models": result.stdout.strip() if running else "",
            }
        )
    except subprocess.TimeoutExpired:
        return JSONResponse(
            {"installed": True, "running": False, "model_ready": False, "error": "timeout"}
        )
    except Exception as e:
        return JSONResponse(
            {"installed": True, "running": False, "model_ready": False, "error": str(e)}
        )


@router.post("/pull")
async def pull_model(model: str = DEFAULT_MODEL):
    """Start pulling a model in the background (non-blocking)."""
    ollama_bin = shutil.which("ollama")
    if not ollama_bin:
        return JSONResponse({"ok": False, "error": "Ollama non trovato. Scaricalo da ollama.com"})

    try:
        subprocess.Popen(
            ["ollama", "pull", model],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return JSONResponse(
            {"ok": True, "message": f"Download di '{model}' avviato in background"}
        )
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


@router.delete("/model/{model_name}")
async def delete_model(model_name: str):
    """Remove a model from Ollama."""
    try:
        result = subprocess.run(
            ["ollama", "rm", model_name],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return JSONResponse({"ok": result.returncode == 0, "output": result.stdout})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

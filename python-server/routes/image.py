"""
Image generation route.
Uses FLUX.1 Schnell via diffusers (downloaded on-demand ~4GB).
Falls back gracefully if torch/diffusers not installed.
"""
import base64
import io
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

MODELS_DIR = Path.home() / ".mnemorium" / "models"
FLUX_MODEL_ID = "black-forest-labs/FLUX.1-schnell"


class ImageGenRequest(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    steps: int = 4


class ImageGenResponse(BaseModel):
    image_base64: str
    model: str


@router.post("/generate-image", response_model=ImageGenResponse)
async def generate_image(request: ImageGenRequest):
    try:
        import torch
        from diffusers import FluxPipeline
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="diffusers/torch non installati. Installa con: pip install diffusers torch",
        )

    try:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        cache_dir = MODELS_DIR / "flux-schnell"

        # Determine device
        if torch.cuda.is_available():
            device = "cuda"
            dtype = torch.float16
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            device = "mps"
            dtype = torch.float16
        else:
            device = "cpu"
            dtype = torch.float32

        pipe = FluxPipeline.from_pretrained(
            FLUX_MODEL_ID,
            torch_dtype=dtype,
            cache_dir=str(cache_dir),
        )
        pipe = pipe.to(device)

        # Enhance prompt for mnemonic images
        enhanced_prompt = (
            f"{request.prompt}, surreal, vivid, colorful, highly detailed, "
            "dreamlike, no text, sharp focus, professional illustration"
        )

        result = pipe(
            enhanced_prompt,
            num_inference_steps=request.steps,
            width=request.width,
            height=request.height,
            guidance_scale=0.0,  # FLUX Schnell doesn't use CFG
        )

        img = result.images[0]
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_b64 = base64.b64encode(buffer.getvalue()).decode()

        return ImageGenResponse(
            image_base64=img_b64,
            model=FLUX_MODEL_ID,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

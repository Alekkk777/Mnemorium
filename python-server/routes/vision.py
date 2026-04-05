"""
Vision analysis route.
Uses Ollama (Gemma 4 27B vision) to analyze palace images and suggest annotation positions.
"""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

OLLAMA_URL = "http://localhost:11434"
VISION_MODEL = "gemma3:27b"

SYSTEM_PROMPT = """Sei un assistente per la memorizzazione. Analizza questa immagine di un luogo e identifica 5-8 oggetti o punti di interesse distinti.

Per ogni oggetto trovato, restituisci:
- nome: nome breve dell'oggetto
- posizione: descrizione della posizione (es. "angolo in alto a sinistra", "centro", "pavimento a destra")
- descrizione: una breve descrizione visiva

Rispondi in formato JSON: {"objects": [{"name": "...", "position": "...", "description": "..."}]}"""


class VisionRequest(BaseModel):
    image_base64: str
    language: str = "italiano"


class VisionObject(BaseModel):
    name: str
    position: str
    description: str


class VisionResponse(BaseModel):
    objects: list[VisionObject]
    model: str


@router.post("/analyze-image", response_model=VisionResponse)
async def analyze_image(request: VisionRequest):
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": VISION_MODEL,
                    "prompt": "Analizza questa immagine e identifica gli oggetti principali.",
                    "system": SYSTEM_PROMPT,
                    "images": [request.image_base64],
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.3},
                },
            )
            response.raise_for_status()
            data = response.json()

            import json
            result = json.loads(data.get("response", "{}"))
            objects = [VisionObject(**obj) for obj in result.get("objects", [])]

            return VisionResponse(objects=objects, model=VISION_MODEL)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama non è in esecuzione. Installa e avvia Ollama: https://ollama.com",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

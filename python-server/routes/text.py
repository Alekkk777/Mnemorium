"""
Text generation route.
Uses Ollama (Gemma 4B) if available, otherwise returns an error.
"""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

OLLAMA_URL = "http://localhost:11434"
MNEMONIC_MODEL = "gemma3:4b"

SYSTEM_PROMPT = """Sei un esperto di tecniche mnemoniche. Il tuo compito è trasformare concetti in immagini mentali vivide, bizzarre e memorabili.

Per ogni concetto che ti viene dato:
1. Crea un'immagine mentale VIVIDA e BIZZARRA che rappresenti il concetto
2. Usa colori brillanti, azioni esagerate, proporzioni assurde
3. Coinvolgi più sensi (vista, udito, olfatto)
4. L'immagine deve essere difficile da dimenticare

Rispondi SOLO con l'immagine mnemonica, senza spiegazioni o introduzioni. Massimo 150 parole."""


class MnemonicRequest(BaseModel):
    text: str
    language: str = "italiano"


class MnemonicResponse(BaseModel):
    mnemonic: str
    model: str


@router.post("/generate-mnemonic", response_model=MnemonicResponse)
async def generate_mnemonic(request: MnemonicRequest):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MNEMONIC_MODEL,
                    "prompt": f"Crea un'immagine mnemonica vivida per: {request.text}",
                    "system": SYSTEM_PROMPT,
                    "stream": False,
                    "options": {
                        "temperature": 0.9,
                        "num_predict": 200,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            return MnemonicResponse(
                mnemonic=data.get("response", "").strip(),
                model=MNEMONIC_MODEL,
            )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama non è in esecuzione. Installa e avvia Ollama: https://ollama.com",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

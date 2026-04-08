"""
upload.py — Photo upload endpoint for mobile QR scanning.
Phone scans QR → opens browser → uploads photo → desktop picks it up.
No auth needed: token-based, short-lived, LAN-only.
"""
import base64
import socket
import uuid
from datetime import datetime, timedelta
from typing import Dict, List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse

router = APIRouter(prefix="/upload")

# In-memory sessions: token -> { palace_id, files, created_at }
_sessions: Dict[str, dict] = {}
_server_port: int = 7891  # updated by main.py at startup


def set_port(port: int) -> None:
    global _server_port
    _server_port = port


def _local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def _cleanup():
    cutoff = datetime.now() - timedelta(hours=1)
    stale = [t for t, s in _sessions.items() if s["created_at"] < cutoff]
    for t in stale:
        del _sessions[t]


@router.get("/local-ip")
async def local_ip():
    return {"ip": _local_ip()}


@router.get("/session")
async def create_session(palace_id: str):
    """Create upload session → returns token + mobile URL for QR code."""
    _cleanup()
    token = uuid.uuid4().hex
    _sessions[token] = {
        "palace_id": palace_id,
        "files": [],
        "created_at": datetime.now(),
    }
    ip = _local_ip()
    url = f"http://{ip}:{_server_port}/upload/page/{token}"
    return {"token": token, "url": url, "ip": ip, "port": _server_port}


@router.get("/page/{token}", response_class=HTMLResponse)
async def upload_page(token: str):
    """Mobile-friendly upload page (served to phone browser)."""
    if token not in _sessions:
        return HTMLResponse(
            "<html><body style='font-family:sans-serif;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;'>"
            "<h2>⏱ Session expired.<br>Rigenera il QR code nell'app.</h2></body></html>",
            status_code=404,
        )

    html = f"""<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <title>Mnemorium — Upload photos</title>
  <style>
    *{{margin:0;padding:0;box-sizing:border-box}}
    body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0f0f11;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px}}
    h1{{font-size:26px;font-weight:800;margin-bottom:6px;text-align:center}}
    .sub{{color:#6b7280;font-size:14px;margin-bottom:36px;text-align:center}}
    .btn{{display:block;width:100%;padding:18px;border-radius:14px;border:none;font-size:17px;font-weight:700;cursor:pointer;margin-bottom:12px;transition:opacity .15s}}
    .btn:active{{opacity:.8}}
    .primary{{background:#6366f1;color:#fff}}
    .secondary{{background:#1f2937;color:#d1d5db;font-size:15px}}
    input[type=file]{{display:none}}
    .status{{margin-top:24px;padding:16px 20px;border-radius:14px;text-align:center;display:none;font-weight:600;font-size:15px}}
    .ok{{background:#064e3b;color:#6ee7b7}}
    .err{{background:#7f1d1d;color:#fca5a5}}
    .loading{{background:#1e1b4b;color:#a5b4fc}}
    .preview{{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;justify-content:center}}
    .preview img{{width:88px;height:88px;object-fit:cover;border-radius:12px;border:2px solid #374151}}
    .badge{{display:inline-block;background:#6366f1;color:#fff;border-radius:99px;font-size:11px;padding:2px 8px;margin-left:6px;vertical-align:middle}}
  </style>
</head>
<body>
  <h1>📸 Mnemorium</h1>
  <p class="sub">Take a photo or choose from gallery<br>to add it to your memory palace</p>

  <input type="file" id="cam"   accept="image/*" capture="environment" multiple>
  <input type="file" id="gall"  accept="image/*" multiple>

  <button class="btn primary"    onclick="document.getElementById('cam').click()">📷 Take Photo</button>
  <button class="btn secondary"  onclick="document.getElementById('gall').click()">🖼️ Choose from Gallery</button>

  <div class="preview" id="preview"></div>
  <div class="status"  id="status"></div>

  <script>
    const TOKEN = '{token}';
    let uploading = false;

    async function upload(files) {{
      if (!files.length || uploading) return;
      uploading = true;
      show('Uploading...', 'loading');
      renderPreview(files);

      const fd = new FormData();
      for (const f of files) fd.append('files', f);

      try {{
        const r  = await fetch('/upload/submit/' + TOKEN, {{method:'POST', body:fd}});
        const d  = await r.json();
        if (d.ok) {{
          show('✅ ' + d.count + (d.count === 1 ? ' photo uploaded' : ' photos uploaded') + '! Torna all\\u2019app.', 'ok');
        }} else {{
          show('❌ ' + (d.error || 'Unknown error'), 'err');
        }}
      }} catch(e) {{
        show('❌ Network error: ' + e.message, 'err');
      }} finally {{
        uploading = false;
      }}
    }}

    function show(msg, cls) {{
      const el = document.getElementById('status');
      el.textContent = msg; el.className = 'status ' + cls; el.style.display = 'block';
    }}

    function renderPreview(files) {{
      const el = document.getElementById('preview');
      el.innerHTML = '';
      Array.from(files).forEach(f => {{
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        el.appendChild(img);
      }});
    }}

    document.getElementById('cam').addEventListener('change',  e => upload(Array.from(e.target.files)));
    document.getElementById('gall').addEventListener('change', e => upload(Array.from(e.target.files)));
  </script>
</body>
</html>"""
    return HTMLResponse(html)


@router.post("/submit/{token}")
async def submit_files(token: str, files: List[UploadFile] = File(...)):
    """Receive photos from phone, store as base64 for desktop to pick up."""
    if token not in _sessions:
        raise HTTPException(status_code=404, detail="Session expired or not found")

    count = 0
    for f in files:
        data = await f.read()
        b64 = base64.b64encode(data).decode("utf-8")
        _sessions[token]["files"].append(
            {
                "data_base64": b64,
                "file_name": f.filename or f"photo_{uuid.uuid4().hex[:8]}.jpg",
                "content_type": f.content_type or "image/jpeg",
            }
        )
        count += 1

    return JSONResponse({"ok": True, "count": count})


@router.get("/poll/{token}")
async def poll_files(token: str):
    """Desktop polls this endpoint — returns pending photos then clears them."""
    if token not in _sessions:
        return JSONResponse({"files": [], "expired": True})

    files = list(_sessions[token]["files"])
    _sessions[token]["files"].clear()
    return JSONResponse({"files": files, "expired": False, "count": len(files)})

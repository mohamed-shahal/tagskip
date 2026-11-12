import io
import os

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image

from .remover import auto_locate, reference_box, remove_star

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

app = FastAPI(title="TagSkip API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/remove-watermark")
async def remove_watermark(file: UploadFile = File(...)) -> Response:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded file exceeds the {MAX_UPLOAD_BYTES} byte limit.",
        )

    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception as error:
        raise HTTPException(
            status_code=415, detail="Uploaded file is not a supported image."
        ) from error

    if image.mode.startswith("I;16") or image.mode in ("I", "F"):
        raise HTTPException(status_code=415, detail="Only 8-bit images are supported.")

    fmt = image.format
    rgb = np.array(image.convert("RGB"))
    height, width = rgb.shape[:2]
    noise = 1.8 if fmt in ("JPEG", "WEBP") else 0.6

    candidates = [reference_box(width, height)]
    located = auto_locate(rgb)
    if located and located not in candidates:
        candidates.append(located)

    cleaned = None
    for box in candidates:
        try:
            cleaned, _ = remove_star(
                rgb, box, noise=noise, verbose=False, min_plateau=0.12
            )
            break
        except ValueError as error:
            if "No logo found" not in str(error):
                raise HTTPException(status_code=422, detail=str(error)) from error

    if cleaned is None:
        raise HTTPException(
            status_code=422,
            detail="Could not find the logo in the image.",
        )

    buffer = io.BytesIO()
    Image.fromarray(cleaned, "RGB").save(buffer, format="PNG")

    return Response(content=buffer.getvalue(), media_type="image/png")

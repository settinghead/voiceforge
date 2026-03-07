"""Qwen3-TTS FastAPI server for Voxlert — dual MLX / PyTorch backend.

Voices are uploaded via POST /voices (content-hashed, deduplicated) and
referenced by voice_id in the POST /tts endpoint.
"""

import os
import gc
import io
import json
import hashlib
import asyncio
import concurrent.futures
from pathlib import Path

import soundfile as sf
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

RUNTIME = os.environ.get("QWEN_TTS_RUNTIME", "mlx").lower()
VOICES_DIR = Path(os.environ.get(
    "QWEN_TTS_VOICES_DIR",
    str(Path(__file__).resolve().parent / "voices"),
))
MODELS_DIR = Path(__file__).resolve().parent / "models"
PORT = 8100
TTS_TIMEOUT = 60

app = FastAPI(title="Qwen3-TTS Server")

# Filled at startup
model = None
model_name = None
voice_meta: dict[str, dict] = {}           # MLX:     voice_id -> {ref_audio, ref_text}
voice_prompt_cache: dict[str, list] = {}    # PyTorch: voice_id -> VoiceClonePromptItem list

# Single-thread executor — keeps all GPU work on ONE thread to respect
# Metal thread affinity (MLX) and MPS requirements (PyTorch).
_gpu_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=1, thread_name_prefix="gpu",
)

# ---------------------------------------------------------------------------
# MLX backend
# ---------------------------------------------------------------------------
MLX_MODEL_ID = os.environ.get(
    "QWEN_TTS_MLX_MODEL",
    "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit",
)


def _load_mlx():
    global model, model_name
    from mlx_audio.tts.utils import load_model

    model_name = MLX_MODEL_ID.split("/")[-1]
    print(f"Loading MLX model {model_name} …")
    model = load_model(MLX_MODEL_ID)
    print("MLX model loaded.")


def _load_voices_mlx():
    """Load previously-uploaded voices from disk (MLX backend)."""
    if not VOICES_DIR.exists():
        return
    for voice_dir in sorted(VOICES_DIR.iterdir()):
        if not voice_dir.is_dir():
            continue
        meta_path = voice_dir / "meta.json"
        wav_path = voice_dir / "voice.wav"
        if not meta_path.exists() or not wav_path.exists():
            continue
        meta = json.loads(meta_path.read_text())
        voice_id = voice_dir.name
        voice_meta[voice_id] = {
            "ref_audio": str(wav_path),
            "ref_text": meta["ref_text"],
        }
        print(f"  voice: {voice_id}")
    print(f"Loaded {len(voice_meta)} voices")


def _register_voice_mlx(voice_id: str, wav_path: str, ref_text: str):
    voice_meta[voice_id] = {"ref_audio": wav_path, "ref_text": ref_text}


def _generate_mlx(text: str, ref_audio: str | None, ref_text: str | None) -> bytes:
    import mlx.core as mx
    import numpy as np

    kwargs = {"text": text}
    if ref_audio and ref_text:
        kwargs["ref_audio"] = ref_audio
        kwargs["ref_text"] = ref_text

    chunks = []
    sample_rate = None
    for result in model.generate(**kwargs):
        chunks.append(np.array(result.audio))
        if sample_rate is None:
            sample_rate = result.sample_rate

    audio = np.concatenate(chunks)
    del chunks
    mx.clear_cache()
    gc.collect()

    buf = io.BytesIO()
    sf.write(buf, audio, sample_rate, subtype="PCM_16", format="WAV")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# PyTorch backend
# ---------------------------------------------------------------------------
AVAILABLE_MODELS = {
    "0.6B": "Qwen3-TTS-12Hz-0.6B-Base",
    "1.7B": "Qwen3-TTS-12Hz-1.7B-Base",
}
DEFAULT_PT_MODEL = os.environ.get("QWEN_TTS_MODEL", "1.7B")


def _load_pytorch():
    global model, model_name
    import torch
    from qwen_tts import Qwen3TTSModel

    if torch.cuda.is_available():
        device_map = "cuda"
        device_name = "cuda"
    elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        device_map = "mps"
        device_name = "mps"
    else:
        device_map = "cpu"
        device_name = "cpu"

    model_key = DEFAULT_PT_MODEL
    if model_key not in AVAILABLE_MODELS:
        print(f"Unknown model key '{model_key}', falling back to 1.7B")
        model_key = "1.7B"
    model_name = AVAILABLE_MODELS[model_key]
    model_path = MODELS_DIR / model_name
    if not model_path.exists():
        raise RuntimeError(f"Model not found: {model_path}")
    print(f"Loading {model_name} on {device_name} …")
    model = Qwen3TTSModel.from_pretrained(
        str(model_path),
        device_map=device_map,
        dtype=torch.float32,
        attn_implementation="sdpa",
    )
    print("Model loaded.")


def _load_voices_pytorch():
    """Load previously-uploaded voices from disk (PyTorch backend)."""
    if not VOICES_DIR.exists():
        return
    for voice_dir in sorted(VOICES_DIR.iterdir()):
        if not voice_dir.is_dir():
            continue
        meta_path = voice_dir / "meta.json"
        wav_path = voice_dir / "voice.wav"
        if not meta_path.exists() or not wav_path.exists():
            continue
        meta = json.loads(meta_path.read_text())
        voice_id = voice_dir.name
        prompt = model.create_voice_clone_prompt(
            ref_audio=str(wav_path),
            ref_text=meta["ref_text"],
        )
        voice_prompt_cache[voice_id] = prompt
        print(f"  cached voice: {voice_id}")
    print(f"Loaded {len(voice_prompt_cache)} voices")


def _register_voice_pytorch(voice_id: str, wav_path: str, ref_text: str):
    prompt = model.create_voice_clone_prompt(
        ref_audio=wav_path,
        ref_text=ref_text,
    )
    voice_prompt_cache[voice_id] = prompt


def _generate_pytorch(text: str, voice_clone_prompt) -> bytes:
    wavs, sr = model.generate_voice_clone(
        text=text,
        language="English",
        voice_clone_prompt=voice_clone_prompt,
    )
    buf = io.BytesIO()
    sf.write(buf, wavs[0], sr, subtype="PCM_16", format="WAV")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup():
    if RUNTIME == "mlx":
        _load_mlx()
        _load_voices_mlx()
    elif RUNTIME == "pytorch":
        _load_pytorch()
        _load_voices_pytorch()
    else:
        raise RuntimeError(
            f"Unknown QWEN_TTS_RUNTIME: {RUNTIME!r} (use 'mlx' or 'pytorch')"
        )


def _hash_audio(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


@app.post("/voices")
async def upload_voice(
    audio: UploadFile = File(...),
    ref_text: str = Form(...),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "Empty audio file")

    voice_id = _hash_audio(audio_bytes)

    # Already registered in memory — return immediately
    if RUNTIME == "mlx" and voice_id in voice_meta:
        return {"voice_id": voice_id}
    if RUNTIME == "pytorch" and voice_id in voice_prompt_cache:
        return {"voice_id": voice_id}

    # Persist to disk
    voice_dir = VOICES_DIR / voice_id
    voice_dir.mkdir(parents=True, exist_ok=True)
    wav_path = voice_dir / "voice.wav"
    wav_path.write_bytes(audio_bytes)
    (voice_dir / "meta.json").write_text(json.dumps({"ref_text": ref_text}))

    # Register in memory
    if RUNTIME == "mlx":
        _register_voice_mlx(voice_id, str(wav_path), ref_text)
    else:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            _gpu_executor,
            _register_voice_pytorch, voice_id, str(wav_path), ref_text,
        )

    print(f"Registered voice {voice_id}")
    return {"voice_id": voice_id}


@app.get("/voices")
def list_voices():
    if RUNTIME == "mlx":
        ids = sorted(voice_meta.keys())
    else:
        ids = sorted(voice_prompt_cache.keys())
    return {"voices": ids}


class TTSRequest(BaseModel):
    text: str
    voice_id: str | None = None


@app.post("/tts")
async def tts(req: TTSRequest):
    loop = asyncio.get_running_loop()

    if RUNTIME == "mlx":
        ref_audio = None
        ref_text = None
        if req.voice_id:
            if req.voice_id not in voice_meta:
                raise HTTPException(404, f"Unknown voice_id: {req.voice_id}")
            meta = voice_meta[req.voice_id]
            ref_audio = meta["ref_audio"]
            ref_text = meta["ref_text"]
        try:
            wav_bytes = await asyncio.wait_for(
                loop.run_in_executor(
                    _gpu_executor,
                    _generate_mlx, req.text, ref_audio, ref_text,
                ),
                timeout=TTS_TIMEOUT,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, "TTS generation timed out")
    else:
        if not req.voice_id:
            raise HTTPException(400, "voice_id is required for PyTorch backend")
        if req.voice_id not in voice_prompt_cache:
            raise HTTPException(404, f"Unknown voice_id: {req.voice_id}")
        try:
            wav_bytes = await asyncio.wait_for(
                loop.run_in_executor(
                    _gpu_executor,
                    _generate_pytorch, req.text, voice_prompt_cache[req.voice_id],
                ),
                timeout=TTS_TIMEOUT,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, "TTS generation timed out")

    return Response(content=wav_bytes, media_type="audio/wav")


@app.get("/health")
def health():
    if RUNTIME == "mlx":
        voices = sorted(voice_meta.keys())
        device = "apple-silicon-mlx"
    else:
        voices = sorted(voice_prompt_cache.keys())
        import torch
        if torch.cuda.is_available():
            device = "cuda"
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"
    return {
        "model": model_name,
        "runtime": RUNTIME,
        "device": device,
        "voices": voices,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)

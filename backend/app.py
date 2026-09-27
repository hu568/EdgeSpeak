"""EdgeTTS Web 后端服务。

基于 FastAPI + edge-tts：
- GET  /api/voices  获取微软 Edge 语音列表（带缓存）
- POST /api/tts     文本转语音，以 audio/mpeg 流式返回
- 静态托管 frontend/ 目录（访问 http://127.0.0.1:8000 即为前端页面）

Copyright (C) 2026 EdgeTTS Web contributors
本程序以 GNU GPL-3.0 协议发布（见项目根目录 LICENSE），不含任何担保。

启动：python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
      或直接 python backend/app.py
"""

from __future__ import annotations

import io
import re
import time
from pathlib import Path

import edge_tts
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

VOICES_CACHE_TTL = 3600  # 语音列表缓存 1 小时
MAX_TEXT_LENGTH = 8000   # 单次合成文本长度上限

app = FastAPI(title="EdgeTTS Web", version="0.1.0")

_voices_cache: dict | None = None
_voices_cached_at: float = 0.0

# rate / pitch / volume 仅接受 edge-tts 要求的带符号格式
_RATE_RE = re.compile(r"^[+-]\d{1,3}%$")
_PITCH_RE = re.compile(r"^[+-]\d{1,3}Hz$")
_VOLUME_RE = re.compile(r"^[+-]\d{1,3}%")


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LENGTH)
    voice: str = Field("zh-CN-XiaoxiaoNeural")
    rate: str = Field("+0%")
    pitch: str = Field("+0Hz")
    volume: str = Field("+0%")


def _validate_params(rate: str, pitch: str, volume: str) -> None:
    if not _RATE_RE.match(rate):
        raise HTTPException(422, f"rate 格式错误：应为 +10% 或 -10%，收到 {rate!r}")
    if not _PITCH_RE.match(pitch):
        raise HTTPException(422, f"pitch 格式错误：应为 +10Hz 或 -10Hz，收到 {pitch!r}")
    if not _VOLUME_RE.match(volume):
        raise HTTPException(422, f"volume 格式错误：应为 +10% 或 -10%，收到 {volume!r}")


def _safe_filename(voice: str) -> str:
    return re.sub(r"[^\w.-]+", "_", voice).strip("_") or "tts"


@app.get("/api/voices")
async def list_voices():
    """返回全部可用语音，结果缓存 1 小时。"""
    global _voices_cache, _voices_cached_at
    now = time.time()
    if _voices_cache is None or now - _voices_cached_at > VOICES_CACHE_TTL:
        try:
            raw = await edge_tts.list_voices()
        except Exception as exc:  # 网络不可达等情况
            raise HTTPException(502, f"获取语音列表失败：{exc}") from exc
        _voices_cache = [
            {
                "shortName": v["ShortName"],
                "displayName": v.get("FriendlyName", v["ShortName"]),
                "locale": v["Locale"],
                "language": v.get("Language"),
                "gender": v.get("Gender"),
            }
            for v in raw
        ]
        _voices_cached_at = now
    return {"count": len(_voices_cache), "voices": _voices_cache}


@app.post(
    "/api/tts",
    responses={200: {"content": {"audio/mpeg": {}}}},
)
async def synthesize(req: TTSRequest):
    """合成语音并以 MP3 流式返回。"""
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "文本不能为空")
    _validate_params(req.rate, req.pitch, req.volume)

    communicate = edge_tts.Communicate(
        text, req.voice, rate=req.rate, pitch=req.pitch, volume=req.volume
    )

    async def audio_stream():
        buffer = io.BytesIO()
        try:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    data = chunk["data"]
                    buffer.write(data)
                    yield data
        except Exception as exc:
            # 流已开始后无法改状态码，交由客户端按截断处理
            if buffer.tell() == 0:
                raise HTTPException(502, f"合成失败：{exc}") from exc
            raise

    filename = f"{_safe_filename(req.voice)}.mp3"
    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(FRONTEND_DIR / "favicon.svg")


# 静态托管前端（必须放在 API 路由之后挂载）
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

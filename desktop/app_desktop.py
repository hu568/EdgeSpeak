"""EdgeSpeak 桌面壳（WebView2）。

用 pywebview 以系统 WebView2（Edge Chromium）内核承载前端页面，
后端仍是 backend/app.py 的 FastAPI 应用，由本地 uvicorn 线程提供服务。

不用 pywebview 内置 HTTP 服务的原因：它对 /api/tts 的 MP3
流式响应支持不佳，必须保留 uvicorn 边合成边流式返回的能力。

启动：python desktop/app_desktop.py，或双击 run-desktop.bat

Copyright (C) 2026 EdgeSpeak contributors
本程序以 GNU GPL-3.0 协议发布（见项目根目录 LICENSE），不含任何担保。
"""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
from pathlib import Path

# 允许从任意目录启动（双击 bat / python desktop/app_desktop.py）
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import uvicorn
import webview

from backend.app import app

WINDOW_TITLE = "EdgeSpeak 语音合成"
WINDOW_SIZE = (1200, 780)
MIN_SIZE = (860, 560)
SERVER_TIMEOUT = 15.0  # 等待 uvicorn 就绪的上限（秒）

WEBVIEW2_URL = "https://developer.microsoft.com/microsoft-edge/webview2/"


def _pick_free_port() -> int:
    """向系统要一个空闲端口，避免与 Web 版固定端口 8000 冲突。"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _storage_path() -> str:
    """WebView2 用户数据目录（localStorage 里的主题 / 音色记忆需持久化）。"""
    base = os.environ.get("LOCALAPPDATA", str(ROOT))
    return str(Path(base) / "EdgeSpeak" / "WebView2")


class LocalServer:
    """在后台线程运行 uvicorn，承载 backend.app。"""

    def __init__(self) -> None:
        self.port = _pick_free_port()
        self.url = f"http://127.0.0.1:{self.port}/"
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=self.port,
            log_level="warning",
            access_log=False,
        )
        self.server = uvicorn.Server(config)
        self.thread = threading.Thread(
            target=self.server.run, name="etts-uvicorn", daemon=True
        )

    def start(self) -> None:
        self.thread.start()
        deadline = time.monotonic() + SERVER_TIMEOUT
        while not self.server.started:
            if not self.thread.is_alive() or time.monotonic() > deadline:
                raise RuntimeError("本地服务启动失败（端口被占用或被安全软件拦截）")
            time.sleep(0.05)

    def stop(self) -> None:
        self.server.should_exit = True
        self.thread.join(timeout=3)


def main() -> int:
    server = LocalServer()
    try:
        server.start()
    except RuntimeError as exc:
        print(f"[EdgeSpeak] {exc}", file=sys.stderr)
        return 1

    webview.create_window(
        WINDOW_TITLE,
        server.url,
        width=WINDOW_SIZE[0],
        height=WINDOW_SIZE[1],
        min_size=MIN_SIZE,
    )
    try:
        # gui='edgechromium'：强制走系统 WebView2 运行时（Win10/11 自带）
        webview.start(
            gui="edgechromium",
            private_mode=False,  # 保持 localStorage，主题与音色记忆跨启动生效
            storage_path=_storage_path(),
        )
    except KeyboardInterrupt:
        pass
    except Exception as exc:
        print(
            f"[EdgeSpeak] WebView2 窗口启动失败：{exc}\n"
            f"请安装微软 WebView2 Runtime（Win10/11 通常自带）：\n{WEBVIEW2_URL}",
            file=sys.stderr,
        )
        return 2
    finally:
        server.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main())

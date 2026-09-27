# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec：EdgeSpeak 桌面壳（pywebview + WebView2）onedir 打包。

构建（输出 EdgeSpeak.exe + _internal/ 到项目根目录，双击即用）：
    python package_release.py            # 构建 + 打 release zip
    python package_release.py --skip-build  # 仅打包（exe 已构建）

前端 frontend/ 以 datas 打进 _internal/frontend，
backend/app.py 在冻结态改从 sys._MEIPASS 解析静态目录。
"""

import os

from PyInstaller.utils.hooks import collect_all

# SPECPATH 由 PyInstaller 注入：本 spec（desktop/）所在目录
_SPEC_DIR = os.path.abspath(SPECPATH)
_PROJECT_ROOT = os.path.dirname(_SPEC_DIR)


def _collect(name):
    datas, binaries, hidden = collect_all(name)
    return datas, binaries, hidden


# pywebview（Windows edgechromium 后端）依赖 pythonnet/clr_loader 加载 WebView2
pywebview_datas, pywebview_binaries, pywebview_hidden = _collect('pywebview')
clr_datas, clr_binaries, clr_hidden = _collect('clr_loader')
pynet_datas, pynet_binaries, pynet_hidden = _collect('pythonnet')
# uvicorn 的 loops/protocols/lifespan 为运行时动态导入，需整体收集
uvicorn_datas, uvicorn_binaries, uvicorn_hidden = _collect('uvicorn')
# edge-tts 的 SSL 根证书走 certifi.where()
certifi_datas, certifi_binaries, certifi_hidden = _collect('certifi')

a = Analysis(
    ['app_desktop.py'],
    pathex=[_SPEC_DIR, _PROJECT_ROOT],
    binaries=(
        pywebview_binaries + clr_binaries + pynet_binaries
        + uvicorn_binaries + certifi_binaries
    ),
    datas=[
        ('../frontend', 'frontend'),  # 落到 _internal/frontend
    ]
    + pywebview_datas + clr_datas + pynet_datas
    + uvicorn_datas + certifi_datas,
    hiddenimports=[
        'backend.app',
        'edge_tts',
    ]
    + pywebview_hidden + clr_hidden + pynet_hidden
    + uvicorn_hidden + certifi_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'PyQt5', 'PySide2', 'PySide6',
        'numpy', 'scipy', 'pandas', 'matplotlib',
        'watchfiles', 'uvloop',
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

_icon = os.path.join(_SPEC_DIR, 'icon.ico')

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='EdgeSpeak',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # 桌面窗口应用，无控制台
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=_icon if os.path.isfile(_icon) else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='EdgeSpeak',
)

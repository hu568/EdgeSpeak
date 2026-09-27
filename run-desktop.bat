@echo off
rem EdgeSpeak 桌面模式一键启动（WebView2 窗口，无需浏览器）
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
    echo [EdgeSpeak] 未找到 Python，请先安装 Python 3.10+ 并加入 PATH
    pause
    exit /b 1
)
python -c "import webview" >nul 2>nul
if errorlevel 1 (
    echo [EdgeSpeak] 首次运行，安装桌面模式依赖...
    python -m pip install -r backend/requirements.txt
)
echo [EdgeSpeak] 正在启动桌面窗口...
python desktop\app_desktop.py
if errorlevel 1 pause

@echo off
rem EdgeTTS Web 一键启动
cd /d "%~dp0"
echo [EdgeTTS] 启动服务：http://127.0.0.1:8000
start "" http://127.0.0.1:8000
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
pause

# EdgeTTS Web

基于微软 Edge 在线语音合成（[edge-tts](https://github.com/rany2/edge-tts)）的本地 Web 应用：
**Python FastAPI 后端 + 原生 HTML/JS 前端**，界面复刻 WinUI 11 设计。

![深色主题](gui-test-screenshots/t3_generate_success.png)

## 功能

- 🎙️ **320+ 神经语音**：覆盖各语言区域，支持按名称 / 区域搜索，按 locale 分组展示
- 🎚️ **参数可调**：语速（-100% ~ +100%）、音调（±50Hz）、音量（-100% ~ +100%）
- ▶️ **在线试听**：流式返回 MP3，合成完成后自动加载播放器
- 💾 **一键下载**：以 `语音名_时间戳.mp3` 命名保存
- 🌗 **主题**：跟随系统 / 手动切换浅色与深色，语音选择记忆在本地
- ⌨️ **快捷键**：`Ctrl + Enter` 快速生成；滑块支持方向键微调

## 界面样式

前端样式提取自 [WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb)（MIT），
将其中 Vue 控件的设计令牌与样式改写为原生 CSS（`frontend/css/winui-theme.css`、`winui-controls.css`），
交互组件（ComboBox、Slider、SelectorBar、InfoBar 等）以原生 JavaScript 按相同类名规范实现。

## 快速开始

```bash
# 1. 安装依赖（Python 3.10+）
pip install -r backend/requirements.txt

# 2. 启动服务
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
# 或：python backend/app.py

# 3. 打开页面
# http://127.0.0.1:8000
```

Windows 下也可直接双击 `run.bat`。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/voices` | 语音列表（缓存 1 小时） |
| POST | `/api/tts`    | 文本合成语音，流式返回 `audio/mpeg` |

`POST /api/tts` 请求体：

```json
{
  "text": "要合成的文本（≤8000 字符）",
  "voice": "zh-CN-XiaoxiaoNeural",
  "rate": "+10%",
  "pitch": "+0Hz",
  "volume": "+0%"
}
```

`rate` / `pitch` / `volume` 必须为带符号格式（如 `+10%`、`-5Hz`），后端会校验。

## 项目结构

```
EdgeTTS/
├── backend/
│   ├── app.py              # FastAPI 后端（API + 静态托管前端）
│   └── requirements.txt
├── frontend/
│   ├── index.html          # 单页应用
│   ├── favicon.svg
│   ├── css/
│   │   ├── winui-theme.css      # WinUI 设计令牌（提取自 WinUIonWeb）
│   │   ├── winui-animations.css # WinUI 动画曲线（提取自 WinUIonWeb）
│   │   ├── winui-controls.css   # 控件样式（Button/TextBox/ComboBox/Slider…）
│   │   └── app.css              # 应用布局
│   └── js/
│       └── app.js          # 组件交互与 API 调用
├── run.bat                 # Windows 一键启动
└── README.md
```

## 说明

- 语音合成依赖微软 Edge 在线 TTS 服务，需要可访问外网。
- 仅供学习与个人使用；语音服务的使用权与商标归 Microsoft 所有。

## License

MIT（其中 CSS 设计令牌与控件样式来自 WinUIonWeb，见 `NOTICE`）

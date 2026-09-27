# EdgeSpeak

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
- 🖥️ **桌面模式**：Windows 下可用系统 WebView2（Edge Chromium）内核在独立窗口中运行，无需浏览器

## 界面样式

前端样式提取自 [WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb)（GPL-3.0），
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

### 桌面模式（WebView2）

Windows 下可封装为独立桌面窗口运行，不再依赖浏览器标签页：

```bash
# 桌面模式依赖在 backend/requirements.txt 中（pywebview）
pip install -r backend/requirements.txt

# 启动桌面窗口
python desktop/app_desktop.py
```

也可直接双击 `run-desktop.bat`（首次运行会自动补装依赖）。

- 窗口使用系统 **WebView2 运行时**（Win10/11 自带，如缺失可从微软官网安装）。
- 后端由本地 uvicorn 线程承载，端口自动分配（避免与 Web 版 8000 冲突），关闭窗口即退出服务。
- 主题 / 音色的 localStorage 记忆持久化在 `%LOCALAPPDATA%\EdgeSpeak\WebView2`。

### 打包为 exe（仿 RE4x 发布形式）

无需安装 Python，解压双击 `EdgeSpeak.exe` 即用的便携版：

```bash
pip install pyinstaller            # 打包工具

python package_release.py          # 构建 exe 并打出 release/EdgeSpeak-v<版本>.zip
python package_release.py 1.0.0    # 指定版本号（缺省用日期）
python package_release.py --skip-build  # exe 已构建，仅重新打 zip
```

- 产物布局：项目根 `EdgeSpeak.exe` + `_internal/`（PyInstaller onedir 运行时数据）。
- zip 内为 `EdgeSpeak/` 文件夹，附带 `README.md`、`LICENSE`、`RELEASE_INFO.txt`，资源管理器解压后双击 exe 即用。
- 前端资源打包在 `_internal/frontend/`；窗口图标为 `desktop/icon.ico`（存在时自动嵌入）。
- 打包过程缓存写在 `TMP/build/`，结束后自动清理。
- `EdgeSpeak` 名称与 edgespeak.com 的产品无关联，语音能力来自开源库 edge-tts。

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
EdgeSpeak/
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
├── desktop/
│   ├── app_desktop.py      # WebView2 桌面壳（pywebview + 本地 uvicorn）
│   └── build.spec          # PyInstaller spec（onedir 打包）
├── package_release.py      # 一键打包：构建 exe + 打 release zip
├── RELEASE_INFO.txt        # 随 zip 分发的版本/许可说明
├── run.bat                 # Windows 一键启动（浏览器模式）
├── run-desktop.bat         # Windows 一键启动（桌面窗口模式）
└── README.md
```

## 说明

- 语音合成依赖微软 Edge 在线 TTS 服务，需要可访问外网。
- 仅供学习与个人使用；语音服务的使用权与商标归 Microsoft 所有。

## License

本项目以 **GNU GPL-3.0** 协议发布（见 `LICENSE`）。
其中 `frontend/css/winui-theme.css`、`winui-animations.css` 及 `winui-controls.css`
中的控件样式提取自 WinUIonWeb（上游同为 GPL-3.0，来源见各文件头部注释），随本项目整体以 GPL-3.0 发布。

### 第三方依赖许可

| 依赖 | 许可证 |
|------|--------|
| fastapi / pydantic | MIT |
| uvicorn / starlette | BSD-3-Clause |
| edge-tts | LGPL-3.0（其中 `srt_composer.py` 为 MIT） |
| pywebview | BSD-3-Clause |
| pythonnet（Windows 上 WebView2 绑定） | MIT |

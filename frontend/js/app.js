/* ============================================================
 * EdgeTTS Web - 前端逻辑
 * 组件交互按 WinUIonWeb 的类名与视觉规范以原生 JS 实现。
 * Copyright (C) 2026 EdgeTTS Web contributors
 * 本程序以 GNU GPL-3.0 协议发布（见项目根目录 LICENSE），不含任何担保。
 * ============================================================ */
'use strict';

const $ = (sel) => document.querySelector(sel);

/* ---------------- 主题 ---------------- */
const THEME_KEY = 'edgetts-theme';

function applyTheme(mode) {
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark');
  if (mode === 'system') {
    html.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light');
  } else {
    html.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
  }
  const icon = $('#themeIcon');
  const dark = html.classList.contains('theme-dark');
  icon.innerHTML = mode === 'system' ? '&#xE793;' : dark ? '&#xE708;' : '&#xE706;';
  $('#themeBtn').title = mode === 'system' ? '当前：跟随系统' : dark ? '当前：深色' : '当前：浅色';
}

let themeMode = localStorage.getItem(THEME_KEY) || 'system';
applyTheme(themeMode);

$('#themeBtn').addEventListener('click', () => {
  themeMode = themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
  localStorage.setItem(THEME_KEY, themeMode);
  applyTheme(themeMode);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themeMode === 'system') applyTheme('system');
});

/* ---------------- SelectorBar 页面切换 ---------------- */
$('#selectorbar').addEventListener('click', (e) => {
  const btn = e.target.closest('.selectorbar-item');
  if (!btn) return;
  document.querySelectorAll('.selectorbar-item').forEach((b) => {
    b.classList.toggle('is-selected', b === btn);
    b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
  });
  document.querySelectorAll('.page').forEach((p) => p.classList.toggle('is-active', p.id === btn.dataset.page));
});

/* ---------------- InfoBar ---------------- */
const infobar = $('#infobar');

function showInfo(kind, title, msg) {
  infobar.classList.remove('is-hidden', 'is-error', 'is-success');
  infobar.classList.add(kind);
  const icons = { 'is-error': '&#xE783;', 'is-success': '&#xE73E;' };
  $('#infobarIcon').innerHTML = icons[kind] || '&#xE946;';
  $('#infobarTitle').textContent = title;
  $('#infobarMsg').textContent = msg;
}

function hideInfo() {
  infobar.classList.add('is-hidden');
}

$('#infobarClose').addEventListener('click', hideInfo);

/* ---------------- TextBox 字数 ---------------- */
const textInput = $('#textInput');
textInput.addEventListener('input', () => {
  $('#charCount').textContent = String(textInput.value.length);
});
textInput.addEventListener('focus', () => $('#textBox').classList.add('is-focused'));
textInput.addEventListener('blur', () => $('#textBox').classList.remove('is-focused'));

/* ---------------- Slider 组件 ---------------- */
/**
 * 将 .win-slider 元素包装为受控滑块。
 * el 内需含 .win-slider-track > .win-slider-fill 与 .win-slider-thumb。
 */
function createSlider(el, { min, max, step, value, format, onInput }) {
  const fill = el.querySelector('.win-slider-fill');
  const thumb = el.querySelector('.win-slider-thumb');
  let current = value;

  const clamp = (v) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const pct = (v) => ((v - min) / (max - min)) * 100;

  function render() {
    const p = pct(current);
    fill.style.width = `${p}%`;
    thumb.style.left = `${p}%`;
    el.setAttribute('aria-valuenow', String(current));
    el.setAttribute('aria-valuetext', format(current));
  }

  function setFromEvent(e) {
    const rect = el.getBoundingClientRect();
    const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    current = clamp(min + ratio * (max - min));
    render();
    onInput(current);
  }

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    thumb.classList.add('is-pressed');
    setFromEvent(e);
  });
  el.addEventListener('pointermove', (e) => {
    if (el.hasPointerCapture(e.pointerId)) setFromEvent(e);
  });
  el.addEventListener('pointerup', () => thumb.classList.remove('is-pressed'));
  el.addEventListener('pointercancel', () => thumb.classList.remove('is-pressed'));
  el.addEventListener('pointerenter', () => thumb.classList.add('is-pointer-over'));
  el.addEventListener('pointerleave', () => thumb.classList.remove('is-pointer-over'));
  el.addEventListener('keydown', (e) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp(current + step);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp(current - step);
    if (e.key === 'Home') next = min;
    if (e.key === 'End') next = max;
    if (next === null) return;
    e.preventDefault();
    current = next;
    render();
    onInput(current);
  });

  render();

  return {
    get value() { return current; },
    set value(v) { current = clamp(v); render(); onInput(current); },
  };
}

const fmtRate = (v) => `${v >= 0 ? '+' : ''}${v}%`;
const fmtPitch = (v) => `${v >= 0 ? '+' : ''}${v}Hz`;
const fmtVolume = (v) => `${v >= 0 ? '+' : ''}${v}%`;

const rateSlider = createSlider($('#rateSlider'), { min: -100, max: 100, step: 5, value: 0, format: fmtRate, onInput: (v) => { $('#rateValue').textContent = fmtRate(v); } });
const pitchSlider = createSlider($('#pitchSlider'), { min: -50, max: 50, step: 5, value: 0, format: fmtPitch, onInput: (v) => { $('#pitchValue').textContent = fmtPitch(v); } });
const volumeSlider = createSlider($('#volumeSlider'), { min: -100, max: 100, step: 5, value: 0, format: fmtVolume, onInput: (v) => { $('#volumeValue').textContent = fmtVolume(v); } });

/* ---------------- ComboBox 组件（语音选择） ---------------- */
const voiceCombo = $('#voiceCombo');
const voiceComboBtn = $('#voiceComboBtn');
const voiceComboContent = $('#voiceComboContent');
let voices = [];
let selectedVoice = null;
let flyout = null;
let searchInput = null;
let listEl = null;

function voiceLabel(v) {
  return v.displayName || v.shortName;
}

function closeFlyout() {
  if (!flyout) return;
  flyout.remove();
  flyout = null;
  searchInput = null;
  listEl = null;
  voiceComboBtn.setAttribute('aria-expanded', 'false');
}

function renderVoiceList(keyword) {
  const kw = (keyword || '').trim().toLowerCase();
  const frag = document.createDocumentFragment();
  const groups = new Map();
  for (const v of voices) {
    if (kw && !(`${v.shortName} ${voiceLabel(v)} ${v.locale}`.toLowerCase().includes(kw))) continue;
    if (!groups.has(v.locale)) groups.set(v.locale, []);
    groups.get(v.locale).push(v);
  }

  const selectedFirst = kw === '' && selectedVoice && groups.has(selectedVoice.locale);
  let rendered = 0;

  for (const [locale, items] of groups) {
    const header = document.createElement('div');
    header.className = 'win-combo-group-header';
    header.textContent = `${locale} · ${items.length}`;
    frag.appendChild(header);
    for (const v of items) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'win-combo-item';
      item.dataset.shortName = v.shortName;
      const layout = document.createElement('span');
      layout.className = 'win-combo-item-layout';
      const content = document.createElement('span');
      content.className = 'win-combo-item-content';
      content.textContent = voiceLabel(v);
      layout.appendChild(content);
      if (v.shortName === (selectedVoice && selectedVoice.shortName)) {
        item.classList.add('selected');
        const pill = document.createElement('span');
        pill.className = 'win-combo-item-pill';
        layout.appendChild(pill);
      }
      item.appendChild(layout);
      frag.appendChild(item);
      rendered++;
    }
    if (selectedFirst && locale === selectedVoice.locale) {
      // 无搜索时让当前选中项滚入视野
      requestAnimationFrame(() => {
        const sel = listEl.querySelector('.win-combo-item.selected');
        if (sel) sel.scrollIntoView({ block: 'center' });
      });
    }
  }

  if (rendered === 0) {
    const empty = document.createElement('div');
    empty.className = 'win-combo-group-header';
    empty.textContent = '没有匹配的语音';
    frag.appendChild(empty);
  }

  listEl.replaceChildren(frag);
}

function openFlyout() {
  if (flyout || !voices.length) return;
  flyout = document.createElement('div');
  flyout.className = 'win-combo-flyout flyout-animate';
  flyout.style.maxHeight = '420px';
  flyout.style.display = 'flex';
  flyout.style.flexDirection = 'column';

  // 搜索框
  const searchWrap = document.createElement('div');
  searchWrap.className = 'win-textbox';
  searchWrap.style.padding = '8px 8px 4px';
  const searchBorder = document.createElement('div');
  searchBorder.className = 'win-textbox-border';
  const searchContent = document.createElement('div');
  searchContent.className = 'win-textbox-content';
  searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'win-textbox-field';
  searchInput.placeholder = '搜索语音（名称 / 区域）';
  searchContent.appendChild(searchInput);
  searchBorder.appendChild(searchContent);
  searchWrap.appendChild(searchBorder);
  flyout.appendChild(searchWrap);

  // 列表
  listEl = document.createElement('div');
  listEl.className = 'win-combo-items-presenter';
  listEl.setAttribute('role', 'listbox');
  flyout.appendChild(listEl);
  document.body.appendChild(flyout);

  // 先渲染列表，再按最终尺寸定位：默认向下展开，空间不足时向上翻转
  renderVoiceList('');

  const rect = voiceComboBtn.getBoundingClientRect();
  const width = Math.floor(Math.min(Math.max(rect.width, 320), window.innerWidth - 16));
  flyout.style.width = `${width}px`;
  const flyH = flyout.offsetHeight;
  const spaceBelow = window.innerHeight - rect.bottom;
  let top;
  if (spaceBelow < Math.min(flyH, 320) && rect.top > flyH) {
    top = rect.top - flyH - 4;
    flyout.classList.add('flipped');
  } else {
    top = rect.bottom + 4;
  }
  flyout.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  flyout.style.top = `${Math.max(8, top)}px`;

  voiceComboBtn.setAttribute('aria-expanded', 'true');

  searchInput.addEventListener('input', () => renderVoiceList(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeFlyout(); voiceComboBtn.focus(); }
    if (e.key === 'Enter') {
      const first = listEl.querySelector('.win-combo-item');
      if (first) first.click();
    }
  });
  searchInput.focus();

  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.win-combo-item');
    if (!item) return;
    selectVoice(item.dataset.shortName);
    closeFlyout();
    voiceComboBtn.focus();
  });
}

function selectVoice(shortName) {
  selectedVoice = voices.find((v) => v.shortName === shortName) || null;
  if (selectedVoice) {
    voiceComboContent.textContent = voiceLabel(selectedVoice);
    voiceComboContent.classList.remove('is-placeholder');
    localStorage.setItem('edgetts-voice', selectedVoice.shortName);
  }
}

voiceComboBtn.addEventListener('click', () => (flyout ? closeFlyout() : openFlyout()));
document.addEventListener('pointerdown', (e) => {
  if (flyout && !flyout.contains(e.target) && !voiceCombo.contains(e.target)) closeFlyout();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && flyout) { closeFlyout(); voiceComboBtn.focus(); }
});

async function loadVoices() {
  try {
    const res = await fetch('/api/voices');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    voices = data.voices;
    voices.sort((a, b) => a.locale.localeCompare(b.locale) || a.shortName.localeCompare(b.shortName));
    if (voices.length) {
      const saved = localStorage.getItem('edgetts-voice');
      if (saved && voices.some((v) => v.shortName === saved)) {
        selectVoice(saved);
      } else {
        selectVoice(voices.some((v) => v.shortName === 'zh-CN-XiaoxiaoNeural')
          ? 'zh-CN-XiaoxiaoNeural'
          : voices[0].shortName);
      }
    }
    $('#statusText').textContent = `已加载 ${voices.length} 个语音`;
  } catch (err) {
    voiceComboContent.textContent = '语音列表加载失败';
    showInfo('is-error', '无法获取语音列表', `请确认后端已启动并能访问网络（${err.message}）`);
  }
}

/* ---------------- TTS 生成与播放 ---------------- */
const audio = $('#audio');
const playBtn = $('#playBtn');
const playIcon = $('#playIcon');
const downloadBtn = $('#downloadBtn');
const generateBtn = $('#generateBtn');
const progress = $('#ttsProgress');
const statusText = $('#statusText');
const seekSliderEl = $('#seekSlider');
const timeText = $('#timeText');
let audioUrl = null;
let seeking = false;

function setProgress(mode, ratio) {
  progress.classList.toggle('is-indeterminate', mode === 'indeterminate');
  progress.classList.toggle('is-visible', mode !== 'off');
  if (mode === 'determinate') {
    progress.querySelector('.DeterminateProgressBarIndicator').style.width = `${Math.round(ratio * 100)}%`;
  }
}

const fmtTime = (sec) => {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function updateSeekUI() {
  const dur = audio.duration || 0;
  const cur = audio.currentTime || 0;
  const p = dur > 0 ? (cur / dur) * 100 : 0;
  seekSliderEl.querySelector('.win-slider-fill').style.width = `${p}%`;
  seekSliderEl.querySelector('.win-slider-thumb').style.left = `${p}%`;
  seekSliderEl.setAttribute('aria-valuenow', String(Math.round(p)));
  timeText.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
}

// 播放进度条（复用滑块交互，但不做固定 min/max 值映射）
seekSliderEl.addEventListener('pointerdown', (e) => {
  if (!audio.duration) return;
  seeking = true;
  seekSliderEl.setPointerCapture(e.pointerId);
  seekTo(e);
});
seekSliderEl.addEventListener('pointermove', (e) => { if (seeking) seekTo(e); });
seekSliderEl.addEventListener('pointerup', () => { seeking = false; });

function seekTo(e) {
  const rect = seekSliderEl.getBoundingClientRect();
  const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) : 0;
  if (Number.isFinite(audio.duration)) audio.currentTime = ratio * audio.duration;
  updateSeekUI();
}

playBtn.addEventListener('click', () => {
  if (!audio.src) return;
  if (audio.paused) audio.play();
  else audio.pause();
});

audio.addEventListener('play', () => { playIcon.innerHTML = '&#xE769;'; });
audio.addEventListener('pause', () => { playIcon.innerHTML = '&#xE768;'; });
audio.addEventListener('timeupdate', () => { if (!seeking) updateSeekUI(); });
audio.addEventListener('loadedmetadata', updateSeekUI);
audio.addEventListener('ended', () => { audio.currentTime = 0; updateSeekUI(); });

function setAudioReady(url, sizeLabel) {
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = url;
  audio.src = url;
  playBtn.disabled = false;
  downloadBtn.disabled = false;
  $('#audioInfo').textContent = sizeLabel;
}

async function generate() {
  const text = textInput.value.trim();
  if (!text) {
    showInfo('is-error', '请输入文本', '文本内容不能为空。');
    textInput.focus();
    return;
  }
  if (!selectedVoice) {
    showInfo('is-error', '未选择语音', '请先在右侧选择一个语音。');
    return;
  }
  hideInfo();
  generateBtn.disabled = true;
  setProgress('indeterminate');
  statusText.textContent = '正在合成…';
  const started = performance.now();

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: selectedVoice.shortName,
        rate: fmtRate(rateSlider.value),
        pitch: fmtPitch(pitchSlider.value),
        volume: fmtVolume(volumeSlider.value),
      }),
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err.detail) detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch { /* 保留 HTTP 状态码 */ }
      throw new Error(detail);
    }

    const blob = await res.blob();
    if (blob.size === 0) throw new Error('服务端未返回音频数据');
    const elapsed = ((performance.now() - started) / 1000).toFixed(1);
    const kb = (blob.size / 1024).toFixed(1);
    setAudioReady(URL.createObjectURL(blob), `${kb} KB · ${selectedVoice.shortName}`);
    setProgress('off');
    statusText.textContent = `合成完成（${elapsed} s）`;
    showInfo('is-success', '语音已生成', `${voiceLabel(selectedVoice)} · ${kb} KB · 用时 ${elapsed} 秒，可试听或下载。`);
    audio.play().catch(() => { /* 自动播放被浏览器策略拦截时静默忽略 */ });
    localStorage.setItem('edgetts-voice', selectedVoice.shortName);
  } catch (err) {
    setProgress('off');
    statusText.textContent = '合成失败';
    showInfo('is-error', '语音合成失败', err.message);
  } finally {
    generateBtn.disabled = false;
  }
}

generateBtn.addEventListener('click', generate);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.target.closest('.win-combo-flyout')) {
    e.preventDefault();
    generate();
  }
});

downloadBtn.addEventListener('click', () => {
  if (!audioUrl) return;
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  a.href = audioUrl;
  a.download = `${selectedVoice ? selectedVoice.shortName : 'tts'}_${stamp}.mp3`;
  a.click();
});

/* ---------------- 启动 ---------------- */
updateSeekUI();
loadVoices();

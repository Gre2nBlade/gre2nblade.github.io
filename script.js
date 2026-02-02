// =====================
// i18n
// =====================
const translations = {
  en: {
    title: "Tools",
    "tab-converter": "Converter",
    "tab-skin": "Skin Editor",

    "drop-text": "Drag & Drop .mrpack file",
    "select-button": "Select File",
    "no-file": "No file selected",
    convert: "Convert",
    "pack-name": "Beautiful Optimized",

    "skin-tools": "Tools",
    "skin-2d": "2D Editor",
    "skin-preview": "3D Preview",
    "skin-model": "Model",
    "skin-color": "Color"
  },
  ru: {
    title: "Инструменты",
    "tab-converter": "Конвертер",
    "tab-skin": "Редактор скинов",

    "drop-text": "Перетащите .mrpack файл сюда",
    "select-button": "Выбрать файл",
    "no-file": "Файл не выбран",
    convert: "Конвертировать",
    "pack-name": "Beautiful Optimized",

    "skin-tools": "Инструменты",
    "skin-2d": "2D Редактор",
    "skin-preview": "3D Предпросмотр",
    "skin-model": "Модель",
    "skin-color": "Цвет"
  }
};

const lang = navigator.language.startsWith("ru") ? "ru" : "en";
document.querySelectorAll("[data-i18n]").forEach(el => {
  const key = el.getAttribute("data-i18n");
  if (translations[lang][key]) el.textContent = translations[lang][key];
});

// =====================
// Version
// =====================
const MAJOR_VERSION = "2.4";
fetch("build.txt")
  .then(r => r.ok ? r.text() : "0")
  .catch(() => "0")
  .then(build => {
    const buildNum = build.trim() || "0";
    document.getElementById("version").textContent = `v${MAJOR_VERSION}.${buildNum}`;
  });

// =====================
// Theme switch
// =====================
const themeSwitch = document.getElementById("theme-switch");

function applyInitialTheme() {
  const savedTheme = localStorage.getItem("theme");
  let currentTheme;

  if (savedTheme) {
    currentTheme = savedTheme;
  } else {
    currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.documentElement.setAttribute("data-theme", currentTheme);
  themeSwitch.classList.toggle("switch-on", currentTheme === "dark");
}

applyInitialTheme();

themeSwitch.addEventListener("click", () => {
  themeSwitch.classList.toggle("switch-on");

  const isDark = themeSwitch.classList.contains("switch-on");
  const theme = isDark ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    const theme = e.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    themeSwitch.classList.toggle("switch-on", e.matches);
  }
});

// =====================
// Tabs
// =====================
const tabConverter = document.getElementById("tab-converter");
const tabSkin = document.getElementById("tab-skin");
const panelConverter = document.getElementById("panel-converter");
const panelSkin = document.getElementById("panel-skin");

function setTab(tab) {
  const isConverter = tab === "converter";

  tabConverter.classList.toggle("tab-active", isConverter);
  tabSkin.classList.toggle("tab-active", !isConverter);

  tabConverter.setAttribute("aria-selected", isConverter ? "true" : "false");
  tabSkin.setAttribute("aria-selected", !isConverter ? "true" : "false");

  panelConverter.classList.toggle("tab-panel-active", isConverter);
  panelSkin.classList.toggle("tab-panel-active", !isConverter);

  // Init skin editor lazily
  if (!isConverter) {
    window.__openSkinEditor?.();
  }
}

tabConverter.addEventListener("click", () => setTab("converter"));
tabSkin.addEventListener("click", () => setTab("skin"));

// =====================
// Converter
// =====================
const fileInput = document.getElementById("file-input");
const fileName = document.getElementById("file-name");
const selectButton = document.getElementById("select-button");
const convertButton = document.getElementById("convert-button");
const modal = document.getElementById("loading-modal");
const grid = document.getElementById("grid");

selectButton.onclick = () => fileInput.click();

fileInput.onchange = () => {
  if (fileInput.files.length) {
    fileName.textContent = fileInput.files[0].name;
    convertButton.disabled = false;
  }
};

const dropArea = document.getElementById("drop-area");
["dragenter", "dragover", "dragleave", "drop"].forEach(e => document.addEventListener(e, ev => ev.preventDefault()));
["dragenter", "dragover"].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.add("highlight")));
["dragleave", "drop"].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.remove("highlight")));

dropArea.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  fileInput.files = e.dataTransfer.files;
  fileName.textContent = file.name;
  convertButton.disabled = false;
});

const SIZE = 16;
const cells = [];
for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  grid.appendChild(cell);
  cells.push(cell);
}

let order = generateOrder(SIZE);

function generateOrder(n) {
  const center = Math.floor(n / 2);
  const result = [];
  for (let r = 0; r <= center; r++) {
    const ring = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (Math.max(Math.abs(x - center), Math.abs(y - center)) === r) {
          ring.push(y * n + x);
        }
      }
    }
    for (let i = ring.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ring[i], ring[j]] = [ring[j], ring[i]];
    }
    result.push(...ring);
  }
  return result;
}

function setProgress(p) {
  p = Math.max(0, Math.min(1, p));
  const total = order.length;
  const grayCount = Math.floor(total * Math.min(1, p + 0.12));
  const greenCount = Math.floor(total * p);

  cells.forEach(c => c.className = "cell");
  for (let i = 0; i < grayCount; i++) cells[order[i]].classList.add("gray");
  for (let i = 0; i < greenCount; i++) cells[order[i]].classList.add("green");
}

async function downloadPack() {
  modal.classList.add("is-active");
  setProgress(0);
  await sleep(50);

  const zip = await JSZip.loadAsync(fileInput.files[0]);
  const manifest = JSON.parse(await zip.files["modrinth.index.json"].async("string"));

  const newZip = new JSZip();
  let loadedCount = 0;

  const startTime = performance.now();
  const minDuration = 900;

  const CONCURRENCY = 6;
  const requiredFiles = manifest.files.filter(file => file.env?.client === "required");
  const totalRequired = requiredFiles.length || 1;

  let index = 0;

  async function worker() {
    while (index < requiredFiles.length) {
      const cur = index++;
      const file = requiredFiles[cur];
      try {
        const blob = await fetch(file.downloads[0]).then(r => r.blob());
        newZip.file(file.path, blob);
        loadedCount++;
        setProgress(loadedCount / totalRequired);
        await sleep(8);
      } catch (err) {
        console.warn(`Не удалось загрузить ${file.path}`, err);
      }
    }
  }

  await Promise.all(Array(CONCURRENCY).fill().map(worker));

  const elapsed = performance.now() - startTime;
  if (elapsed < minDuration) await sleep(minDuration - elapsed);

  while (loadedCount / totalRequired < 1) {
    loadedCount = Math.min(loadedCount + 1, totalRequired);
    setProgress(loadedCount / totalRequired);
    await sleep(4);
  }

  setProgress(1);

  modal.classList.add("fade-out");
  await sleep(350);
  modal.classList.remove("is-active", "fade-out");

  const content = await newZip.generateAsync({ type: "blob" });
  saveAs(content, `${manifest.name}-${manifest.versionId}.zip`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

convertButton.onclick = downloadPack;

// =====================
// Skin Editor MVP (inline module)
// =====================
(() => {
  let initialized = false;

  const W = 64, H = 64;
  const SCALE = 8; // 64*8=512
  const OVERLAY_ALPHA = 255;

  const state = {
    tool: "brush", // brush | eraser | picker | fill
    layer: "base", // base | overlay
    color: "#3c8527",
    model: "classic", // classic | slim
    mouseDown: false,
    history: [],
    historyIndex: -1
  };

  const els = {
    tabSkin,
    panelSkin,

    canvas2d: document.getElementById("skin2d"),
    hint: document.getElementById("canvas-hint"),
    status: document.getElementById("skin-status"),
    colorHex: document.getElementById("color-hex"),

    colorInput: document.getElementById("color-input"),
    colorChip: document.getElementById("color-chip"),
    palette: document.getElementById("palette"),

    importInput: document.getElementById("skin-import"),
    btnImport: document.getElementById("btn-import"),
    btnExport: document.getElementById("btn-export"),
    btnClear: document.getElementById("btn-clear"),

    btnUndo: document.getElementById("btn-undo"),
    btnRedo: document.getElementById("btn-redo"),
    btnLayer: document.getElementById("btn-layer"),
    layerLabel: document.getElementById("layer-label"),

    btnResetView: document.getElementById("btn-reset-view"),

    modelClassic: document.getElementById("model-classic"),
    modelSlim: document.getElementById("model-slim"),

    canvas3d: document.getElementById("skin3d")
  };

  const ctx2d = els.canvas2d.getContext("2d", { willReadFrequently: true });
  ctx2d.imageSmoothingEnabled = false;

  // Base and overlay stored separately
  const base = new Uint8ClampedArray(W * H * 4);
  const overlay = new Uint8ClampedArray(W * H * 4);

  // init transparent
  base.fill(0);
  overlay.fill(0);

  function rgbaToHex(r, g, b) {
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function idx(x, y) {
    return (y * W + x) * 4;
  }

  function getLayerArray() {
    return state.layer === "base" ? base : overlay;
  }

  function setPixel(arr, x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = idx(x, y);
    arr[i] = r;
    arr[i + 1] = g;
    arr[i + 2] = b;
    arr[i + 3] = a;
  }

  function getPixel(arr, x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return { r: 0, g: 0, b: 0, a: 0 };
    const i = idx(x, y);
    return { r: arr[i], g: arr[i + 1], b: arr[i + 2], a: arr[i + 3] };
  }

  function compositeToImageData() {
    // base then overlay
    const out = new Uint8ClampedArray(W * H * 4);
    out.set(base);

    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      const oa = overlay[i + 3];
      if (oa === 0) continue;
      // overlay is fully opaque when painted, keep alpha
      out[i] = overlay[i];
      out[i + 1] = overlay[i + 1];
      out[i + 2] = overlay[i + 2];
      out[i + 3] = overlay[i + 3];
    }

    return new ImageData(out, W, H);
  }

  function redraw() {
    // draw checkered background
    ctx2d.clearRect(0, 0, els.canvas2d.width, els.canvas2d.height);
    const cell = 16;
    for (let y = 0; y < els.canvas2d.height; y += cell) {
      for (let x = 0; x < els.canvas2d.width; x += cell) {
        const isDark = ((x / cell) + (y / cell)) % 2 === 0;
        ctx2d.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)";
        ctx2d.fillRect(x, y, cell, cell);
      }
    }

    const img = compositeToImageData();

    // draw scaled
    const tmp = document.createElement("canvas");
    tmp.width = W;
    tmp.height = H;
    const tctx = tmp.getContext("2d");
    tctx.putImageData(img, 0, 0);

    ctx2d.imageSmoothingEnabled = false;
    ctx2d.drawImage(tmp, 0, 0, W, H, 0, 0, W * SCALE, H * SCALE);

    // subtle grid
    ctx2d.strokeStyle = "rgba(0,0,0,0.10)";
    for (let x = 0; x <= W; x += 8) {
      ctx2d.beginPath();
      ctx2d.moveTo(x * SCALE, 0);
      ctx2d.lineTo(x * SCALE, H * SCALE);
      ctx2d.stroke();
    }
    for (let y = 0; y <= H; y += 8) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, y * SCALE);
      ctx2d.lineTo(W * SCALE, y * SCALE);
      ctx2d.stroke();
    }

    updateStatus();
    update3D();
  }

  // =====================
  // History
  // =====================
  function snapshot() {
    return {
      base: new Uint8ClampedArray(base),
      overlay: new Uint8ClampedArray(overlay),
      layer: state.layer,
      color: state.color,
      model: state.model
    };
  }

  function restore(snap) {
    base.set(snap.base);
    overlay.set(snap.overlay);
    state.layer = snap.layer;
    state.color = snap.color;
    state.model = snap.model;

    // sync UI
    els.layerLabel.textContent = state.layer === "base" ? "Base" : "Overlay";
    els.colorInput.value = state.color;
    els.colorChip.style.background = state.color;
    els.colorChip.title = state.color;

    els.modelClassic.classList.toggle("seg-active", state.model === "classic");
    els.modelSlim.classList.toggle("seg-active", state.model === "slim");

    redraw();
  }

  function pushHistory() {
    // cut future
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot());
    state.historyIndex = state.history.length - 1;

    updateUndoRedoButtons();
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    restore(state.history[state.historyIndex]);
    updateUndoRedoButtons();
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    restore(state.history[state.historyIndex]);
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    els.btnUndo.disabled = state.historyIndex <= 0;
    els.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
  }

  // =====================
  // Tools
  // =====================
  function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
      btn.classList.toggle("tool-active", btn.dataset.tool === tool);
    });
    updateStatus();
  }

  function toggleLayer() {
    state.layer = state.layer === "base" ? "overlay" : "base";
    els.layerLabel.textContent = state.layer === "base" ? "Base" : "Overlay";
    pushHistory(); // track change
    redraw();
  }

  function updateStatus(extra = "") {
    els.colorHex.textContent = state.color;
    const toolName = state.tool[0].toUpperCase() + state.tool.slice(1);
    const layerName = state.layer === "base" ? "Base" : "Overlay";
    els.status.textContent = `Tool: ${toolName} · Layer: ${layerName} · Color: `;
    els.status.appendChild(els.colorHex);
    if (extra) {
      const span = document.createElement("span");
      span.textContent = " · " + extra;
      els.status.appendChild(span);
    }
  }

  function canvasToPixel(ev) {
    const rect = els.canvas2d.getBoundingClientRect();
    const x = Math.floor((ev.clientX - rect.left) / (rect.width / (W)));
    const y = Math.floor((ev.clientY - rect.top) / (rect.height / (H)));
    return { x: Math.max(0, Math.min(W - 1, x)), y: Math.max(0, Math.min(H - 1, y)) };
  }

  function paintAt(x, y) {
    const arr = getLayerArray();

    if (state.tool === "picker") {
      const c = getPixel(arr, x, y);
      if (c.a === 0) return;
      const hex = rgbaToHex(c.r, c.g, c.b);
      state.color = hex;
      els.colorInput.value = hex;
      els.colorChip.style.background = hex;
      els.colorChip.title = hex;
      redraw();
      return;
    }

    if (state.tool === "fill") {
      const target = getPixel(arr, x, y);
      const { r, g, b } = hexToRgb(state.color);

      // If already same
      if (target.a !== 0 && target.r === r && target.g === g && target.b === b) return;

      floodFill(arr, x, y, target, { r, g, b, a: OVERLAY_ALPHA });
      redraw();
      return;
    }

    if (state.tool === "eraser") {
      setPixel(arr, x, y, 0, 0, 0, 0);
      return;
    }

    // brush
    const { r, g, b } = hexToRgb(state.color);
    setPixel(arr, x, y, r, g, b, OVERLAY_ALPHA);
  }

  function floodFill(arr, x, y, target, repl) {
    const match = (p) => p.a === target.a && p.r === target.r && p.g === target.g && p.b === target.b;

    const start = getPixel(arr, x, y);
    if (!match(start)) return;

    const stack = [{ x, y }];
    const visited = new Uint8Array(W * H);

    while (stack.length) {
      const cur = stack.pop();
      const key = cur.y * W + cur.x;
      if (visited[key]) continue;
      visited[key] = 1;

      const p = getPixel(arr, cur.x, cur.y);
      if (!match(p)) continue;

      setPixel(arr, cur.x, cur.y, repl.r, repl.g, repl.b, repl.a);

      if (cur.x > 0) stack.push({ x: cur.x - 1, y: cur.y });
      if (cur.x < W - 1) stack.push({ x: cur.x + 1, y: cur.y });
      if (cur.y > 0) stack.push({ x: cur.x, y: cur.y - 1 });
      if (cur.y < H - 1) stack.push({ x: cur.x, y: cur.y + 1 });
    }
  }

  // =====================
  // 3D Preview (skinview3d)
  // =====================
  let viewer = null;

  function buildSkinPNGBlob() {
    const img = compositeToImageData();
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const cctx = c.getContext("2d");
    cctx.putImageData(img, 0, 0);

    return new Promise(resolve => c.toBlob(resolve, "image/png"));
  }

  async function update3D() {
    if (!viewer) return;
    const blob = await buildSkinPNGBlob();
    const url = URL.createObjectURL(blob);
    try {
      viewer.loadSkin(url, { model: state.model === "slim" ? "slim" : "default" });
    } finally {
      // allow viewer to fetch
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }

  function init3D() {
    if (!window.skinview3d) {
      console.warn("skinview3d not loaded");
      return;
    }

    viewer = new skinview3d.SkinViewer({
      canvas: els.canvas3d,
      width: els.canvas3d.clientWidth || 220,
      height: 260,
      skin: null
    });

    viewer.zoom = 0.9;
    viewer.fov = 70;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;
    viewer.controls.rotateSpeed = 0.8;

    // idle rotation
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.6;
  }

  function resetView() {
    if (!viewer) return;
    viewer.autoRotate = true;
    viewer.controls.reset();
  }

  // =====================
  // Import / Export
  // =====================
  async function importPNG(file) {
    const img = new Image();
    img.decoding = "async";

    const url = URL.createObjectURL(file);
    img.src = url;

    await img.decode().catch(() => {});

    // Draw into temp
    const t = document.createElement("canvas");
    const tctx = t.getContext("2d", { willReadFrequently: true });

    if (img.width === 64 && img.height === 64) {
      t.width = 64; t.height = 64;
      tctx.drawImage(img, 0, 0);
      const data = tctx.getImageData(0, 0, 64, 64).data;

      // load as base, clear overlay
      base.set(data);
      overlay.fill(0);
      pushHistory();
      redraw();
      URL.revokeObjectURL(url);
      return;
    }

    if (img.width === 64 && img.height === 32) {
      // convert legacy 64x32 -> 64x64
      t.width = 64; t.height = 64;
      tctx.clearRect(0, 0, 64, 64);
      tctx.drawImage(img, 0, 0);

      // Legacy: copy and mirror to fill missing parts
      // Simple approach: keep upper half, duplicate lower half
      // (This is basic conversion; later можно улучшить под точные регионы)
      tctx.drawImage(img, 0, 16, 64, 16, 0, 32, 64, 16);

      const data = tctx.getImageData(0, 0, 64, 64).data;
      base.set(data);
      overlay.fill(0);
      pushHistory();
      redraw();
      URL.revokeObjectURL(url);
      return;
    }

    URL.revokeObjectURL(url);
    alert("PNG must be 64x64 or 64x32");
  }

  async function exportPNG() {
    const blob = await buildSkinPNGBlob();
    saveAs(blob, "skin.png");
  }

  function clearLayer() {
    const arr = getLayerArray();
    arr.fill(0);
    pushHistory();
    redraw();
  }

  // =====================
  // Palette
  // =====================
  const defaultPalette = [
    "#000000","#ffffff","#7f7f7f","#cfcfcf",
    "#3c8527","#52a535","#7fdc5c","#b0ff9f",
    "#1f4e99","#2f74d0","#69a9ff","#c7e0ff",
    "#7a2e2e","#b84040","#ff6b6b","#ffd1d1",
    "#7a5a2e","#b88640","#ffcc66","#ffe8b3",
    "#3b2e7a","#6a4bd8","#a996ff","#e2dcff",
    "#2e7a6a","#40b8a0","#66ffe3","#b3fff4"
  ];

  function initPalette() {
    els.palette.innerHTML = "";
    for (const c of defaultPalette) {
      const d = document.createElement("div");
      d.className = "pal-color";
      d.style.background = c;
      d.title = c;
      d.addEventListener("click", () => {
        state.color = c;
        els.colorInput.value = c;
        els.colorChip.style.background = c;
        els.colorChip.title = c;
        redraw();
      });
      els.palette.appendChild(d);
    }
  }

  // =====================
  // Events
  // =====================
  function initEvents() {
    // tool buttons
    document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
      btn.addEventListener("click", () => setTool(btn.dataset.tool));
    });

    els.btnUndo.addEventListener("click", undo);
    els.btnRedo.addEventListener("click", redo);

    els.btnLayer.addEventListener("click", () => {
      state.layer = state.layer === "base" ? "overlay" : "base";
      els.layerLabel.textContent = state.layer === "base" ? "Base" : "Overlay";
      pushHistory();
      redraw();
    });

    els.btnResetView.addEventListener("click", resetView);

    els.modelClassic.addEventListener("click", () => {
      state.model = "classic";
      els.modelClassic.classList.add("seg-active");
      els.modelSlim.classList.remove("seg-active");
      pushHistory();
      redraw();
    });

    els.modelSlim.addEventListener("click", () => {
      state.model = "slim";
      els.modelSlim.classList.add("seg-active");
      els.modelClassic.classList.remove("seg-active");
      pushHistory();
      redraw();
    });

    els.colorInput.addEventListener("input", () => {
      state.color = els.colorInput.value;
      els.colorChip.style.background = state.color;
      els.colorChip.title = state.color;
      redraw();
    });

    els.btnImport.addEventListener("click", () => els.importInput.click());
    els.importInput.addEventListener("change", () => {
      const f = els.importInput.files?.[0];
      if (f) importPNG(f);
      els.importInput.value = "";
    });

    els.btnExport.addEventListener("click", exportPNG);
    els.btnClear.addEventListener("click", clearLayer);

    // painting
    els.canvas2d.addEventListener("mousedown", (ev) => {
      state.mouseDown = true;
      pushHistory(); // begin stroke
      const { x, y } = canvasToPixel(ev);
      paintAt(x, y);
      redraw();
    });

    window.addEventListener("mouseup", () => state.mouseDown = false);

    els.canvas2d.addEventListener("mousemove", (ev) => {
      const { x, y } = canvasToPixel(ev);
      els.hint.textContent = `${W}×${H} · ${x},${y}`;

      if (!state.mouseDown) return;
      if (state.tool === "fill" || state.tool === "picker") return; // no drag fill/pick
      paintAt(x, y);
      redraw();
    });

    // hotkeys
    window.addEventListener("keydown", (ev) => {
      // only when skin tab is open
      const skinOpen = panelSkin.classList.contains("tab-panel-active");
      if (!skinOpen) return;

      const key = ev.key.toLowerCase();

      // ignore if user is typing
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      // tools
      if (key === "b") { setTool("brush"); return; }
      if (key === "e") { setTool("eraser"); return; }
      if (key === "i") { setTool("picker"); return; }
      if (key === "g") { setTool("fill"); return; }
      if (key === "l") { els.btnLayer.click(); return; }
      if (key === "r") { resetView(); return; }

      // ctrl combos
      if (ev.ctrlKey && key === "z") {
        ev.preventDefault();
        if (ev.shiftKey) redo();
        else undo();
        return;
      }
      if (ev.ctrlKey && key === "y") {
        ev.preventDefault();
        redo();
        return;
      }
      if (ev.ctrlKey && key === "s") {
        ev.preventDefault();
        exportPNG();
        return;
      }
      if (ev.ctrlKey && key === "o") {
        ev.preventDefault();
        els.importInput.click();
        return;
      }
    });
  }

  // =====================
  // Init
  // =====================
  function init() {
    if (initialized) return;
    initialized = true;

    initPalette();
    init3D();
    initEvents();

    // initial history snapshot
    pushHistory();
    redraw();
  }

  // expose to tabs
  window.__openSkinEditor = init;
})();
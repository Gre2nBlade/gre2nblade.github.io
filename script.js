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
// Navigation: sidebar + sections
// =====================
const tabConverter = document.getElementById("tab-converter");
const tabSkin = document.getElementById("tab-skin");
const panelConverter = document.getElementById("panel-converter");
const panelSkin = document.getElementById("panel-skin");
const panelMods = document.getElementById("panel-mods");

const sidebar = document.getElementById("sidebar");
const navConverter = document.getElementById("nav-converter");
const navSkin = document.getElementById("nav-skin");
const navMods = document.getElementById("nav-mods");

function getInitialSection() {
  const hash = (location.hash || "").replace("#", "");
  if (hash === "skin" || hash === "converter" || hash === "mods") return hash;

  const saved = localStorage.getItem("activeSection");
  if (saved === "skin" || saved === "converter" || saved === "mods") return saved;

  return "converter";
}

function setSection(section, opts = { pushHash: true }) {
  const isConverter = section === "converter";
  const isSkin = section === "skin";
  const isMods = section === "mods";

  // panels
  panelConverter.classList.toggle("tab-panel-active", isConverter);
  panelSkin.classList.toggle("tab-panel-active", isSkin);
  if (panelMods) panelMods.classList.toggle("tab-panel-active", isMods);

  // old tabs (скрыты, но оставляем логику)
  if (tabConverter && tabSkin) {
    tabConverter.classList.toggle("tab-active", isConverter);
    tabSkin.classList.toggle("tab-active", isSkin);
    tabConverter.setAttribute("aria-selected", isConverter ? "true" : "false");
    tabSkin.setAttribute("aria-selected", isSkin ? "true" : "false");
  }

  // sidebar active item
  [navConverter, navSkin, navMods].forEach(btn => {
    if (!btn) return;
    const target = btn.dataset.section;
    btn.classList.toggle("sidebar-active", target === section);
  });

  localStorage.setItem("activeSection", section);

  if (opts.pushHash) {
    history.replaceState(null, "", "#" + section);
  }

  // Lazy init skin editor
  if (isSkin) {
    window.__openSkinEditor?.();
  }

  window.__skinResize?.();
}

// Sidebar interactions
function handleNavClick(section, event) {
  if (!sidebar) {
    setSection(section);
    return;
  }
  
  // Если кликнули именно по кнопке (или иконке внутри неё), переключаем сразу
  // даже если меню свернуто.
  setSection(section);
}

if (navConverter) navConverter.addEventListener("click", (e) => handleNavClick("converter", e));
if (navSkin) navSkin.addEventListener("click", (e) => handleNavClick("skin", e));
if (navMods) navMods.addEventListener("click", (e) => handleNavClick("mods", e));

// Раскрытие меню при клике на сам сайдбар (но не на кнопки) или на его край
if (sidebar) {
  sidebar.addEventListener("click", (e) => {
    // Если клик был по кнопке навигации, handleNavClick уже сработал
    if (e.target.closest(".sidebar-item")) return;
    
    // Раскрываем меню
    sidebar.classList.add("is-open");
  });
}

// клик вне сайдбара — закрывает его
document.addEventListener("pointerdown", (ev) => {
  if (!sidebar) return;
  if (sidebar.contains(ev.target)) return;
  sidebar.classList.remove("is-open");
});

window.addEventListener("hashchange", () => {
  const hash = (location.hash || "").replace("#", "");
  if (hash === "skin" || hash === "converter" || hash === "mods") setSection(hash, { pushHash: false });
});

// init
setSection(getInitialSection(), { pushHash: true });

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

// клик по всей зоне drag&drop тоже открывает выбор файла
dropArea.addEventListener("click", (e) => {
  // чтобы не срабатывать повторно при клике по самой кнопке
  if (e.target === selectButton) return;
  fileInput.click();
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
  const securityFindings = [];

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

        // анализ jar/java перед добавлением
        try {
          const findings = await scanBlobForSuspiciousCode(blob, file.path);
          if (findings.length) {
            securityFindings.push(...findings);
          }
        } catch (scanErr) {
          console.warn("Scan error for", file.path, scanErr);
        }

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

  // простой отчёт о найденных подозрительных местах во время конвертации
  const reportEl = document.getElementById("converter-security-report");
  if (reportEl) {
    if (!securityFindings.length) {
      reportEl.textContent = "Проверка модов: явных подозрительных паттернов не обнаружено.";
    } else {
      const unique = new Map();
      securityFindings.forEach(f => {
        const key = f.path + ":" + f.type;
        if (!unique.has(key)) unique.set(key, f);
      });
      const list = Array.from(unique.values())
        .map(f => `${f.path} → ${f.type}`)
        .join(" | ");
      reportEl.textContent = "Проверка модов: найдены подозрительные места → " + list;
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

convertButton.onclick = downloadPack;

// =====================
// Mod Analyzer (shared scanner)
// =====================

function getSuspiciousPatterns() {
  return [
    { id: "network", label: "Network", re: /java\/net|HttpURLConnection|URL\s*\(|OkHttp|Netty/ },
    { id: "filesystem", label: "Filesystem", re: /java\/io\/File|FileInputStream|FileOutputStream|RandomAccessFile|Files\./ },
    { id: "exec", label: "Exec", re: /Runtime\.getRuntime\(\)\.exec|ProcessBuilder/ },
    { id: "reflect", label: "Reflection", re: /java\/lang\/reflect|Class\.forName/ },
    { id: "crypto", label: "Crypto", re: /Cipher\.getInstance|MessageDigest|KeyGenerator/ },
    { id: "script", label: "Scripting", re: /javax\.script|ScriptEngineManager/ }
  ];
}

async function scanBlobForSuspiciousCode(blob, displayPath) {
  const findings = [];
  const ext = (displayPath || "").toLowerCase();

  // Мы анализируем ТОЛЬКО .jar файлы
  if (!ext.endsWith(".jar")) return findings;

  try {
    const zip = await JSZip.loadAsync(blob);
    const patterns = getSuspiciousPatterns();
    const entries = Object.keys(zip.files);
    
    // Ограничиваем количество файлов для анализа, чтобы не зависало
    const tasks = entries
      .filter(path => path.endsWith(".class"))
      .map(async path => {
        const file = zip.files[path];
        if (!file) return;
        
        // В .class файлах ищем строки, JSZip.async("string") может вернуть бинарщину с вкраплениями текста
        const content = await file.async("string").catch(() => "");
        if (!content) return;
        
        patterns.forEach(p => {
          if (p.re.test(content)) {
            findings.push({ path: path, type: p.label, jar: displayPath, content: content.substring(0, 1000) });
          }
        });
      });
    
    await Promise.all(tasks);
  } catch (e) {
    console.warn("Failed to scan jar", displayPath, e);
  }

  return findings;
}

// Gemini Integration
async function analyzeWithGemini(findings) {
  const apiKey = document.getElementById("gemini-api-key")?.value;
  if (!apiKey || !findings.length) return null;

  const prompt = `Проанализируй следующие подозрительные фрагменты кода из Minecraft мода. 
  Определи, являются ли они вредоносными (RAT, логгер, удаление файлов) или это нормальное поведение (обновление мода, конфиги).
  Дай краткий ответ для каждого типа:
  
  ${findings.map(f => `- Файл: ${f.path}\n- Тип: ${f.type}\n- Контекст: ${f.content.substring(0, 200)}`).join("\n\n")}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Не удалось получить анализ от ИИ.";
  } catch (err) {
    console.error("Gemini API error:", err);
    return "Ошибка при обращении к Gemini API.";
  }
}

// UI для Mod Analyzer
const modsDropArea = document.getElementById("mods-drop-area");
const modsFileInput = document.getElementById("mods-file-input");
const modsSelectButton = document.getElementById("mods-select-button");
const modsFileList = document.getElementById("mods-file-list");
const modsResults = document.getElementById("mods-results");
const modsResultsEmpty = document.getElementById("mods-results-empty");

function renderModsFileList(files) {
  if (!modsFileList) return;
  if (!files.length) {
    modsFileList.textContent = "";
    return;
  }
  modsFileList.textContent = Array.from(files).map(f => f.name).join(", ");
}

function renderModsResults(finds, aiAnalysis = null) {
  if (!modsResults || !modsResultsEmpty) return;
  modsResults.innerHTML = "";
  if (!finds.length) {
    modsResultsEmpty.style.display = "block";
    return;
  }
  modsResultsEmpty.style.display = "none";

  // AI Section
  if (aiAnalysis) {
    const aiSection = document.createElement("div");
    aiSection.className = "mods-section ai-analysis";
    aiSection.innerHTML = `
      <div class="mods-section-header" style="background: rgba(60, 133, 39, 0.1);">
        <span class="mods-section-title">🤖 AI Анализ (Gemini)</span>
      </div>
      <div class="mods-section-body is-open" style="padding: 10px; font-style: italic; white-space: pre-wrap; max-height: none;">${aiAnalysis}</div>
    `;
    modsResults.appendChild(aiSection);
  }

  const byFile = new Map();
  finds.forEach(f => {
    const key = f.jar ? (f.jar + "::" + f.path) : f.path;
    if (!byFile.has(key)) byFile.set(key, { path: f.path, jar: f.jar, types: new Set() });
    byFile.get(key).types.add(f.type);
  });

  function severityForType(type) {
    if (type === "Exec") return "danger";
    return "suspicious";
  }

  const buckets = {
    danger: [],
    suspicious: [],
    other: []
  };

  byFile.forEach(entry => {
    const severities = new Set();
    entry.types.forEach(t => severities.add(severityForType(t)));
    let target = "other";
    if (severities.has("danger")) target = "danger";
    else if (severities.has("suspicious")) target = "suspicious";
    buckets[target].push(entry);
  });

  function addSection(title, entries, key, defaultOpen) {
    if (!entries.length) return;
    const section = document.createElement("div");
    section.className = "mods-section";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "mods-section-header";
    header.dataset.section = key;
    header.dataset.open = defaultOpen ? "true" : "false";
    header.innerHTML = `<span class="mods-section-title">${title}</span><span class="mods-section-arrow">▶</span>`;

    const body = document.createElement("div");
    body.className = "mods-section-body";
    if (defaultOpen) body.classList.add("is-open");

    entries.forEach(entry => {
      const div = document.createElement("div");
      div.className = "mods-result-item";
      const jarPrefix = entry.jar ? `[${entry.jar}] ` : "";
      div.innerHTML = `<strong>${jarPrefix}${entry.path}</strong>`;

      const tags = document.createElement("div");
      tags.className = "mods-hit-tags";
      entry.types.forEach(t => {
        const tag = document.createElement("span");
        tag.className = "mods-tag";
        tag.textContent = t;
        tags.appendChild(tag);
      });
      div.appendChild(tags);
      body.appendChild(div);
    });

    header.addEventListener("click", () => {
      const isOpen = body.classList.contains("is-open");
      if (isOpen) {
        body.classList.remove("is-open");
        header.dataset.open = "false";
      } else {
        body.classList.add("is-open");
        header.dataset.open = "true";
      }
    });

    section.appendChild(header);
    section.appendChild(body);
    modsResults.appendChild(section);
  }

  addSection("Опасные", buckets.danger, "danger", true);
  addSection("Подозрительные", buckets.suspicious, "suspicious", true);
  addSection("Прочие", buckets.other, "other", false);
}

async function handleModsFiles(fileList) {
  const files = Array.from(fileList || []);
  renderModsFileList(files);
  if (!files.length) {
    renderModsResults([]);
    return;
  }
  
  modsResults.innerHTML = "<p style='padding: 10px;'>Анализируем...</p>";
  
  const allFinds = [];
  for (const f of files) {
    const finds = await scanBlobForSuspiciousCode(f, f.name);
    allFinds.push(...finds);
  }
  
  let aiAnalysis = null;
  const apiKey = document.getElementById("gemini-api-key")?.value;
  if (apiKey && allFinds.length) {
    aiAnalysis = await analyzeWithGemini(allFinds.slice(0, 10)); // Ограничиваем для API
  }
  
  renderModsResults(allFinds, aiAnalysis);
}

if (modsSelectButton && modsFileInput) {
  modsSelectButton.onclick = () => modsFileInput.click();
  modsFileInput.onchange = () => handleModsFiles(modsFileInput.files);
}

if (modsDropArea) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach(e => {
    modsDropArea.addEventListener(e, ev => {
      ev.preventDefault();
      ev.stopPropagation();
    });
  });
  ["dragenter", "dragover"].forEach(e => {
    modsDropArea.addEventListener(e, () => modsDropArea.classList.add("highlight"));
  });
  ["dragleave", "drop"].forEach(e => {
    modsDropArea.addEventListener(e, () => modsDropArea.classList.remove("highlight"));
  });
  modsDropArea.addEventListener("drop", ev => {
    const files = ev.dataTransfer?.files;
    if (files && files.length) {
      handleModsFiles(files);
    }
  });
  modsDropArea.addEventListener("click", (e) => {
    if (e.target === modsSelectButton) return;
    modsFileInput?.click();
  });
}
// =====================
// Skin Editor MVP (3D paint)
// =====================
(() => {
  let initialized = false;

  const W = 64, H = 64;
  const OVERLAY_ALPHA = 255;

  const state = {
    tool: "brush", // brush | eraser | picker | fill
    layer: "base", // base | overlay
    color: "#3c8527",
    opacity: 255,  // 0-255
    model: "classic", // classic | slim
    painting: false,
    lastPaint: null,

    history: [],
    historyIndex: -1
  };

  const els = {
    panelSkin: document.getElementById("panel-skin"),

    // optional 2D view (удалён из DOM, canvas2d будет null и просто не используется)
    canvas2d: document.getElementById("skin2d"),
    hint: document.getElementById("canvas-hint"),
    status: document.getElementById("skin-status"),
    colorHex: document.getElementById("color-hex"),

    colorInput: document.getElementById("color-input"),
    colorChip: document.getElementById("color-chip"),
    palette: document.getElementById("palette"),

    opacityInput: document.getElementById("opacity-input"),
    opacityValue: document.getElementById("opacity-value"),

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

  // 2D view ctx (optional)
  const ctx2d = els.canvas2d?.getContext?.("2d", { willReadFrequently: true }) ?? null;
  if (ctx2d) ctx2d.imageSmoothingEnabled = false;

  // Base and overlay stored separately
  const base = new Uint8ClampedArray(W * H * 4);
  const overlay = new Uint8ClampedArray(W * H * 4);
  base.fill(0);
  overlay.fill(0);

  function idx(x, y) { return (y * W + x) * 4; }

  function rgbaToHex(r, g, b) {
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  // Заполнить базовый слой дефолтным цветом, чтобы модель была видна с самого начала
  function fillDefaultBase() {
    // нейтральный базовый цвет, чтобы мазки зелёного были хорошо видны
    const { r, g, b } = hexToRgb("#c8a070");
    for (let i = 0; i < base.length; i += 4) {
      base[i] = r;
      base[i + 1] = g;
      base[i + 2] = b;
      base[i + 3] = OVERLAY_ALPHA;
    }
  }

  function getLayerArray() {
    return state.layer === "base" ? base : overlay;
  }

  function setPixel(arr, x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = idx(x, y);
    arr[i] = r; arr[i + 1] = g; arr[i + 2] = b; arr[i + 3] = a;
  }

  function getPixel(arr, x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return { r: 0, g: 0, b: 0, a: 0 };
    const i = idx(x, y);
    return { r: arr[i], g: arr[i + 1], b: arr[i + 2], a: arr[i + 3] };
  }

  function compositeToImageData() {
    const out = new Uint8ClampedArray(W * H * 4);
    out.set(base);

    // Если редактируем базовый слой – верхний временно скрываем,
    // чтобы было видно изменения «подложки».
    if (state.layer !== "base") {
      for (let p = 0; p < W * H; p++) {
        const i = p * 4;
        const oa = overlay[i + 3];
        if (oa === 0) continue;
        out[i] = overlay[i];
        out[i + 1] = overlay[i + 1];
        out[i + 2] = overlay[i + 2];
        out[i + 3] = overlay[i + 3];
      }
    }
    return new ImageData(out, W, H);
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

    els.layerLabel.textContent = state.layer === "base" ? "Base" : "Overlay";
    els.colorInput.value = state.color;
    els.colorChip.style.background = state.color;

    els.modelClassic.classList.toggle("seg-active", state.model === "classic");
    els.modelSlim.classList.toggle("seg-active", state.model === "slim");

    redraw2D();
    update3D();
  }

  function pushHistory() {
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
  // 2D redraw (preview only)
  // =====================
  function redraw2D() {
    if (!ctx2d || !els.canvas2d) return;

    const SCALE = 8;
    els.canvas2d.width = W * SCALE;
    els.canvas2d.height = H * SCALE;

    // bg
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
    const tmp = document.createElement("canvas");
    tmp.width = W;
    tmp.height = H;
    const tctx = tmp.getContext("2d");
    tctx.putImageData(img, 0, 0);

    ctx2d.imageSmoothingEnabled = false;
    ctx2d.drawImage(tmp, 0, 0, W, H, 0, 0, W * SCALE, H * SCALE);
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

  // =====================
  // 3D Preview + Painting
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
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }

  function init3D() {
    if (!window.skinview3d) {
      console.warn("skinview3d not loaded");
      return;
    }

    viewer = new skinview3d.SkinViewer({
      canvas: els.canvas3d,
      width: els.canvas3d.clientWidth || 420,
      height: els.canvas3d.clientHeight || 520,
      skin: null
    });

    viewer.zoom = 0.9;
    viewer.fov = 70;

    // controls:
    // Оставляем стандартное поведение OrbitControls (вращение/зум/пан),
    // но при рисовании будем временно отключать controls, чтобы ЛКМ была «чистой».
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = true;

    viewer.autoRotate = false;

    function resizeViewer() {
      if (!viewer) return;
      const w = els.canvas3d.clientWidth || 800;
      const h = els.canvas3d.clientHeight || 700;
      viewer.setSize(w, h);
    }

    window.addEventListener("resize", resizeViewer);
    setTimeout(resizeViewer, 50);
  }

  function resetView() {
    if (!viewer) return;
    viewer.controls.reset();
  }

  function uvToPixel(uv) {
    // uv: {x:0..1, y:0..1}
    // Minecraft skin textures use (0,0) top-left in image,
    // but UV usually has (0,0) bottom-left -> flip Y
    const x = Math.floor(uv.x * W);
    const y = Math.floor((1 - uv.y) * H);
    return {
      x: Math.max(0, Math.min(W - 1, x)),
      y: Math.max(0, Math.min(H - 1, y))
    };
  }

  function paintPixelAt(x, y) {
    const arr = getLayerArray();

    if (state.tool === "picker") {
      const c = getPixel(arr, x, y);
      if (c.a === 0) return;
      const hex = rgbaToHex(c.r, c.g, c.b);
      state.color = hex;
      els.colorInput.value = hex;
      els.colorChip.style.background = hex;
      updateStatus(`Picked ${hex}`);
      return;
    }

    if (state.tool === "eraser") {
      setPixel(arr, x, y, 0, 0, 0, 0);
      return;
    }

    // brush
    const { r, g, b } = hexToRgb(state.color);
    setPixel(arr, x, y, r, g, b, state.opacity);
  }

  function raycastUVFromMouse(ev) {
    if (!viewer) return null;

    const rect = els.canvas3d.getBoundingClientRect();
    const mx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

    // Используем глобальный THREE (подключён через CDN).
    const THREE = window.THREE;
    if (!THREE || !THREE.Raycaster) {
      // В этой сборке нет нужных типов — просто не даём падать.
      return null;
    }

    // Raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mx, my), viewer.camera);

    // viewer.playerObject is root
    const hits = raycaster.intersectObject(viewer.playerObject, true);
    if (!hits.length) return null;

    // Find first hit with uv
    for (const h of hits) {
      if (h.uv) return h.uv;
    }
    return null;
  }

  async function paintFromEvent(ev, overrideUv) {
    const uv = overrideUv || raycastUVFromMouse(ev);
    if (!uv) return;

    const { x, y } = uvToPixel(uv);

    // avoid painting same pixel too often
    if (state.lastPaint && state.lastPaint.x === x && state.lastPaint.y === y) return;
    state.lastPaint = { x, y };

    paintPixelAt(x, y);
    redraw2D();
    await update3D();
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
    const t = document.createElement("canvas");
    const tctx = t.getContext("2d", { willReadFrequently: true });

    if (img.width === 64 && img.height === 64) {
      t.width = 64; t.height = 64;
      tctx.drawImage(img, 0, 0);
      const data = tctx.getImageData(0, 0, 64, 64).data;

      base.set(data);
      overlay.fill(0);

      pushHistory();
      redraw2D();
      await update3D();
      URL.revokeObjectURL(url);
      return;
    }

    if (img.width === 64 && img.height === 32) {
      // legacy convert
      t.width = 64; t.height = 64;
      tctx.clearRect(0, 0, 64, 64);
      tctx.drawImage(img, 0, 0);

      // naive duplicate lower part (MVP)
      tctx.drawImage(img, 0, 16, 64, 16, 0, 32, 64, 16);

      const data = tctx.getImageData(0, 0, 64, 64).data;
      base.set(data);
      overlay.fill(0);

      pushHistory();
      redraw2D();
      await update3D();
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
    getLayerArray().fill(0);
    pushHistory();
    redraw2D();
    update3D();
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
        updateStatus();
      });
      els.palette.appendChild(d);
    }
  }

  // =====================
  // Tools + UI
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
    pushHistory();
    updateStatus();
    redraw2D();
    update3D();
  }

  // =====================
  // Events
  // =====================
  function initEvents() {
    // disable context menu on 3D canvas (RMB)
    els.canvas3d.addEventListener("contextmenu", (e) => e.preventDefault());

    // tool buttons
    document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
      btn.addEventListener("click", () => setTool(btn.dataset.tool));
    });

    els.btnUndo.addEventListener("click", undo);
    els.btnRedo.addEventListener("click", redo);
    els.btnLayer.addEventListener("click", toggleLayer);

    els.btnResetView.addEventListener("click", resetView);

    els.modelClassic.addEventListener("click", async () => {
      state.model = "classic";
      els.modelClassic.classList.add("seg-active");
      els.modelSlim.classList.remove("seg-active");
      pushHistory();
      await update3D();
    });

    els.modelSlim.addEventListener("click", async () => {
      state.model = "slim";
      els.modelSlim.classList.add("seg-active");
      els.modelClassic.classList.remove("seg-active");
      pushHistory();
      await update3D();
    });

    els.colorInput.addEventListener("input", () => {
      state.color = els.colorInput.value;
      els.colorChip.style.background = state.color;
      updateStatus();
    });

    els.btnImport.addEventListener("click", () => els.importInput.click());
    els.importInput.addEventListener("change", () => {
      const f = els.importInput.files?.[0];
      if (f) importPNG(f);
      els.importInput.value = "";
    });

    els.btnExport.addEventListener("click", exportPNG);
    els.btnClear.addEventListener("click", clearLayer);

    // opacity slider
    if (els.opacityInput && els.opacityValue) {
      els.opacityInput.addEventListener("input", () => {
        const v = Number(els.opacityInput.value) || 0;
        state.opacity = Math.max(0, Math.min(255, v));
        const percent = Math.round((state.opacity / 255) * 100);
        els.opacityValue.textContent = percent + "%";
        updateStatus();
      });
    }

    // 3D paint: ЛКМ рисует по модели, ЛКМ мимо модели + ПКМ/колёсико крутят сцену
    els.canvas3d.addEventListener("pointerdown", async (ev) => {
      if (ev.button !== 0) return; // only LMB paints

      // проверяем, попали ли в модель
      const hitUv = raycastUVFromMouse(ev);
      if (!hitUv) {
        // клик мимо модели — даём OrbitControls крутить сцену
        return;
      }

      state.painting = true;
      state.lastPaint = null;

      // во время мазка отключаем OrbitControls, чтобы ЛКМ не вращала сцену
      if (viewer && viewer.controls) {
        viewer.controls.enabled = false;
      }

      // begin stroke snapshot
      pushHistory();

      els.canvas3d.classList.add("paint-mode");
      await paintFromEvent(ev, hitUv);
    });

    window.addEventListener("pointerup", () => {
      if (state.painting && viewer && viewer.controls) {
        viewer.controls.enabled = true;
      }
      state.painting = false;
      state.lastPaint = null;
      els.canvas3d.classList.remove("paint-mode");
    });

    els.canvas3d.addEventListener("pointermove", async (ev) => {
      if (!state.painting) return;
      await paintFromEvent(ev);
    });

    // hotkeys
    window.addEventListener("keydown", (ev) => {
      const skinOpen = els.panelSkin.classList.contains("tab-panel-active");
      if (!skinOpen) return;

      const key = ev.key.toLowerCase();
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (key === "b") { setTool("brush"); return; }
      if (key === "e") { setTool("eraser"); return; }
      if (key === "i") { setTool("picker"); return; }
      if (key === "g") { setTool("fill"); return; }
      if (key === "l") { toggleLayer(); return; }
      if (key === "r") { resetView(); return; }

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

    // сразу заливаем базовый слой цветом, чтобы 3D‑модель не была прозрачной
    fillDefaultBase();

    initPalette();
    init3D();
    initEvents();

    // initial UI
    els.layerLabel.textContent = "Base";
    els.colorInput.value = state.color;
    els.colorChip.style.background = state.color;

    pushHistory();
    redraw2D();
    update3D();
    updateStatus();
  }

  window.__openSkinEditor = init;
})();
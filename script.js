// Локализация
const translations = {
  en: {
    title: "Mrpack to Zip Converter",
    "drop-text": "Drag & Drop .mrpack file",
    "select-button": "Select File",
    "no-file": "No file selected",
    convert: "Convert",
    "pack-name": "Beautiful Optimized"
  },
  ru: {
    title: "Mrpack to Zip Converter",
    "drop-text": "Перетащите .mrpack файл сюда",
    "select-button": "Выбрать файл",
    "no-file": "Файл не выбран",
    convert: "Конвертировать",
    "pack-name": "Beautiful Optimized"
  }
};

const lang = navigator.language.startsWith("ru") ? "ru" : "en";
document.querySelectorAll("[data-i18n]").forEach(el => {
  const key = el.getAttribute("data-i18n");
  if (translations[lang][key]) el.textContent = translations[lang][key];
});

// Динамическая версия
const MAJOR_VERSION = "2.4";
fetch("build.txt")
  .then(r => r.ok ? r.text() : "0")
  .catch(() => "0")
  .then(build => {
    const buildNum = build.trim() || "0";
    document.getElementById("version").textContent = `v${MAJOR_VERSION}.${buildNum}`;
  });

// Темы
const themeToggle = document.getElementById("theme-toggle");
const themeMenu = document.querySelector(".theme-menu");
const themeOptions = document.querySelectorAll(".theme-option");

function updateToggleIcon(theme) {
  if (theme === "light") themeToggle.textContent = "☀️";
  else if (theme === "dark") themeToggle.textContent = "🌙";
  else themeToggle.textContent = "🌗";
}

function applyTheme(theme) {
  if (theme === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    updateToggleIcon("auto");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
    updateToggleIcon(theme);
  }
  localStorage.setItem("theme", theme);
}

const savedTheme = localStorage.getItem("theme") || "auto";
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  themeMenu.classList.toggle("active");
});

themeOptions.forEach(option => {
  option.addEventListener("click", () => {
    applyTheme(option.dataset.theme);
    themeMenu.classList.remove("active");
  });
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (localStorage.getItem("theme") === "auto") applyTheme("auto");
});

// Закрытие меню при клике вне
document.addEventListener("click", (e) => {
  if (!themeToggle.contains(e.target) && !themeMenu.contains(e.target)) {
    themeMenu.classList.remove("active");
  }
});

// Остальной код (анимация и конвертация)
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
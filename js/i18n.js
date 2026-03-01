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

// Version handling
const MAJOR_VERSION = "0.0";
fetch("build.txt")
  .then(r => r.ok ? r.text() : "0")
  .catch(() => "0")
  .then(build => {
    const buildNum = build.trim() || "0";
    document.getElementById("version").textContent = `v${MAJOR_VERSION}.${buildNum}`;
  });

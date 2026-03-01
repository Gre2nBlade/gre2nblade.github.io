/**
 * Converter logic.
 */
const fileInput = document.getElementById("file-input");
const fileName = document.getElementById("file-name");
const selectButton = document.getElementById("select-button");
const convertButton = document.getElementById("convert-button");
const modal = document.getElementById("loading-modal");
const grid = document.getElementById("grid");

if (selectButton) selectButton.onclick = () => fileInput?.click();

if (fileInput) {
  fileInput.onchange = () => {
    if (fileInput.files.length) {
      fileName.textContent = fileInput.files[0].name;
      convertButton.disabled = false;
    }
  };
}

const dropArea = document.getElementById("drop-area");
if (dropArea) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach(e => {
    dropArea.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
  });
  dropArea.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    fileInput.files = e.dataTransfer.files;
    fileName.textContent = file.name;
    convertButton.disabled = false;
  });
  dropArea.addEventListener("click", (e) => {
    if (e.target !== selectButton) fileInput?.click();
  });
}

// Loader Grid
const SIZE = 16;
const cells = [];
if (grid) {
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    grid.appendChild(cell);
    cells.push(cell);
  }
}

let order = generateOrder(SIZE);
function generateOrder(n) {
  const center = Math.floor(n / 2);
  const res = [];
  for (let r = 0; r <= center; r++) {
    const ring = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (Math.max(Math.abs(x - center), Math.abs(y - center)) === r) ring.push(y * n + x);
      }
    }
    ring.sort(() => Math.random() - 0.5);
    res.push(...ring);
  }
  return res;
}

function setProgress(p) {
  p = Math.max(0, Math.min(1, p));
  const total = order.length;
  const gray = Math.floor(total * Math.min(1, p + 0.12));
  const green = Math.floor(total * p);
  cells.forEach((c, i) => {
    c.className = "cell";
    if (i < green) cells[order[i]].classList.add("green");
    else if (i < gray) cells[order[i]].classList.add("gray");
  });
}

async function downloadPack() {
  modal.classList.add("is-active");
  setProgress(0);

  const zip = await JSZip.loadAsync(fileInput.files[0]);
  const manifest = JSON.parse(await zip.files["modrinth.index.json"].async("string"));
  const newZip = new JSZip();
  const findings = [];
  
  const files = manifest.files.filter(f => f.env?.client === "required");
  let loaded = 0;

  await Promise.all(Array(6).fill().map(async () => {
    while (loaded < files.length) {
      const file = files[loaded++];
      try {
        const blob = await fetch(file.downloads[0]).then(r => r.blob());
        const f = await scanBlobForSuspiciousCode(blob, file.path);
        if (f.length) findings.push(...f);
        newZip.file(file.path, blob);
        setProgress(loaded / files.length);
      } catch (e) { console.warn("Load error", file.path, e); }
    }
  }));

  setProgress(1);
  await sleep(400);
  modal.classList.add("fade-out");
  await sleep(350);
  modal.classList.remove("is-active", "fade-out");

  const content = await newZip.generateAsync({ type: "blob" });
  saveAs(content, `${manifest.name}-${manifest.versionId}.zip`);

  const report = document.getElementById("converter-security-report");
  if (report) {
    report.textContent = findings.length 
      ? "Найдены подозрительные моды: " + [...new Set(findings.map(f => f.jar))].join(", ")
      : "Проверка завершена: угроз не обнаружено.";
  }
}

if (convertButton) convertButton.onclick = downloadPack;

/**
 * Converter logic.
 */
const fileInput = document.getElementById("file-input");
const fileName = document.getElementById("file-name");
const selectButton = document.getElementById("select-button");
const convertButton = document.getElementById("convert-button");

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

async function downloadPack() {
  if (!fileInput.files.length) return;
  
  await Loader.show();

  try {
    const zip = await JSZip.loadAsync(fileInput.files[0]);
    const manifestStr = await zip.files["modrinth.index.json"].async("string");
    const manifest = JSON.parse(manifestStr);
    const newZip = new JSZip();
    const findings = [];
    
    const files = manifest.files.filter(f => f.env?.client !== "unsupported");
    let loadedCount = 0;
    const total = files.length;

    // Parallel download and scan
    const pool = [...files];
    await Promise.all(Array(6).fill().map(async () => {
      while (pool.length > 0) {
        const file = pool.shift();
        if (!file) break;

        try {
          const blob = await fetch(file.downloads[0]).then(r => r.blob());
          // scanBlobForSuspiciousCode is defined in analyzer.js
          if (window.scanBlobForSuspiciousCode) {
            const f = await window.scanBlobForSuspiciousCode(blob, file.path);
            if (f.length) findings.push(...f);
          }
          newZip.file(file.path, blob);
        } catch (e) {
          console.warn("Load error", file.path, e);
        } finally {
          loadedCount++;
          Loader.setProgress(loadedCount / total);
        }
      }
    }));

    const content = await newZip.generateAsync({ type: "blob" });
    saveAs(content, `${manifest.name || "pack"}-${manifest.versionId || "converted"}.zip`);

    const report = document.getElementById("converter-security-report");
    if (report) {
      report.textContent = findings.length 
        ? "Найдены подозрительные моды: " + [...new Set(findings.map(f => f.jar))].join(", ")
        : "Проверка завершена: угроз не обнаружено.";
    }
  } catch (err) {
    console.error(err);
    alert("Ошибка при конвертации: " + err.message);
  } finally {
    await Loader.hide();
  }
}

if (convertButton) convertButton.onclick = downloadPack;
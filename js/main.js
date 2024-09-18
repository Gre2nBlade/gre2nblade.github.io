const fileInput = document.getElementById('file-input');
const convertBtn = document.getElementById('convert-btn');
const downloadBtn = document.getElementById('download-btn');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');

let mrpackFile = null;

async function handleFileSelect(files) {
  if (files.length > 0 && files[0].name.endsWith('.mrpack')) {
    mrpackFile = files[0];
    convertBtn.disabled = false;
    showToast('Файл выбран: ' + mrpackFile.name, 'success');
    
    // Автоматически начинаем конвертацию
    await convertMrpack(mrpackFile);
  } else {
    showToast('Пожалуйста, выберите файл .mrpack', 'error');
  }
}

fileInput.addEventListener('change', (event) => {
    mrpackFile = event.target.files[0];
    if (mrpackFile && mrpackFile.name.endsWith('.mrpack')) {
        convertBtn.disabled = false;
        showToast('Файл выбран: ' + mrpackFile.name, 'success');
    } else {
        showToast('Пожалуйста, выберите файл .mrpack', 'error');
    }
});

convertBtn.addEventListener('click', () => {
  if (mrpackFile) {
    convertMrpack(mrpackFile);
  }
});

    convertBtn.disabled = true;
    downloadBtn.disabled = true;
    progressBar.classList.remove('hidden');
    progress.style.width = '0%';

    try {
        const zipFile = await convertMrpackToZip(mrpackFile);
        const downloadUrl = URL.createObjectURL(zipFile);
        downloadBtn.href = downloadUrl;
        downloadBtn.download = mrpackFile.name.replace('.mrpack', '.zip');
        downloadBtn.disabled = false;
    } catch (error) {
        showToast('Ошибка конвертации: ' + error.message, 'error');
    } finally {
        convertBtn.disabled = false;
        progressBar.classList.add('hidden');
    }

async function convertMrpack(file) {
  convertBtn.disabled = true;
  progressBar.classList.remove('hidden');
  progress.style.width = '0%';

  try {
    const zipBlob = await convertMrpackToZip(file);
    convertedZip = zipBlob;
    downloadBtn.disabled = false;
    showToast('Конвертация завершена!', 'success');
  } catch (error) {
    showToast('Ошибка конвертации: ' + error.message, 'error');
  } finally {
    progressBar.classList.add('hidden');
    convertBtn.disabled = false;
  }
}

async function convertMrpackToZip(file) {
  const JSZip = (await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')).default;
  
  const zip = new JSZip();
  const mrpackContent = await readFileAsArrayBuffer(file);
  
  // Распаковываем .mrpack файл
  const mrpackZip = await JSZip.loadAsync(mrpackContent);
  
  // Читаем modrinth.index.json
  const indexJson = JSON.parse(await mrpackZip.file('modrinth.index.json').async('text'));
  
  // Добавляем файлы из 'files' в новый zip
  for (const fileInfo of indexJson.files) {
    const fileContent = await fetchFile(fileInfo.downloads[0]);
    zip.file(fileInfo.path, fileContent);
    updateProgress();
  }
  
  // Добавляем файлы из 'overrides' если они есть
  const overrides = mrpackZip.folder('overrides');
  if (overrides) {
    await addOverridesToZip(overrides, zip);
  }
  
  return zip.generateAsync({ type: 'blob' });
}

function showToast(message, type) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: 'right',
        backgroundColor: type === 'success' ? '#4CAF50' : '#f44336'
    }).showToast();
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

async function fetchFile(url) {
  const response = await fetch(url);
  return response.arrayBuffer();
}

async function addOverridesToZip(overridesFolder, targetZip) {
  const files = await overridesFolder.files;
  for (const [path, file] of Object.entries(files)) {
    if (!file.dir) {
      const content = await file.async('arraybuffer');
      targetZip.file(path, content);
    }
  }
}

function updateProgress() {
  let currentWidth = parseInt(progress.style.width) || 0;
  progress.style.width = Math.min(currentWidth + 5, 100) + '%';
}

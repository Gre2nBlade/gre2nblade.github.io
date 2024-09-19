// Инициализация переменных и получение элементов DOM
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const selectFileButton = document.getElementById('selectFile');
const convertButton = document.getElementById('convertButton');
const downloadButton = document.getElementById('downloadButton');
const progressBar = document.getElementById('progressFill');

let selectedFile = null;

// Обработчики событий для drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

// Обработчик события drop
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Обработчик выбора файла через кнопку
selectFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Функция обработки выбранных файлов
function handleFiles(files) {
    if (files.length > 0) {
        selectedFile = files[0];
        if (selectedFile.name.endsWith('.mrpack')) {
            convertButton.disabled = false;
            Toastify({
                text: "File selected: " + selectedFile.name,
                duration: 3000,
                gravity: "bottom",
                position: 'right',
                backgroundColor: "#30b27b"
            }).showToast();
        } else {
            Toastify({
                text: "Please select a .mrpack file",
                duration: 3000,
                gravity: "bottom",
                position: 'right',
                backgroundColor: "#ff6b6b"
            }).showToast();
        }
    }
}

// Обработчик нажатия на кнопку конвертации
convertButton.addEventListener('click', convertToZip);

function convertToZip() {
    if (!selectedFile) return;

    const worker = new Worker('worker.js');
    worker.postMessage({ file: selectedFile });

    worker.onmessage = function(e) {
        if (e.data.progress) {
            updateProgress(e.data.progress);
        } else if (e.data.result) {
            const blob = e.data.result;
            downloadButton.disabled = false;
            downloadButton.addEventListener('click', () => downloadZip(blob, 'converted.zip'));
            Toastify({
                text: "Conversion completed!",
                duration: 3000,
                gravity: "bottom",
                position: 'right',
                backgroundColor: "#30b27b"
            }).showToast();
        }
    };
}

// Функция обновления прогресс-бара
function updateProgress(progress) {
    progressBar.style.width = `${progress}%`;
}

// Функция для скачивания zip-файла
function downloadZip(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

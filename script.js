const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const convertButton = document.getElementById('convertButton');
const downloadButton = document.getElementById('downloadButton');
const progressBar = document.getElementById('progressFill');
const modal = document.getElementById("loading-modal");

let selectedFile = null;

// Обработчики событий для drag and drop 
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { dropArea.addEventListener(eventName, preventDefaults, false); });

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => { dropArea.classList.add('highlight'); });

['dragleave', 'drop'].forEach(eventName => { dropArea.classList.remove('highlight'); });

// Обработчик drop события 
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Обработчик выбора файла через кнопку 
document.getElementById('selectFile').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Функция обработки выбранных файлов 
function handleFiles(files) {
    if (files.length > 0) {
        selectedFile = files[0];
        if (selectedFile.name.endsWith('.mrpack')) {
            convertButton.disabled = false;
            Toastify({
                text: "Файл выбран: " + selectedFile.name,
                duration: 3000,
                gravity: "bottom",
                position: 'right',
                backgroundColor: "#30b27b"
            }).showToast();
        } else {
            Toastify({
                text: "Выберите .mrpack файл",
                duration: 3000,
                gravity: "bottom",
                position: 'right',
                backgroundColor: "#ff6b6b"
            }).showToast();
        }
    }
}

// Конвертация в zip 
convertButton.addEventListener('click', function () {
    if (!selectedFile) return;

    // Показать модальное окно загрузки
    modal.classList.add("is-active");

    const newZip = new JSZip();

    JSZip.loadAsync(selectedFile)
        .then(async function (zip) {
            const manifestRaw = await zip.files['modrinth.index.json'].async('string');
            const manifest = JSON.parse(manifestRaw);

            // Обработка файлов
            for (const fileName in zip.files) {
                const file = zip.files[fileName];
                if (file.dir) continue;

                if (file.name.startsWith("overrides/") || file.name.startsWith("client-overrides/")) {
                    const properFileName = file.name.split("/").slice(1).join("/");
                    newZip.file(properFileName, file.async('blob'));
                }
            }

            let totalFileSize = 0;
            let downloaded = 0;

            manifest.files.forEach(file => {
                totalFileSize += file.fileSize;
            });

            progressBar.max = totalFileSize;

            const filePromises = manifest.files.map(file => {
                if (file.env.client !== 'required') return;

                return fetch(file.downloads[0])
                    .then(response => response.blob())
                    .then(blob => {
                        downloaded += file.fileSize;
                        progressBar.style.width = `${(downloaded / totalFileSize) * 100}%`;
                        newZip.file(file.path, blob);
                    });
            });

            await Promise.all(filePromises);

            newZip.generateAsync({ type: "blob" })
                .then(content => {
                    const url = URL.createObjectURL(content);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${manifest.name}-${manifest.versionId}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);

                    modal.classList.remove("is-active");

                    Toastify({
                        text: "Конвертация завершена!",
                        duration: 3000,
                        gravity: "bottom",
                        position: 'right',
                        backgroundColor: "#30b27b"
                    }).showToast();
                });
        });
});

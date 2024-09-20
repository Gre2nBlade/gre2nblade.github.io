const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const convertButton = document.getElementById('convertButton');
const progressBar = document.getElementById('progressFill');
const modal = document.getElementById("loading-modal");

let selectedFile = null;

// Обработчики событий для drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

// Предотвращает стандартное поведение браузера
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Добавление и удаление класса highlight
dropArea.addEventListener('dragenter', () => dropArea.classList.add('highlight'));
dropArea.addEventListener('dragover', () => dropArea.classList.add('highlight'));
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('highlight'));
dropArea.addEventListener('drop', () => dropArea.classList.remove('highlight'));

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
                background: "#30b27b" // Обновлено на background
            }).showToast();
        } else {
            Toastify({
                text: "Выберите .mrpack файл",
                duration: 3000,
                gravity: "bottom",
                position: 'right',
                background: "#ff6b6b" // Обновлено на background
            }).showToast();
        }
    }
}

// Конвертация в zip
convertButton.addEventListener('click', async function () {
    if (!selectedFile) return;

    const newZip = new JSZip();
    modal.classList.add("is-active");

    try {
        const zip = await JSZip.loadAsync(selectedFile);
        const manifestRaw = await zip.files['modrinth.index.json'].async('string');
        const manifest = JSON.parse(manifestRaw);

        // Обработка файлов
        for (const fileName in zip.files) {
            const file = zip.files[fileName];
            if (file.dir) continue;

            if (file.name.startsWith("overrides/") || file.name.startsWith("client-overrides/")) {
                const properFileName = file.name.split("/").slice(1).join("/");
                newZip.file(properFileName, await file.async('blob'));
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
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.blob();
                })
                .then(blob => {
                    downloaded += file.fileSize;
                    progressBar.style.width = `${(downloaded / totalFileSize) * 100}%`;
                    newZip.file(file.path, blob);
                });
        });

        await Promise.all(filePromises);

        const content = await newZip.generateAsync({ type: "blob" });
        saveAs(content, `${manifest.name}-${manifest.versionId}.zip`);
        modal.classList.remove("is-active");

        Toastify({
            text: "Конвертация завершена!",
            duration: 3000,
            gravity: "bottom",
            position: 'right',
            background: "#30b27b" // Обновлено на background
        }).showToast();

    } catch (error) {
        console.error(error);
        modal.classList.remove("is-active");
        Toastify({
            text: "Произошла ошибка: " + error.message,
            duration: 3000,
            gravity: "bottom",
            position: 'right',
            background: "#ff6b6b" // Обновлено на background
        }).showToast();
    }
});

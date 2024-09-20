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

        for (const file of manifest.files) {
            if (file.env.client !== 'required') continue;

            try {
                const response = await fetch(file.downloads[0]);
                if (!response.ok) throw new Error('Network response was not ok');
                const blob = await response.blob();
                downloaded += file.fileSize;
                progressBar.style.width = `${(downloaded / totalFileSize) * 100}%`;
                newZip.file(file.path, blob);
            } catch (error) {
                console.error('Failed to fetch file:', error);
                Toastify({
                    text: "Ошибка при загрузке файла: " + error.message,
                    duration: 3000,
                    gravity: "bottom",
                    position: 'right',
                    backgroundColor: "#ff6b6b"
                }).showToast();
                modal.classList.remove("is-active");
                return; // Выход при ошибке
            }
        }

        const content = await newZip.generateAsync({ type: "blob" });
        saveAs(content, `${manifest.name}-${manifest.versionId}.zip`);
        modal.classList.remove("is-active");

        Toastify({
            text: "Конвертация завершена!",
            duration: 3000,
            gravity: "bottom",
            position: 'right',
            backgroundColor: "#30b27b"
        }).showToast();

    } catch (error) {
        console.error('Error during conversion:', error);
        modal.classList.remove("is-active");
        Toastify({
            text: "Ошибка при конвертации: " + error.message,
            duration: 3000,
            gravity: "bottom",
            position: 'right',
            backgroundColor: "#ff6b6b"
        }).showToast();
    }
});

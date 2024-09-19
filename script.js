const modal = document.getElementById("loading-modal");
const progress = document.getElementById("progressFill");

const fileInput = document.getElementById("fileInput");
const convertButton = document.getElementById("convertButton");
const downloadButton = document.getElementById("downloadButton");

let selectedFile = null;

// Обновление имени файла и состояния кнопок
function updateFileName() {
    if (selectedFile && selectedFile.name.endsWith('.mrpack')) {
        convertButton.disabled = false;
    }
}

// Обработка выбора файла через drag-and-drop 
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

// Конвертация в zip 
convertButton.addEventListener('click', function () { if (!selectedFile) return;

    // Показать модальное окно загрузки 
    modal.classList.add("is-active");

    const newZip = new JSZip();

    // Чтение и конвертация .mrpack 
    JSZip.loadAsync(selectedFile).then(
        async function (zip) {
            const manifestRaw = await zip.files['modrinth.index.json'].async('string');
            const manifest = JSON.parse(manifestRaw);

            // Добавление файлов
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

            for (const file of manifest.files) {
                totalFileSize += file.fileSize;
            }

            progress.max = totalFileSize;

            const filePromises = [];
            for (const file of manifest.files) {
                if (file.env.client !== 'required') continue;

                filePromises.push(
                    fetch(file.downloads[0])
                        .then(response => response.blob())
                        .then(blob => {
                            downloaded += file.fileSize;
                            progress.style.width = `${(downloaded / totalFileSize) * 100}%`;
                            newZip.file(file.path, blob);
                        })
                );
            }

            await Promise.all(filePromises);

            // Генерация zip и завершение
            newZip.generateAsync({ type: "blob" })
                .then(content => {
                    const url = URL.createObjectURL(content);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${manifest.name}-${manifest.versionId}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);

                    // Скрыть модальное окно загрузки
                    modal.classList.remove("is-active");

                    Toastify({
                        text: "Conversion completed!",
                        duration: 3000,
                        gravity: "bottom",
                        position: 'right',
                        backgroundColor: "#30b27b"
                    }).showToast();
                });
        })
})

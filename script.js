<!-- script.js -->
// Обработаем логику для конвертации .mrpack в .zip с добавлением обработки ошибок

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById("fileInput");
    const convertButton = document.getElementById("convertButton");
    const downloadButton = document.getElementById("downloadButton");
    const progressBar = document.getElementById("progressFill");
    
    let newZip;
    let manifest;

    // Обновляем имя файла при выборе
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            convertButton.disabled = false;
        }
    });

    // Функция для отображения ошибок
    function showError(message) {
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "center",
            backgroundColor: "#ff5f5f",
        }).showToast();
    }

    // Функция для загрузки файла и конвертации
    async function convertFile() {
        if (fileInput.files.length === 0) return;

        try {
            const file = fileInput.files[0];
            const zip = await JSZip.loadAsync(file);
            const manifestRaw = await zip.files['modrinth.index.json'].async('string');
            manifest = JSON.parse(manifestRaw);
            newZip = new JSZip();

            let totalFileSize = 0;
            manifest.files.forEach(file => {
                totalFileSize += file.fileSize;
            });

            let downloaded = 0;

            for (const fileIndex in manifest.files) {
                const file = manifest.files[fileIndex];
                if (file.env.client !== 'required') continue;

                const fileData = await fetch(file.downloads[0]);
                const blob = await fileData.blob();
                newZip.file(file.path, blob);

                downloaded += file.fileSize;
                progressBar.style.width = `${(downloaded / totalFileSize) * 100}%`;
            }

            downloadButton.disabled = false;
        } catch (error) {
            showError("Failed to convert the file. Please check the .mrpack file or try again.");
            console.error(error);
        }
    }

    // Обработчик на кнопку конвертации
    convertButton.addEventListener('click', async () => {
        await convertFile();
    });

    // Обработчик на кнопку скачивания
    downloadButton.addEventListener('click', () => {
        newZip.generateAsync({ type: "blob" })
            .then(content => {
                const fileName = `${manifest.name}-${manifest.versionId}.zip`;
                saveAs(content, fileName);
            })
            .catch(error => {
                showError("Failed to generate the zip file.");
                console.error(error);
            });
    });
});

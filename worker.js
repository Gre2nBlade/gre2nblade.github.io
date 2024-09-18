self.onmessage = async (event) => {
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js');

self.onmessage = async (event) => {
    try {
        const mrpackZip = new JSZip();
        await mrpackZip.loadAsync(event.data.file);

        const indexJson = await mrpackZip.file('modrinth.index.json').async('string');
        const index = JSON.parse(indexJson);

        const filesToProcess = index.files.filter(file => !file.path.match(/^\d+$/));

let filesProcessed = 0;
const totalFiles = index.files.length;

for (const file of index.files) {
    try {
        const fileContent = await fetchFile(file.downloads[0]);
        zip.file(file.path, fileContent);
    } catch (error) {
        console.error(`Failed to fetch file: ${file.path}`, error);
        // Можно добавить обработку ошибки, например, пропустить файл или уведомить пользователя
    }
    
    filesProcessed++;
    self.postMessage({ progress: Math.round((filesProcessed / totalFiles) * 100) });
}

// Добавляем содержимое папки overrides
const overridesFolder = mrpackZip.folder('overrides');
if (overridesFolder) {
    await addFolderToZip(overridesFolder, zip);
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

async function fetchFile(url) {
    const response = await fetch(url);
    return await response.arrayBuffer();
}

async function addFolderToZip(folder, zip, path = '') {
    await Promise.all(
        Object.entries(folder.files).map(async ([fileName, file]) => {
            if (file.dir) {
                await addFolderToZip(file, zip, `${path}${fileName}/`);
            } else {
                const content = await file.async('arraybuffer');
                zip.file(`${path}${fileName}`, content);
            }
        })
    );
}
} catch (error) {
        console.error('Error processing MRPACK file:', error);
        self.postMessage({ error: error.message });
    }
};

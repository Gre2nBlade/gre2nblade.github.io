importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js');

self.onmessage = async function(e) {
    const file = e.data.file;
    const zip = new JSZip();

    try {
        const mrpackContent = await readFileAsArrayBuffer(file);
        const mrpackZip = await JSZip.loadAsync(mrpackContent);

        const indexJson = await mrpackZip.file('modrinth.index.json').async('string');
        const index = JSON.parse(indexJson);

        let processedFiles = 0;
        const totalFiles = index.files.length;

        for (const fileInfo of index.files) {
            const fileData = await fetchFile(fileInfo.downloads[0]);
            zip.file(fileInfo.path, fileData);
            
            processedFiles++;
            self.postMessage({ progress: Math.round((processedFiles / totalFiles) * 100) });
        }

        const overridesFolder = mrpackZip.folder('overrides');
        if (overridesFolder) {
            await addFolderToZip(overridesFolder, zip);
        }

        const resultZip = await zip.generateAsync({ type: 'blob' });
        self.postMessage({ result: resultZip });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsArrayBuffer(file);
    });
}

async function fetchFile(url) {
    const response = await fetch(url);
    return await response.arrayBuffer();
}

async function addFolderToZip(folder, zip) {
    const files = await folder.files;
    for (const [path, file] of Object.entries(files)) {
        if (!file.dir) {
            const content = await file.async('arraybuffer');
            zip.file(path, content);
        }
    }
}
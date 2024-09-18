importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js');

self.onmessage = async function(e) {
    const mrpackFile = e.data.mrpackFile;
    const zip = new JSZip();

    try {
        const mrpackContent = await readFileAsArrayBuffer(mrpackFile);
        const mrpackZip = await JSZip.loadAsync(mrpackContent);
        
        const indexJson = await mrpackZip.file('modrinth.index.json').async('string');
        const index = JSON.parse(indexJson);

        let filesProcessed = 0;
        const totalFiles = index.files.length;

        for (const file of index.files) {
            const fileContent = await fetchFile(file.downloads[0]);
            zip.file(file.path, fileContent);
            
            filesProcessed++;
            self.postMessage({ progress: Math.round((filesProcessed / totalFiles) * 100) });
        }

        // Add overrides
        const overridesFolder = mrpackZip.folder('overrides');
        if (overridesFolder) {
            await addFolderToZip(overridesFolder, zip);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        self.postMessage({ zipBlob });
    } catch (error) {
        console.error('Error during conversion:', error);
        self.postMessage({ error: 'Conversion failed' });
    }
};

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
    const files = await folder.files;
    for (const [fileName, file] of Object.entries(files)) {
        if (file.dir) {
            await addFolderToZip(file, zip, `${path}${fileName}/`);
        } else {
            const content = await file.async('arraybuffer');
            zip.file(`${path}${fileName}`, content);
        }
    }
}

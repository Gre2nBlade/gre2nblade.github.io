self.onmessage = async (event) => {
    const mrpackFile = event.data;
    const JSZip = (await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js')).default;

    try {
        const zip = new JSZip();
        const mrpackContent = await readFile(mrpackFile);
        
        // Здесь должна быть логика разбора .mrpack файла
        // Для примера, добавим файл в zip
        zip.file(mrpackFile.name, mrpackContent);
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        self.postMessage(zipBlob);
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};

async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}
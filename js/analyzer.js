/**
 * Mod Analyzer: Scanner, Gemini AI and UI.
 */
function getSuspiciousPatterns() {
  return [
    { id: "network", label: "Network", re: /java\/net|HttpURLConnection|URL\s*\(|OkHttp|Netty/ },
    { id: "filesystem", label: "Filesystem", re: /java\/io\/File|FileInputStream|FileOutputStream|RandomAccessFile|Files\./ },
    { id: "exec", label: "Exec", re: /Runtime\.getRuntime\(\)\.exec|ProcessBuilder/ },
    { id: "reflect", label: "Reflection", re: /java\/lang\/reflect|Class\.forName/ },
    { id: "crypto", label: "Crypto", re: /Cipher\.getInstance|MessageDigest|KeyGenerator/ },
    { id: "script", label: "Scripting", re: /javax\.script|ScriptEngineManager/ }
  ];
}

async function scanBlobForSuspiciousCode(blob, displayPath) {
  const findings = [];
  const ext = (displayPath || "").toLowerCase();
  if (!ext.endsWith(".jar")) return findings;

  try {
    const zip = await JSZip.loadAsync(blob);
    const patterns = getSuspiciousPatterns();
    const entries = Object.keys(zip.files).filter(p => p.endsWith(".class"));
    
    await Promise.all(entries.map(async path => {
      const content = await zip.files[path].async("string").catch(() => "");
      if (!content) return;
      patterns.forEach(p => {
        if (p.re.test(content)) {
          findings.push({ path, type: p.label, jar: displayPath, content: content.substring(0, 1000) });
        }
      });
    }));
  } catch (e) {
    console.warn("Scan error", displayPath, e);
  }
  return findings;
}

async function analyzeWithGemini(findings) {
  const apiKey = document.getElementById("gemini-api-key")?.value;
  if (!apiKey || !findings.length) return null;

  const prompt = `Проанализируй эти фрагменты кода из мода Minecraft. 
  Это вредоносный код или нормальное поведение? Ответ краткий.
  
  ${findings.map(f => `- Файл: ${f.path}
- Тип: ${f.type}
- Контекст: ${f.content.substring(0, 200)}`).join("")}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Не удалось получить ответ.";
  } catch (err) {
    return "Ошибка API.";
  }
}

const modsDropArea = document.getElementById("mods-drop-area");
const modsFileInput = document.getElementById("mods-file-input");
const modsSelectButton = document.getElementById("mods-select-button");
const modsResults = document.getElementById("mods-results");
const modsResultsEmpty = document.getElementById("mods-results-empty");

function renderModsResults(finds, aiAnalysis = null) {
  if (!modsResults) return;
  modsResults.innerHTML = "";
  if (!finds.length) {
    modsResultsEmpty.style.display = "block";
    return;
  }
  modsResultsEmpty.style.display = "none";

  if (aiAnalysis) {
    const aiEl = document.createElement("div");
    aiEl.className = "mods-section ai-analysis";
    aiEl.innerHTML = `
      <div class="mods-section-header" style="background: rgba(60, 133, 39, 0.1);">
        <span class="mods-section-title">🤖 AI Анализ</span>
      </div>
      <div class="mods-section-body is-open" style="padding: 10px; font-style: italic; white-space: pre-wrap;">${aiAnalysis}</div>
    `;
    modsResults.appendChild(aiEl);
  }

  const byFile = new Map();
  finds.forEach(f => {
    const key = f.jar + "::" + f.path;
    if (!byFile.has(key)) byFile.set(key, { ...f, types: new Set() });
    byFile.get(key).types.add(f.type);
  });

  const buckets = { danger: [], suspicious: [], other: [] };
  byFile.forEach(entry => {
    const isDanger = Array.from(entry.types).some(t => t === "Exec");
    const isSuspicious = !isDanger && entry.types.size > 0;
    if (isDanger) buckets.danger.push(entry);
    else if (isSuspicious) buckets.suspicious.push(entry);
    else buckets.other.push(entry);
  });

  const addSection = (title, entries, open) => {
    if (!entries.length) return;
    const section = document.createElement("div");
    section.className = "mods-section";
    section.innerHTML = `
      <button type="button" class="mods-section-header">
        <span class="mods-section-title">${title}</span>
        <span class="mods-section-arrow">${open ? "▼" : "▶"}</span>
      </button>
      <div class="mods-section-body ${open ? "is-open" : ""}"></div>
    `;
    const body = section.querySelector(".mods-section-body");
    entries.forEach(e => {
      const item = document.createElement("div");
      item.className = "mods-result-item";
      item.innerHTML = `<strong>[${e.jar}] ${e.path}</strong>`;
      const tags = document.createElement("div");
      tags.className = "mods-hit-tags";
      e.types.forEach(t => tags.innerHTML += `<span class="mods-tag">${t}</span>`);
      item.appendChild(tags);
      body.appendChild(item);
    });

    section.querySelector("button").onclick = () => {
      const isOpen = body.classList.toggle("is-open");
      section.querySelector(".mods-section-arrow").textContent = isOpen ? "▼" : "▶";
    };
    modsResults.appendChild(section);
  };

  addSection("Опасные", buckets.danger, true);
  addSection("Подозрительные", buckets.suspicious, true);
  addSection("Прочие", buckets.other, false);
}

async function handleModsFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  modsResults.innerHTML = "<p style='padding:10px;'>Анализируем...</p>";
  
  const allFinds = [];
  for (const f of files) {
    allFinds.push(...(await scanBlobForSuspiciousCode(f, f.name)));
  }
  
  let ai = null;
  const apiKey = document.getElementById("gemini-api-key")?.value;
  if (apiKey && allFinds.length) ai = await analyzeWithGemini(allFinds.slice(0, 10));
  renderModsResults(allFinds, ai);
}

if (modsSelectButton && modsFileInput) {
  modsSelectButton.onclick = () => modsFileInput.click();
  modsFileInput.onchange = () => handleModsFiles(modsFileInput.files);
}

if (modsDropArea) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach(e => {
    modsDropArea.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
  });
  modsDropArea.addEventListener("drop", ev => {
    const files = ev.dataTransfer?.files;
    if (files) handleModsFiles(files);
  });
  modsDropArea.addEventListener("click", e => {
    if (e.target !== modsSelectButton) modsFileInput?.click();
  });
}

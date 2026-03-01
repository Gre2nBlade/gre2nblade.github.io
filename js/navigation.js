/**
 * Navigation and Sidebar logic.
 */
const panelConverter = document.getElementById("panel-converter");
const panelSkin = document.getElementById("panel-skin");
const panelMods = document.getElementById("panel-mods");

const sidebar = document.getElementById("sidebar");
const navConverter = document.getElementById("nav-converter");
const navSkin = document.getElementById("nav-skin");
const navMods = document.getElementById("nav-mods");

function getInitialSection() {
  const hash = (location.hash || "").replace("#", "");
  const valid = ["skin", "converter", "mods"];
  if (valid.includes(hash)) return hash;
  const saved = localStorage.getItem("activeSection");
  return valid.includes(saved) ? saved : "converter";
}

function setSection(section, opts = { pushHash: true }) {
  const isConverter = section === "converter";
  const isSkin = section === "skin";
  const isMods = section === "mods";

  panelConverter?.classList.toggle("tab-panel-active", isConverter);
  panelSkin?.classList.toggle("tab-panel-active", isSkin);
  panelMods?.classList.toggle("tab-panel-active", isMods);

  [navConverter, navSkin, navMods].forEach(btn => {
    if (!btn) return;
    btn.classList.toggle("sidebar-active", btn.dataset.section === section);
  });

  localStorage.setItem("activeSection", section);
  if (opts.pushHash) history.replaceState(null, "", "#" + section);

  if (isSkin) window.__openSkinEditor?.();
  window.__skinResize?.();
}

function handleNavClick(section) {
  setSection(section);
}

if (navConverter) navConverter.addEventListener("click", () => handleNavClick("converter"));
if (navSkin) navSkin.addEventListener("click", () => handleNavClick("skin"));
if (navMods) navMods.addEventListener("click", () => handleNavClick("mods"));

if (sidebar) {
  sidebar.addEventListener("click", (e) => {
    if (e.target.closest(".sidebar-item")) return;
    sidebar.classList.add("is-open");
  });
}

document.addEventListener("pointerdown", (ev) => {
  if (sidebar && !sidebar.contains(ev.target)) {
    sidebar.classList.remove("is-open");
  }
});

window.addEventListener("hashchange", () => {
  const hash = (location.hash || "").replace("#", "");
  if (["skin", "converter", "mods"].includes(hash)) setSection(hash, { pushHash: false });
});

// Init
setSection(getInitialSection(), { pushHash: true });

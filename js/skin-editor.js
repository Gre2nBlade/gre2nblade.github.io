/**
 * Skin Editor: 3D Painting logic.
 */
(() => {
  let initialized = false;
  const W = 64, H = 64, OVERLAY_ALPHA = 255;

  const state = {
    tool: "brush", layer: "base", color: "#3c8527", opacity: 255, model: "classic",
    painting: false, lastPaint: null, history: [], historyIndex: -1
  };

  const els = {
    panel: document.getElementById("panel-skin"),
    status: document.getElementById("skin-status"),
    colorHex: document.getElementById("color-hex"),
    colorInput: document.getElementById("color-input"),
    colorChip: document.getElementById("color-chip"),
    palette: document.getElementById("palette"),
    opacityInput: document.getElementById("opacity-input"),
    opacityValue: document.getElementById("opacity-value"),
    importInput: document.getElementById("skin-import"),
    btnImport: document.getElementById("btn-import"),
    btnExport: document.getElementById("btn-export"),
    btnClear: document.getElementById("btn-clear"),
    btnUndo: document.getElementById("btn-undo"),
    btnRedo: document.getElementById("btn-redo"),
    btnLayer: document.getElementById("btn-layer"),
    layerLabel: document.getElementById("layer-label"),
    btnResetView: document.getElementById("btn-reset-view"),
    modelClassic: document.getElementById("model-classic"),
    modelSlim: document.getElementById("model-slim"),
    canvas3d: document.getElementById("skin3d")
  };

  const base = new Uint8ClampedArray(W * H * 4);
  const overlay = new Uint8ClampedArray(W * H * 4);
  base.fill(0);
  overlay.fill(0);

  const idx = (x, y) => (y * W + x) * 4;
  const hexToRgb = hex => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
  };

  function fillDefaultBase() {
    const { r, g, b } = hexToRgb("#c8a070");
    for (let i = 0; i < base.length; i += 4) {
      base[i] = r; base[i + 1] = g; base[i + 2] = b; base[i + 3] = OVERLAY_ALPHA;
    }
  }

  function compositeToImageData() {
    const out = new Uint8ClampedArray(base);
    if (state.layer !== "base") {
      for (let i = 0; i < out.length; i += 4) {
        if (overlay[i + 3] > 0) {
          out[i] = overlay[i]; out[i + 1] = overlay[i + 1];
          out[i + 2] = overlay[i + 2]; out[i + 3] = overlay[i + 3];
        }
      }
    }
    return new ImageData(out, W, H);
  }

  // History
  const pushHistory = () => {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push({
      base: new Uint8ClampedArray(base),
      overlay: new Uint8ClampedArray(overlay),
      layer: state.layer, color: state.color, model: state.model
    });
    state.historyIndex = state.history.length - 1;
    els.btnUndo.disabled = state.historyIndex <= 0;
    els.btnRedo.disabled = false;
  };

  function restore(snap) {
    base.set(snap.base); overlay.set(snap.overlay);
    state.layer = snap.layer; state.color = snap.color; state.model = snap.model;
    els.layerLabel.textContent = state.layer === "base" ? "Base" : "Overlay";
    els.colorInput.value = state.color;
    els.colorChip.style.background = state.color;
    update3D();
  }

  // 3D Engine
  let viewer = null;
  async function update3D() {
    if (!viewer) return;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.getContext("2d").putImageData(compositeToImageData(), 0, 0);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      viewer.loadSkin(url, { model: state.model === "slim" ? "slim" : "default" });
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  function init3D() {
    if (!window.skinview3d) return;
    viewer = new skinview3d.SkinViewer({
      canvas: els.canvas3d,
      width: els.canvas3d.clientWidth || 400,
      height: els.canvas3d.clientHeight || 500,
      skin: null
    });
    viewer.zoom = 0.9;
    window.addEventListener("resize", () => viewer.setSize(els.canvas3d.clientWidth, els.canvas3d.clientHeight));
  }

  function raycastUV(ev) {
    const rect = els.canvas3d.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), viewer.camera);
    const hits = raycaster.intersectObject(viewer.playerObject, true);
    return hits.find(h => h.uv)?.uv || null;
  }

  async function paint(ev, forcedUv) {
    const uv = forcedUv || raycastUV(ev);
    if (!uv) return;
    const px = Math.floor(uv.x * W), py = Math.floor((1 - uv.y) * H);
    if (state.lastPaint?.x === px && state.lastPaint?.y === py) return;
    state.lastPaint = { x: px, y: py };

    const arr = state.layer === "base" ? base : overlay;
    const i = idx(px, py);

    if (state.tool === "picker") {
      if (arr[i+3] === 0) return;
      state.color = "#" + [arr[i], arr[i+1], arr[i+2]].map(v => v.toString(16).padStart(2, "0")).join("");
      els.colorInput.value = state.color;
      els.colorChip.style.background = state.color;
    } else if (state.tool === "eraser") {
      arr[i+3] = 0;
    } else {
      const { r, g, b } = hexToRgb(state.color);
      arr[i] = r; arr[i+1] = g; arr[i+2] = b; arr[i+3] = state.opacity;
    }
    update3D();
  }

  function initEvents() {
    els.canvas3d.oncontextmenu = e => e.preventDefault();
    document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.onclick = () => {
      state.tool = b.dataset.tool;
      document.querySelectorAll(".tool-btn").forEach(x => x.classList.toggle("tool-active", x === b));
    });

    els.btnUndo.onclick = () => state.historyIndex > 0 && restore(state.history[--state.historyIndex]);
    els.btnRedo.onclick = () => state.historyIndex < state.history.length - 1 && restore(state.history[++state.historyIndex]);
    els.btnLayer.onclick = () => {
      state.layer = state.layer === "base" ? "overlay" : "base";
      els.layerLabel.textContent = state.layer === "base" ? "Base" : "Overlay";
      update3D();
    };

    els.canvas3d.onpointerdown = async e => {
      if (e.button !== 0) return;
      const uv = raycastUV(e);
      if (!uv) return;
      state.painting = true;
      viewer.controls.enabled = false;
      pushHistory();
      await paint(e, uv);
    };

    window.onpointerup = () => {
      state.painting = false;
      if (viewer) viewer.controls.enabled = true;
    };

    els.canvas3d.onpointermove = e => state.painting && paint(e);

    els.colorInput.oninput = () => {
      state.color = els.colorInput.value;
      els.colorChip.style.background = state.color;
    };

    els.btnImport.onclick = () => els.importInput.click();
    els.importInput.onchange = async () => {
      const f = els.importInput.files[0];
      if (!f) return;
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await img.decode();
      const c = document.createElement("canvas");
      c.width = 64; c.height = 64;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      base.set(ctx.getImageData(0, 0, 64, 64).data);
      overlay.fill(0);
      pushHistory(); update3D();
    };

    els.btnExport.onclick = () => {
      const c = document.createElement("canvas");
      c.width = 64; c.height = 64;
      c.getContext("2d").putImageData(compositeToImageData(), 0, 0);
      c.toBlob(b => saveAs(b, "skin.png"));
    };
  }

  window.__openSkinEditor = () => {
    if (initialized) return;
    initialized = true;
    fillDefaultBase();
    init3D();
    initEvents();
    pushHistory();
    update3D();
  };
})();

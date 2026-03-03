/**
 * Shared utility functions.
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const Loader = {
  SIZE: 16,
  cells: [],
  order: [],
  grid: null,
  modal: null,

  init() {
    this.grid = document.getElementById("grid");
    this.modal = document.getElementById("loading-modal");
    if (!this.grid) return;

    this.grid.innerHTML = "";
    this.cells = [];
    for (let i = 0; i < this.SIZE * this.SIZE; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      this.grid.appendChild(cell);
      this.cells.push(cell);
    }
    this.order = this.generateOrder(this.SIZE);
  },

  generateOrder(n) {
    const center = Math.floor(n / 2);
    const res = [];
    for (let r = 0; r <= center; r++) {
      const ring = [];
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (Math.max(Math.abs(x - center), Math.abs(y - center)) === r) ring.push(y * n + x);
        }
      }
      // Fisher-Yates shuffle for each ring to give it that "Minecraft" fill feel
      for (let i = ring.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ring[i], ring[j]] = [ring[j], ring[i]];
      }
      res.push(...ring);
    }
    return res;
  },

  setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    const total = this.order.length;
    // Minecraft loading: some cells are gray (about to load), some are green (loaded)
    const grayCount = Math.floor(total * Math.min(1, p + 0.15));
    const greenCount = Math.floor(total * p);

    this.cells.forEach(c => c.className = "cell");
    for (let i = 0; i < grayCount; i++) {
      const idx = this.order[i];
      this.cells[idx].classList.add("gray");
    }
    for (let i = 0; i < greenCount; i++) {
      const idx = this.order[i];
      this.cells[idx].classList.add("green");
    }
  },

  async show() {
    this.modal?.classList.add("is-active");
    this.setProgress(0);
    await sleep(50);
  },

  async hide() {
    this.setProgress(1);
    await sleep(400);
    this.modal?.classList.add("fade-out");
    await sleep(350);
    this.modal?.classList.remove("is-active", "fade-out");
  }
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => Loader.init());

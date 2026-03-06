/**
 * Theme management.
 */
const themeInput = document.getElementById("theme-switch-input");

function applyInitialTheme() {
  const savedTheme = localStorage.getItem("theme");
  let currentTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", currentTheme);
  if (themeInput) themeInput.checked = (currentTheme === "dark");
}

applyInitialTheme();

if (themeInput) {
  themeInput.addEventListener("change", () => {
    const theme = themeInput.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  });
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    const theme = e.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    if (themeInput) themeInput.checked = e.matches;
  }
});

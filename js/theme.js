/**
 * Theme management.
 */
const themeSwitch = document.getElementById("theme-switch");

function applyInitialTheme() {
  const savedTheme = localStorage.getItem("theme");
  let currentTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", currentTheme);
  themeSwitch.classList.toggle("switch-on", currentTheme === "dark");
}

applyInitialTheme();

themeSwitch.addEventListener("click", () => {
  themeSwitch.classList.toggle("switch-on");
  const isDark = themeSwitch.classList.contains("switch-on");
  const theme = isDark ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    const theme = e.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    themeSwitch.classList.toggle("switch-on", e.matches);
  }
});

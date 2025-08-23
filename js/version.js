// js/version.js
const APP_VERSION = "v3.0 Nexus";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".version-badge, #appVersion").forEach(el => {
    el.textContent = APP_VERSION;

    
  });
});


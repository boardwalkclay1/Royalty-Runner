document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("rr-menu-btn");
  const panel = document.getElementById("rr-menu-panel");

  btn.addEventListener("click", () => {
    panel.classList.toggle("show");
  });

  panel.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      panel.classList.remove("show");
    });
  });
});

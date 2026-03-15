// assets/js/works-mixer.js
// Royalty Runner – External Mixer Import + Works Catalog

window.RRWorksMixer = (function () {

  function init() {
    setupImportForm();
    renderWorksList();
  }

  function setupImportForm() {
    const form = document.getElementById("mixer-import-form");
    const fileInput = document.getElementById("mixer-files");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const role = form.elements["role"].value;
      const notes = form.elements["notes"].value.trim();
      const files = fileInput.files;

      if (!files.length) {
        alert("Upload at least one audio file.");
        return;
      }

      for (let file of files) {
        const work = {
          id: "work_" + Date.now() + "_" + Math.random().toString(16).slice(2),
          title: file.name.replace(/\.[^/.]+$/, ""), // filename without extension
          role,
          notes,
          createdAt: Date.now(),
          audioBlob: file,
          progress: {
            pro_registered: false,
            mechanical_registered: false,
            copyright_registered: false,
            neighboring_registered: false,
            split_sheet: false
          },
          studioState: {}
        };

        await RRDB.saveWork(work);
      }

      form.reset();
      renderWorksList();
      alert("Your mixes have been saved to your Works catalog.");
    });
  }

  function renderWorksList() {
    RRDB.getAllWorks().then((works) => {
      const list = document.getElementById("works-list");
      list.innerHTML = "";

      works
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        .forEach((work) => {
          const div = document.createElement("div");
          div.className = "work-card";
          div.dataset.id = work.id;

          const audioUrl = work.audioBlob
            ? URL.createObjectURL(work.audioBlob)
            : "";

          div.innerHTML = `
            <h3>${work.title}</h3>
            <p>${work.role || ""}</p>
            ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : ""}

            <button class="bubble-btn" data-action="edit">Open in Studio</button>
            <button class="bubble-btn" data-action="delete" style="background:#400;color:#fff;">Delete</button>
          `;

          list.appendChild(div);
        });

      list.addEventListener("click", handleListClick);
    });
  }

  function handleListClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.closest(".work-card").dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") {
      location.href = `works.html?id=${id}`;
    }

    if (action === "delete") {
      if (!confirm("Delete this work?")) return;
      RRDB.deleteWork(id).then(renderWorksList);
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
  RRWorksMixer.init();
});

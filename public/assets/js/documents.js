// DOCUMENTS VAULT ENGINE — IndexedDB + File Storage

document.addEventListener("DOMContentLoaded", () => {

  const uploadInput = document.getElementById("doc-upload");
  const saveBtn = document.getElementById("save-docs");
  const listEl = document.getElementById("documents-list");

  // Ensure DB exists
  if (!window.dbGet || !window.dbSet || !window.dbDelete) {
    console.error("IndexedDB helpers missing");
    return;
  }

  // SAVE DOCUMENTS
  saveBtn.addEventListener("click", async () => {
    const files = uploadInput.files;
    if (!files.length) {
      alert("Upload at least one file");
      return;
    }

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();

      await window.dbSet("documents", file.name, {
        name: file.name,
        type: file.type,
        size: file.size,
        data: arrayBuffer,
        savedAt: new Date().toISOString()
      });
    }

    uploadInput.value = "";
    loadDocuments();
  });

  // LOAD DOCUMENTS
  async function loadDocuments() {
    const docs = await window.dbGetAll("documents");
    listEl.innerHTML = "";

    docs.forEach(doc => {
      const card = document.createElement("div");
      card.className = "doc-card";

      card.innerHTML = `
        <strong>${doc.name}</strong><br/>
        <small>${(doc.size / 1024).toFixed(1)} KB</small><br/><br/>

        <button class="bubble-btn" data-name="${doc.name}" data-action="download">Download</button>
        <button class="bubble-btn" data-name="${doc.name}" data-action="delete">Delete</button>
      `;

      listEl.appendChild(card);
    });

    hookButtons();
  }

  // BUTTON ACTIONS
  function hookButtons() {
    document.querySelectorAll(".bubble-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const name = btn.dataset.name;
        const action = btn.dataset.action;

        if (action === "delete") {
          await window.dbDelete("documents", name);
          loadDocuments();
        }

        if (action === "download") {
          const doc = await window.dbGet("documents", name);
          const blob = new Blob([doc.data], { type: doc.type });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = doc.name;
          a.click();

          URL.revokeObjectURL(url);
        }
      });
    });
  }

  loadDocuments();
});

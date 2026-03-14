// Royalty Runner – Document Vault (IndexedDB Storage)

const DOC_DB = "royaltyRunnerDocs";
const DOC_VERSION = 1;
const DOC_STORE = "documents";

let docDB = null;

function openDocDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DOC_DB, DOC_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DOC_STORE)) {
        const store = db.createObjectStore(DOC_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("category", "category", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      docDB = event.target.result;
      resolve(docDB);
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

function saveDocument(doc) {
  return new Promise((resolve, reject) => {
    const tx = docDB.transaction(DOC_STORE, "readwrite");
    const store = tx.objectStore(DOC_STORE);
    const req = store.add(doc);

    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllDocuments() {
  return new Promise((resolve, reject) => {
    const tx = docDB.transaction(DOC_STORE, "readonly");
    const store = tx.objectStore(DOC_STORE);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

function renderDocuments(docs) {
  const container = document.getElementById("doc-list");
  container.innerHTML = "";

  if (!docs.length) {
    container.innerHTML = "<p>No documents saved yet.</p>";
    return;
  }

  docs.forEach((doc) => {
    const div = document.createElement("div");
    div.className = "rr-list-item";

    div.innerHTML = `
      <strong>${doc.name}</strong><br/>
      Category: ${doc.category}<br/>
      Uploaded: ${new Date(doc.createdAt).toLocaleString()}<br/><br/>
      <button class="button-secondary" data-id="${doc.id}">Download</button>
    `;

    container.appendChild(div);
  });

  // Download handlers
  document.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const doc = docs.find((d) => d.id === id);
      if (!doc) return;

      const blob = new Blob([doc.fileData], { type: doc.fileType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      a.click();

      URL.revokeObjectURL(url);
    });
  });
}

function setupDocForm() {
  const form = document.getElementById("doc-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("doc-name").value.trim();
    const category = document.getElementById("doc-category").value;
    const fileInput = document.getElementById("doc-file");
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select a file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const doc = {
        name,
        category,
        fileName: file.name,
        fileType: file.type,
        fileData: reader.result,
        createdAt: new Date().toISOString(),
      };

      await saveDocument(doc);
      form.reset();

      const docs = await getAllDocuments();
      renderDocuments(docs);
    };

    reader.readAsArrayBuffer(file);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await openDocDB();
  setupDocForm();
  const docs = await getAllDocuments();
  renderDocuments(docs);
});

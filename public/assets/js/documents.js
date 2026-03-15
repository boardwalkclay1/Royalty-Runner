// Royalty Runner – Documents Vault Engine
// IndexedDB Setup
let db;
const request = indexedDB.open("RoyaltyRunnerDB", 3);

request.onupgradeneeded = (e) => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("documents")) {
    const store = db.createObjectStore("documents", { keyPath: "id", autoIncrement: true });
    store.createIndex("name", "name", { unique: false });
    store.createIndex("type", "type", { unique: false });
    store.createIndex("date", "date", { unique: false });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  loadDocuments();
};

request.onerror = () => {
  console.error("IndexedDB failed to load.");
};

// Save Uploaded Files
document.getElementById("save-docs").addEventListener("click", () => {
  const files = document.getElementById("doc-upload").files;
  if (!files.length) return alert("Upload a file first.");

  [...files].forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      saveDocument({
        name: file.name,
        type: detectType(file.name),
        content: reader.result,
        date: new Date().toLocaleString(),
        source: "Upload"
      });
    };
    reader.readAsDataURL(file);
  });

  alert("Saved to Documents Vault.");
  loadDocuments();
});

// Detect Document Type
function detectType(name) {
  name = name.toLowerCase();
  if (name.includes("split")) return "Split Sheet";
  if (name.includes("producer")) return "Producer Agreement";
  if (name.includes("record")) return "Recording Agreement";
  if (name.includes("manage")) return "Management Agreement";
  if (name.includes("public")) return "Publicist Agreement";
  if (name.includes("hire")) return "Work for Hire";
  if (name.includes("sync")) return "Sync License";
  return "General Document";
}

// Save Document to IndexedDB
function saveDocument(doc) {
  const tx = db.transaction("documents", "readwrite");
  tx.objectStore("documents").add(doc);
}

// Load Documents
function loadDocuments() {
  const list = document.getElementById("documents-list");
  list.innerHTML = "";

  const tx = db.transaction("documents", "readonly");
  const store = tx.objectStore("documents");

  store.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (!cursor) return;

    const doc = cursor.value;

    const card = document.createElement("div");
    card.className = "doc-card";

    card.innerHTML = `
      <h4>${doc.name}</h4>
      <div class="doc-meta">${doc.type} • Saved ${doc.date}</div>
      <button class="bubble-btn" onclick="previewDoc(${doc.id})">Open</button>
      <button class="bubble-btn" onclick="deleteDoc(${doc.id})" style="background:#922;">Delete</button>
    `;

    list.appendChild(card);
    cursor.continue();
  };
}

// Preview Modal
function previewDoc(id) {
  const tx = db.transaction("documents", "readonly");
  const store = tx.objectStore("documents");

  store.get(id).onsuccess = (e) => {
    const doc = e.target.result;

    document.getElementById("doc-modal-title").textContent = doc.name;
    document.getElementById("doc-modal-body").textContent = doc.content;

    document.getElementById("doc-modal").style.display = "flex";
  };
}

document.getElementById("doc-modal-close").addEventListener("click", () => {
  document.getElementById("doc-modal").style.display = "none";
});

// Delete Document
function deleteDoc(id) {
  const tx = db.transaction("documents", "readwrite");
  tx.objectStore("documents").delete(id);

  tx.oncomplete = () => loadDocuments();
}

// Search
document.getElementById("doc-search").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const cards = document.querySelectorAll(".doc-card");

  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(term) ? "block" : "none";
  });
});

// Receive Contracts from Contracts Page
window.addEventListener("message", (event) => {
  if (!event.data || !event.data.contractText) return;

  const doc = {
    name: event.data.name || "Contract Draft",
    type: event.data.type || "Contract",
    content: event.data.contractText,
    date: new Date().toLocaleString(),
    source: "Contracts Page"
  };

  saveDocument(doc);
  loadDocuments();
});

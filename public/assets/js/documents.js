// Royalty Runner – Documents Vault Engine (v2)
let db;
const DB_NAME = "RoyaltyRunnerDB";
const DB_VERSION = 5;
const STORE_NAME = "documents";

const request = indexedDB.open(DB_NAME, DB_VERSION);

// UPGRADE DB
request.onupgradeneeded = (e) => {
  db = e.target.result;

  let store;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  } else {
    store = e.target.transaction.objectStore(STORE_NAME);
  }

  if (!store.indexNames.contains("name"))   store.createIndex("name", "name", { unique: false });
  if (!store.indexNames.contains("type"))   store.createIndex("type", "type", { unique: false });
  if (!store.indexNames.contains("folder")) store.createIndex("folder", "folder", { unique: false });
  if (!store.indexNames.contains("date"))   store.createIndex("date", "date", { unique: false });
};

request.onsuccess = (e) => {
  db = e.target.result;
  wireUI();
  loadDocuments();
};

request.onerror = () => console.error("IndexedDB failed.");

// ---------- CORE HELPERS ----------

function saveDocument(doc) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add(doc);
}

function updateDocument(doc) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(doc);
}

function getDocument(id, cb) {
  const tx = db.transaction(STORE_NAME, "readonly");
  tx.objectStore(STORE_NAME).get(id).onsuccess = (e) => cb(e.target.result);
}

function detectType(name) {
  const lower = name.toLowerCase();
  if (lower.includes("split"))    return "Split Sheet";
  if (lower.includes("producer")) return "Producer Agreement";
  if (lower.includes("record"))   return "Recording Agreement";
  if (lower.includes("manage"))   return "Management Agreement";
  if (lower.includes("public"))   return "Publicist Agreement";
  if (lower.includes("hire"))     return "Work for Hire";
  if (lower.includes("sync"))     return "Sync License";
  return "General Document";
}

function isTextLike(mimeOrName) {
  if (!mimeOrName) return false;
  const lower = mimeOrName.toLowerCase();
  return (
    lower.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".json")
  );
}

// ---------- UI WIRING ----------

function wireUI() {
  const saveBtn      = document.getElementById("save-docs");
  const uploadInput  = document.getElementById("doc-upload");
  const folderFilter = document.getElementById("folder-filter");
  const searchInput  = document.getElementById("doc-search");
  const modal        = document.getElementById("doc-modal");
  const modalClose   = document.getElementById("doc-modal-close");

  // Save uploaded files
  saveBtn.addEventListener("click", () => {
    const files = uploadInput.files;
    if (!files.length) {
      alert("Upload a file first.");
      return;
    }

    [...files].forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const now = new Date();
        const doc = {
          name: file.name,
          type: detectType(file.name),
          folder: "Uploads",
          content: reader.result,          // Data URL
          mime: file.type || "",
          date: now.toLocaleString(),
          timestamp: now.getTime(),
          tags: ["upload"]
        };
        saveDocument(doc);
      };
      reader.readAsDataURL(file);
    });

    alert("Saved to Documents Vault.");
    uploadInput.value = "";
    loadDocuments();
  });

  // Folder filter
  folderFilter.addEventListener("change", loadDocuments);

  // Search
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll(".doc-card");
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(term) ? "block" : "none";
    });
  });

  // Modal close
  modalClose.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Click outside modal content to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
}

// ---------- LOAD & RENDER ----------

function loadDocuments() {
  const list = document.getElementById("documents-list");
  const folderFilter = document.getElementById("folder-filter").value;

  list.innerHTML = "";

  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  const docs = [];
  store.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (!cursor) {
      // sort newest first
      docs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      docs.forEach(renderDocCard);
      return;
    }

    const doc = cursor.value;
    if (folderFilter !== "all" && doc.folder !== folderFilter) {
      cursor.continue();
      return;
    }

    docs.push(doc);
    cursor.continue();
  };
}

function renderDocCard(doc) {
  const list = document.getElementById("documents-list");

  const card = document.createElement("div");
  card.className = "doc-card";

  const tags = (doc.tags || []).map(t => `<span class="tag">${t}</span>`).join("");

  const signedLabel = (doc.tags || []).includes("signed") ? " (Signed)" : "";

  card.innerHTML = `
    <h4>${doc.name}${signedLabel}</h4>
    <div class="doc-meta">${doc.type} • ${doc.folder} • ${doc.date}</div>
    ${tags}
    <div style="margin-top:0.5rem;">
      <button class="bubble-btn" data-action="open" data-id="${doc.id}">Open</button>
      <button class="bubble-btn" data-action="email" data-id="${doc.id}">Email</button>
      <button class="bubble-btn" data-action="print" data-id="${doc.id}">Print</button>
      <button class="bubble-btn" data-action="signed" data-id="${doc.id}" style="background:#0b7;">Mark Signed</button>
      <button class="bubble-btn" data-action="delete" data-id="${doc.id}" style="background:#922;">Delete</button>
    </div>
  `;

  card.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = Number(btn.getAttribute("data-id"));
    const action = btn.getAttribute("data-action");

    if (action === "open")   previewDoc(id);
    if (action === "delete") deleteDoc(id);
    if (action === "email")  emailDoc(id);
    if (action === "print")  printDoc(id);
    if (action === "signed") markSigned(id);
  });

  list.appendChild(card);
}

// ---------- PREVIEW / EMAIL / PRINT / SIGN ----------

function previewDoc(id) {
  getDocument(id, (doc) => {
    if (!doc) return;

    const modal      = document.getElementById("doc-modal");
    const titleEl    = document.getElementById("doc-modal-title");
    const bodyEl     = document.getElementById("doc-modal-body");

    titleEl.textContent = doc.name;

    // If it's a text-like Data URL, show decoded text; otherwise show a note
    if (typeof doc.content === "string" && doc.content.startsWith("data:")) {
      const commaIndex = doc.content.indexOf(",");
      const meta = doc.content.substring(5, commaIndex); // e.g. text/plain;base64
      const base64 = doc.content.substring(commaIndex + 1);

      if (isTextLike(meta)) {
        try {
          const decoded = atob(base64);
          bodyEl.textContent = decoded;
        } catch {
          bodyEl.textContent = "[Unable to decode text content]";
        }
      } else {
        bodyEl.textContent = "[Binary file – use Email or Print or download from your browser's save dialog.]";
      }
    } else {
      bodyEl.textContent = doc.content || "";
    }

    modal.style.display = "flex";
  });
}

function emailDoc(id) {
  getDocument(id, (doc) => {
    if (!doc) return;

    let body = "";

    if (typeof doc.content === "string" && doc.content.startsWith("data:")) {
      const commaIndex = doc.content.indexOf(",");
      const meta = doc.content.substring(5, commaIndex);
      const base64 = doc.content.substring(commaIndex + 1);

      if (isTextLike(meta)) {
        try {
          body = atob(base64);
        } catch {
          body = "[Attached as Data URL – copy/paste into a document if needed.]";
        }
      } else {
        body = "[This document is a binary file (PDF/IMG/etc.). Attach the original file from your device.]";
      }
    } else {
      body = doc.content || "";
    }

    const subject = encodeURIComponent(doc.name || "Document");
    const mailBody = encodeURIComponent(body);

    window.location.href = `mailto:?subject=${subject}&body=${mailBody}`;
  });
}

function printDoc(id) {
  getDocument(id, (doc) => {
    if (!doc) return;

    let printable = "";

    if (typeof doc.content === "string" && doc.content.startsWith("data:")) {
      const commaIndex = doc.content.indexOf(",");
      const meta = doc.content.substring(5, commaIndex);
      const base64 = doc.content.substring(commaIndex + 1);

      if (isTextLike(meta)) {
        try {
          printable = atob(base64);
        } catch {
          printable = "[Unable to decode text content]";
        }
      } else {
        printable = "[Binary file – print from your system viewer after downloading.]";
      }
    } else {
      printable = doc.content || "";
    }

    const title = doc.name || "Document";

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            white-space: pre-wrap;
            padding: 2rem;
          }
          h1 {
            text-align: center;
            margin-bottom: 1.5rem;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${printable.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  });
}

function markSigned(id) {
  getDocument(id, (doc) => {
    if (!doc) return;
    doc.tags = doc.tags || [];
    if (!doc.tags.includes("signed")) {
      doc.tags.push("signed");
      updateDocument(doc);
      loadDocuments();
    }
  });
}

// ---------- DELETE ----------

function deleteDoc(id) {
  if (!confirm("Delete this document from your Documents Vault?")) return;

  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  tx.oncomplete = () => loadDocuments();
}

// ---------- RECEIVE CONTRACTS FROM CONTRACTS PAGE ----------

window.addEventListener("message", (event) => {
  if (!event.data || !event.data.contractText) return;

  const now = new Date();
  const doc = {
    name: event.data.name || "Contract Draft",
    type: event.data.type || "Contract",
    folder: "Contracts",
    content: event.data.contractText, // plain text from Contracts page
    mime: "text/plain",
    date: now.toLocaleString(),
    timestamp: now.getTime(),
    tags: ["contract", event.data.type || "Contract"]
  };

  saveDocument(doc);
  loadDocuments();
});

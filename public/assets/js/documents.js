// Replace these functions in your documents.js (use Promise-based RRDB API and consistent callers)

// ---------- CORE HELPERS (via RRDB) ----------
function saveDocument(doc) {
  return window.RRDB.addToStore(DOC_STORE, doc);
}
function updateDocument(doc) {
  return window.RRDB.saveToStore(DOC_STORE, doc);
}
function getDocument(id) {
  return window.RRDB.getFromStore(DOC_STORE, id); // returns Promise
}
function deleteDocRecord(id) {
  return window.RRDB.deleteFromStore(DOC_STORE, id);
}

// ---------- PREVIEW / EMAIL / PRINT / SIGN (Promise-based) ----------
function previewDoc(id) {
  getDocument(id).then(doc => {
    if (!doc) return;
    const modal      = document.getElementById("doc-modal");
    const titleEl    = document.getElementById("doc-modal-title");
    const bodyEl     = document.getElementById("doc-modal-body");

    titleEl.textContent = doc.name;

    if (typeof doc.content === "string" && doc.content.startsWith("data:")) {
      const commaIndex = doc.content.indexOf(",");
      const meta = doc.content.substring(5, commaIndex);
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
  }).catch(err => console.error('previewDoc error', err));
}

function emailDoc(id) {
  getDocument(id).then(doc => {
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
  }).catch(err => console.error('emailDoc error', err));
}

function printDoc(id) {
  getDocument(id).then(doc => {
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
    if (!win) return alert("Popup blocked. Allow popups to print.");

    const safePrintable = String(printable).replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
          h1 { text-align: center; margin-bottom: 1.5rem; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${safePrintable}</pre>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    // small delay to ensure content loads before print
    setTimeout(() => win.print(), 250);
  }).catch(err => console.error('printDoc error', err));
}

function markSigned(id) {
  getDocument(id).then(doc => {
    if (!doc) return;
    doc.tags = doc.tags || [];
    if (!doc.tags.includes("signed")) {
      doc.tags.push("signed");
      updateDocument(doc).then(() => loadDocuments()).catch(err => console.error(err));
    }
  }).catch(err => console.error('markSigned error', err));
}

// ---------- DELETE ----------
function deleteDoc(id) {
  if (!confirm("Delete this document from your Documents Vault?")) return;
  deleteDocRecord(id).then(() => loadDocuments()).catch(err => console.error('deleteDoc error', err));
}

// ---------- LOAD & RENDER (use RRDB helper) ----------
function loadDocuments() {
  const list = document.getElementById("documents-list");
  const folderFilter = document.getElementById("folder-filter").value;
  list.innerHTML = "";

  window.RRDB.getAllFromStore(DOC_STORE).then(allDocs => {
    const docs = allDocs
      .filter(doc => folderFilter === "all" ? true : doc.folder === folderFilter)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    docs.forEach(renderDocCard);
  }).catch(err => {
    console.error('loadDocuments error', err);
    list.innerHTML = `<p style="opacity:0.7;">Unable to load documents.</p>`;
  });
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  window.RRDB.openDB().then(() => {
    wireUI();
    loadDocuments();
  }).catch(err => console.error('RRDB open error', err));
});

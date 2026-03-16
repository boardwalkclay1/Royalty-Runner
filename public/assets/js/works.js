// assets/js/works.js

const DB_NAME = "rrWorksDB";
const DB_VERSION = 1;
let db = null;

// ---------- IndexedDB BOOTSTRAP ----------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("songs")) {
        const store = db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("memos")) {
        const store = db.createObjectStore("memos", { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("journal")) {
        const store = db.createObjectStore("journal", { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

// ---------- SONGS ----------
async function saveSongs(files, defaults) {
  if (!files || !files.length) return;

  const store = tx("songs", "readwrite");

  await Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const blob = new Blob([reader.result], { type: file.type || "audio/*" });
            const record = {
              name: file.name,
              size: file.size,
              type: file.type,
              role: defaults.role,
              project: defaults.project,
              notes: defaults.notes,
              createdAt: new Date().toISOString(),
              blob
            };
            const req = store.add(record);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        })
    )
  );
}

function listSongs() {
  return new Promise((resolve, reject) => {
    const store = tx("songs", "readonly");
    const req = store.index("createdAt").openCursor(null, "prev");
    const results = [];

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    req.onerror = () => reject(req.error);
  });
}

function renderSongs(list) {
  const container = document.getElementById("works-list");
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = `<p class="small-note">No songs saved yet. Upload finished audio to start your catalog.</p>`;
    return;
  }

  list.forEach((song) => {
    const card = document.createElement("div");
    card.className = "work-card";

    const created = new Date(song.createdAt).toLocaleString();

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
        <div>
          <strong>${song.name}</strong><br/>
          <span class="small-note">${(song.size / (1024 * 1024)).toFixed(2)} MB • ${song.type || "audio"}</span>
        </div>
        <div style="text-align:right;">
          <span class="small-note">${song.role || ""}${song.project ? " • " + song.project : ""}</span><br/>
          <span class="small-note">${created}</span>
        </div>
      </div>
      ${song.notes ? `<p class="small-note" style="margin-top:0.4rem;">${song.notes}</p>` : ""}
      <audio controls></audio>
    `;

    const audioEl = card.querySelector("audio");
    const blobUrl = URL.createObjectURL(song.blob);
    audioEl.src = blobUrl;

    container.appendChild(card);
  });
}

// ---------- MEMOS ----------
let mediaRecorder = null;
let memoChunks = [];
let memoBlob = null;

function setupMemoRecorder() {
  const recordBtn = document.getElementById("memo-record-btn");
  const stopBtn = document.getElementById("memo-stop-btn");
  const saveBtn = document.getElementById("memo-save-btn");
  const statusEl = document.getElementById("memo-status");
  const preview = document.getElementById("memo-preview");

  recordBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      memoChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) memoChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        memoBlob = new Blob(memoChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(memoBlob);
        preview.src = url;
        preview.style.display = "block";
        saveBtn.disabled = false;
        statusEl.textContent = "Recording ready to save.";
      };

      mediaRecorder.start();
      statusEl.textContent = "Recording…";
      recordBtn.disabled = true;
      stopBtn.disabled = false;
      saveBtn.disabled = true;
    } catch (err) {
      statusEl.textContent = "Microphone access denied or unavailable.";
    }
  });

  stopBtn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      stopBtn.disabled = true;
      recordBtn.disabled = false;
    }
  });

  saveBtn.addEventListener("click", async () => {
    const titleInput = document.getElementById("memo-title");
    const title = titleInput.value.trim() || "Untitled memo";

    if (!memoBlob) {
      statusEl.textContent = "No recording to save.";
      return;
    }

    const store = tx("memos", "readwrite");
    await new Promise((resolve, reject) => {
      const record = {
        title,
        createdAt: new Date().toISOString(),
        blob: memoBlob
      };
      const req = store.add(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    statusEl.textContent = "Memo saved.";
    titleInput.value = "";
    memoBlob = null;
    preview.style.display = "none";
    preview.src = "";
    saveBtn.disabled = true;

    const memos = await listMemos();
    renderMemos(memos);
  });
}

function listMemos() {
  return new Promise((resolve, reject) => {
    const store = tx("memos", "readonly");
    const req = store.index("createdAt").openCursor(null, "prev");
    const results = [];

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    req.onerror = () => reject(req.error);
  });
}

function renderMemos(list) {
  const container = document.getElementById("memo-list");
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = `<p class="small-note">No memos saved yet. Record a quick idea and save it.</p>`;
    return;
  }

  list.forEach((memo) => {
    const div = document.createElement("div");
    div.className = "work-card";

    const created = new Date(memo.createdAt).toLocaleString();

    div.innerHTML = `
      <strong>${memo.title}</strong><br/>
      <span class="small-note">${created}</span>
      <audio controls></audio>
    `;

    const audioEl = div.querySelector("audio");
    const url = URL.createObjectURL(memo.blob);
    audioEl.src = url;

    container.appendChild(div);
  });
}

// ---------- JOURNAL ----------
const JOURNAL_DRAFT_KEY = "rr_journal_draft";

function loadJournalDraft() {
  const draftRaw = localStorage.getItem(JOURNAL_DRAFT_KEY);
  if (!draftRaw) return;

  try {
    const draft = JSON.parse(draftRaw);
    document.getElementById("journal-title").value = draft.title || "";
    document.getElementById("journal-body").value = draft.body || "";
  } catch {
    // ignore
  }
}

function saveJournalDraft() {
  const title = document.getElementById("journal-title").value;
  const body = document.getElementById("journal-body").value;
  const draft = { title, body, updatedAt: new Date().toISOString() };
  localStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify(draft));
}

function setupJournal() {
  const titleEl = document.getElementById("journal-title");
  const bodyEl = document.getElementById("journal-body");
  const statusEl = document.getElementById("journal-status");
  const saveBtn = document.getElementById("journal-save-entry");
  const clearBtn = document.getElementById("journal-clear-draft");

  loadJournalDraft();

  let saveTimeout = null;
  function scheduleDraftSave() {
    statusEl.textContent = "Draft auto‑saving…";
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveJournalDraft();
      statusEl.textContent = "Draft saved.";
    }, 500);
  }

  titleEl.addEventListener("input", scheduleDraftSave);
  bodyEl.addEventListener("input", scheduleDraftSave);

  clearBtn.addEventListener("click", () => {
    titleEl.value = "";
    bodyEl.value = "";
    localStorage.removeItem(JOURNAL_DRAFT_KEY);
    statusEl.textContent = "Draft cleared.";
  });

  saveBtn.addEventListener("click", async () => {
    const title = titleEl.value.trim() || "Untitled entry";
    const body = bodyEl.value.trim();
    if (!body) {
      statusEl.textContent = "Write something before saving.";
      return;
    }

    const store = tx("journal", "readwrite");
    await new Promise((resolve, reject) => {
      const record = {
        title,
        body,
        createdAt: new Date().toISOString()
      };
      const req = store.add(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    statusEl.textContent = "Entry saved.";
    const entries = await listJournalEntries();
    renderJournalEntries(entries);
  });
}

function listJournalEntries() {
  return new Promise((resolve, reject) => {
    const store = tx("journal", "readonly");
    const req = store.index("createdAt").openCursor(null, "prev");
    const results = [];

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    req.onerror = () => reject(req.error);
  });
}

function renderJournalEntries(list) {
  const container = document.getElementById("journal-entries");
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = `<p class="small-note">No journal entries saved yet. Start writing and save snapshots.</p>`;
    return;
  }

  list.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "journal-entry";

    const created = new Date(entry.createdAt).toLocaleString();

    div.innerHTML = `
      <div class="journal-entry-title">${entry.title}</div>
      <div class="journal-entry-meta">${created}</div>
    `;

    div.addEventListener("click", () => {
      document.getElementById("journal-title").value = entry.title;
      document.getElementById("journal-body").value = entry.body;
      saveJournalDraft();
      document.getElementById("journal-status").textContent = "Loaded entry into editor.";
    });

    container.appendChild(div);
  });
}

// ---------- SONG FORM WIRING ----------
function setupSongForm() {
  const form = document.getElementById("song-upload-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = document.getElementById("song-files").files;
    if (!files.length) return;

    const defaults = {
      role: document.getElementById("song-default-role").value,
      project: document.getElementById("song-default-project").value.trim(),
      notes: document.getElementById("song-default-notes").value.trim()
    };

    await saveSongs(files, defaults);
    const songs = await listSongs();
    renderSongs(songs);

    form.reset();
  });
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", async () => {
  await openDB();

  // Songs
  setupSongForm();
  const songs = await listSongs();
  renderSongs(songs);

  // Memos
  setupMemoRecorder();
  const memos = await listMemos();
  renderMemos(memos);

  // Journal
  setupJournal();
  const entries = await listJournalEntries();
  renderJournalEntries(entries);
});

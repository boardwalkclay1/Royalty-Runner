/* manage-calendar.js
   Robust calendar manager (creates/uses RoyaltyRunnerDB / store "calendar")
   - Prefers window.RRDB when present
   - Falls back to IndexedDB with proper onupgradeneeded
   - Guards DOM lookups and errors
*/

const DB_NAME = "RoyaltyRunnerDB";
const STORE = "calendar";
const DB_VERSION = 5;

let db = null;

/* ---------- Init DB (fallback if window.RRDB not present) ---------- */
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        s.createIndex("by_date", "date", { unique: false });
        s.createIndex("by_type", "type", { unique: false });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

/* ---------- Helper: ensure store exists (tries RRDB first) ---------- */
function ensureDBReady() {
  if (window.RRDB && typeof window.RRDB.openDB === "function") {
    return window.RRDB.openDB();
  }
  return initIndexedDB();
}

/* ---------- Store accessor for fallback IndexedDB usage ---------- */
function store(mode = "readonly") {
  if (!db) throw new Error("DB not initialized");
  return db.transaction(STORE, mode).objectStore(STORE);
}

/* ---------- Data access (prefers RRDB API) ---------- */
function getEvents() {
  if (window.RRDB && typeof window.RRDB.getAllFromStore === "function") {
    return window.RRDB.getAllFromStore(STORE).then(list => list || []).catch(() => []);
  }

  return new Promise((resolve, reject) => {
    try {
      const out = [];
      const req = store().openCursor();
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur) return resolve(out);
        out.push(cur.value);
        cur.continue();
      };
      req.onerror = (e) => resolve(out);
    } catch (err) {
      resolve([]);
    }
  });
}

function deleteEvent(id) {
  if (window.RRDB && typeof window.RRDB.deleteFromStore === "function") {
    return window.RRDB.deleteFromStore(STORE, id);
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/* ---------- Date helpers ---------- */
const ymd = d => new Date(d).toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => a.toDateString() === b.toDateString();

/* ---------- State ---------- */
let weekStart = (() => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d;
})();

/* ---------- Mini calendar (6 days) ---------- */
async function renderMini() {
  try {
    const daysEl = document.getElementById("mini-calendar-days");
    const labelEl = document.getElementById("mini-week-label");
    if (!daysEl || !labelEl) return;

    const events = await getEvents();
    daysEl.innerHTML = "";
    labelEl.textContent = `${weekStart.toLocaleDateString()} – ${addDays(weekStart, 5).toLocaleDateString()}`;

    for (let i = 0; i < 6; i++) {
      const d = addDays(weekStart, i);
      const dateKey = ymd(d);
      const count = (events || []).filter(e => String(e.date) === dateKey).length;

      const cell = document.createElement("div");
      cell.className = "mini-day";
      if (sameDay(d, new Date())) cell.classList.add("today");

      const dots = count ? "●".repeat(Math.min(count, 6)) : "";
      cell.innerHTML = '<div class="mini-date">' + String(d.getDate()) + '</div>' +
                       '<div class="mini-dots">' + dots + '</div>';

      cell.addEventListener("click", () => { window.location.href = "calendar.html"; });
      daysEl.appendChild(cell);
    }
  } catch (err) {
    console.error("renderMini error", err);
  }
}

/* ---------- Reminders list ---------- */
async function renderReminders() {
  try {
    const list = document.getElementById("reminders-list");
    if (!list) return;

    const events = await getEvents();
    const upcoming = (events || [])
      .filter(e => e.reminder)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (!upcoming.length) {
      list.innerHTML = `<p style="opacity:0.7;">No reminders.</p>`;
      return;
    }

    list.innerHTML = upcoming.map(ev => {
      const title = ev.title || "";
      const date = ev.date || "";
      return '<div class="agenda-item"><div class="agenda-main">' +
             '<div class="agenda-title">' + escapeHtml(title) + '</div>' +
             '<div class="agenda-meta">' + escapeHtml(date) + '</div>' +
             '</div></div>';
    }).join("");
  } catch (err) {
    console.error("renderReminders error", err);
  }
}

/* ---------- Navigation wiring ---------- */
function wireMiniNav() {
  const prev = document.getElementById("mini-prev-week");
  const next = document.getElementById("mini-next-week");
  if (prev) prev.addEventListener("click", () => { weekStart = addDays(weekStart, -7); renderMini(); });
  if (next) next.addEventListener("click", () => { weekStart = addDays(weekStart, 7); renderMini(); });
}

/* ---------- Utility ---------- */
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

/* ---------- Init (wait DOM + DB) ---------- */
document.addEventListener("DOMContentLoaded", () => {
  ensureDBReady()
    .then(() => {
      // If we used the fallback IndexedDB init, ensure db variable is set
      if (!db && window.indexedDB) {
        // try to open local handle if RRDB not used
        return initIndexedDB();
      }
      return Promise.resolve();
    })
    .then(() => {
      wireMiniNav();
      renderMini();
      renderReminders();
    })
    .catch(err => {
      console.error("Calendar DB init failed", err);
      // show graceful UI fallback
      const days = document.getElementById("mini-calendar-days");
      if (days) days.innerHTML = '<div style="opacity:.6;">Calendar unavailable</div>';
      const reminders = document.getElementById("reminders-list");
      if (reminders) reminders.innerHTML = '<p style="opacity:.6;">Reminders unavailable</p>';
    });
});

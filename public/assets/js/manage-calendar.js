/* ============================================================
   ROYALTY RUNNER – MANAGE CALENDAR ENGINE (SYNCED WITH db.js)
   Fixed: DOM readiness guards, error handling, safe init flow
   ============================================================ */

/* ===== DB CONFIG ===== */
const DB_NAME = "RoyaltyRunnerDB";
const STORE = "calendar";
const DB_VERSION = 5;
let db = null;

/* ===== INIT DB ===== */
function initDB() {
  return new Promise((res, rej) => {
    if (db) return res();
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const dbu = e.target.result;
      if (!dbu.objectStoreNames.contains(STORE)) {
        const s = dbu.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("by_date", "date", { unique: false });
        s.createIndex("by_type", "type", { unique: false });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      res();
    };

    req.onerror = (e) => rej(e.target.error);
  });
}

/* ===== STORE ACCESSOR ===== */
function store(mode = "readonly") {
  if (!db) throw new Error("DB not initialized");
  return db.transaction(STORE, mode).objectStore(STORE);
}

/* ===== GET ALL EVENTS ===== */
function getEvents() {
  return new Promise((res, rej) => {
    try {
      const out = [];
      const cursorReq = store().openCursor();
      cursorReq.onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur) return res(out);
        out.push(cur.value);
        cur.continue();
      };
      cursorReq.onerror = (e) => rej(e.target.error);
    } catch (err) {
      rej(err);
    }
  });
}

/* ===== DATE HELPERS ===== */
const ymd = (d) => d.toISOString().slice(0, 10);
const add = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const same = (a, b) => a.toDateString() === b.toDateString();

/* ===== STATE ===== */
let weekStart = (() => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d;
})();

/* ============================================================
   MINI CALENDAR (6 DAYS)
   ============================================================ */
async function renderMini() {
  try {
    const days = document.getElementById("mini-calendar-days");
    const label = document.getElementById("mini-week-label");
    if (!days || !label) return;

    const events = await getEvents().catch(() => []);

    days.innerHTML = "";
    label.textContent = `${weekStart.toLocaleDateString()} – ${add(weekStart, 5).toLocaleDateString()}`;

    for (let i = 0; i < 6; i++) {
      const d = add(weekStart, i);
      const count = events.filter((e) => e.date === ymd(d)).length;

      const cell = document.createElement("div");
      cell.className = "mini-day";

      cell.innerHTML = `
        <div class="mini-date">${d.getDate()}</div>
        <div class="mini-dots">${count ? "●".repeat(count) : ""}</div>
      `;

      if (same(d, new Date())) cell.classList.add("today");

      cell.addEventListener("click", () => (window.location.href = "calendar.html"));
      days.appendChild(cell);
    }
  } catch (err) {
    console.error("renderMini error", err);
  }
}

/* ============================================================
   REMINDERS
   ============================================================ */
async function renderReminders() {
  try {
    const list = document.getElementById("reminders-list");
    if (!list) return;

    const events = await getEvents().catch(() => []);

    const upcoming = events
      .filter((e) => e.reminder)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!upcoming.length) {
      list.innerHTML = `<p style="opacity:0.7;">No reminders.</p>`;
      return;
    }

    list.innerHTML = upcoming
      .map(
        (ev) => `
      <div class="agenda-item">
        <div class="agenda-main">
          <div class="agenda-title">${ev.title || ""}</div>
          <div class="agenda-meta">${ev.date || ""}</div>
        </div>
      </div>
    `
      )
      .join("");
  } catch (err) {
    console.error("renderReminders error", err);
  }
}

/* ============================================================
   NAVIGATION HANDLERS (wired after DOM ready)
   ============================================================ */
function wireMiniNav() {
  const prev = document.getElementById("mini-prev-week");
  const next = document.getElementById("mini-next-week");
  if (prev) prev.addEventListener("click", () => { weekStart = add(weekStart, -7); renderMini(); });
  if (next) next.addEventListener("click", () => { weekStart = add(weekStart, 7); renderMini(); });
}

/* ============================================================
   INIT (wait for DOM ready and DB ready)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initDB()
    .then(() => {
      wireMiniNav();
      renderMini();
      renderReminders();
    })
    .catch((err) => {
      console.error("Calendar DB init failed", err);
    });
});

/* ============================================================
   ROYALTY RUNNER – MANAGE CALENDAR ENGINE (FULL REBUILD)
   ============================================================ */

/* ===== DB CONFIG ===== */
const DB_NAME = "RoyaltyRunner_CalendarDB";
const STORE = "events";
let db = null;

/* ===== INIT DB ===== */
function initDB() {
  return new Promise(res => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      // Create store if missing
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true
        });

        s.createIndex("date", "date", { unique: false });
        s.createIndex("reminder", "reminder", { unique: false });
      }
    };

    req.onsuccess = e => {
      db = e.target.result;
      res();
    };
  });
}

/* ===== STORE ACCESSOR ===== */
function store(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
}

/* ===== GET ALL EVENTS ===== */
function getEvents() {
  return new Promise(res => {
    const out = [];
    const cursor = store().openCursor();

    cursor.onsuccess = e => {
      const cur = e.target.result;
      if (!cur) return res(out);
      out.push(cur.value);
      cur.continue();
    };
  });
}

/* ===== DATE HELPERS ===== */
const ymd = d => d.toISOString().slice(0, 10);
const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
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
  const days = document.getElementById("mini-calendar-days");
  const label = document.getElementById("mini-week-label");
  const events = await getEvents();

  days.innerHTML = "";
  label.textContent =
    `${weekStart.toLocaleDateString()} – ${add(weekStart, 5).toLocaleDateString()}`;

  for (let i = 0; i < 6; i++) {
    const d = add(weekStart, i);
    const count = events.filter(e => e.date === ymd(d)).length;

    const cell = document.createElement("div");
    cell.className = "mini-day";

    cell.innerHTML = `
      <div class="mini-date">${d.getDate()}</div>
      <div class="mini-dots">${count ? "●".repeat(count) : ""}</div>
    `;

    if (same(d, new Date())) cell.classList.add("today");

    cell.onclick = () => window.location.href = "calendar.html";
    days.appendChild(cell);
  }
}

/* ============================================================
   REMINDERS
   ============================================================ */
async function renderReminders() {
  const list = document.getElementById("reminders-list");
  const events = await getEvents();

  const upcoming = events
    .filter(e => e.reminder)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!upcoming.length) {
    list.innerHTML = `<p style="opacity:0.7;">No reminders.</p>`;
    return;
  }

  list.innerHTML = upcoming.map(ev => `
    <div class="agenda-item">
      <div class="agenda-main">
        <div class="agenda-title">${ev.title}</div>
        <div class="agenda-meta">${ev.date}</div>
      </div>
    </div>
  `).join("");
}

/* ============================================================
   NAVIGATION
   ============================================================ */
document.getElementById("mini-prev-week").onclick = () => {
  weekStart = add(weekStart, -7);
  renderMini();
};

document.getElementById("mini-next-week").onclick = () => {
  weekStart = add(weekStart, 7);
  renderMini();
};

/* ============================================================
   INIT
   ============================================================ */
initDB().then(() => {
  renderMini();
  renderReminders();
});

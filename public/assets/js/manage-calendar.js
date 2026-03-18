/* ===== DB ===== */
const DB_NAME = "RoyaltyRunner_CalendarDB";
let db;

function initDB() {
  return new Promise(res => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = e => { db = e.target.result; res(); };
  });
}

function store() {
  return db.transaction("events").objectStore("events");
}

function getEvents() {
  return new Promise(res => {
    const out = [];
    const c = store().openCursor();
    c.onsuccess = e => {
      const cur = e.target.result;
      if (!cur) return res(out);
      out.push(cur.value);
      cur.continue();
    };
  });
}

/* ===== DATE HELPERS ===== */
const ymd = d => d.toISOString().slice(0,10);
const add = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const same = (a,b) => a.toDateString()===b.toDateString();

/* ===== STATE ===== */
let weekStart = (()=>{ const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d; })();

/* ===== MINI CALENDAR ===== */
async function renderMini() {
  const days = document.getElementById("mini-calendar-days");
  const label = document.getElementById("mini-week-label");
  const events = await getEvents();

  days.innerHTML = "";
  label.textContent = `${weekStart.toLocaleDateString()} – ${add(weekStart,6).toLocaleDateString()}`;

  for (let i=0;i<7;i++) {
    const d = add(weekStart,i);
    const count = events.filter(e=>e.date===ymd(d)).length;

    const cell = document.createElement("div");
    cell.className = "mini-day";
    cell.style.padding = "1rem";
    cell.style.border = "1px solid rgba(184,115,51,0.4)";
    cell.style.borderRadius = "8px";
    cell.style.background = same(d,new Date()) ? "rgba(184,115,51,0.35)" : "rgba(0,0,0,0.6)";
    cell.style.cursor = "pointer";

    cell.innerHTML = `
      <div style="font-size:1.2rem;color:var(--copper);">${d.getDate()}</div>
      <div style="font-size:0.8rem;color:var(--copper-light);">${count ? "●".repeat(count) : ""}</div>
    `;

    cell.onclick = () => window.location.href = "calendar.html";
    days.appendChild(cell);
  }
}

/* ===== REMINDERS ===== */
async function renderReminders() {
  const list = document.getElementById("reminders-list");
  const events = await getEvents();
  const upcoming = events
    .filter(e=>e.reminder)
    .sort((a,b)=>new Date(a.date)-new Date(b.date));

  if (!upcoming.length) {
    list.innerHTML = `<p style="opacity:0.7;">No reminders.</p>`;
    return;
  }

  list.innerHTML = upcoming.map(ev=>`
    <div class="agenda-item">
      <div class="agenda-main">
        <div class="agenda-title">${ev.title}</div>
        <div class="agenda-meta">${ev.date}</div>
      </div>
    </div>
  `).join("");
}

/* ===== NAV ===== */
document.getElementById("mini-prev-week").onclick = () => { weekStart = add(weekStart,-7); renderMini(); };
document.getElementById("mini-next-week").onclick = () => { weekStart = add(weekStart,7); renderMini(); };

/* ===== INIT ===== */
initDB().then(()=>{
  renderMini();
  renderReminders();
});

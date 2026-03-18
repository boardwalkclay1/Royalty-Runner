/* ===== DB ===== */
const DB_NAME = "RoyaltyRunner_CalendarDB";
let db;

function initDB() {
  return new Promise(res => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains("events")) {
        const s = d.createObjectStore("events", { keyPath: "id", autoIncrement: true });
        s.createIndex("date", "date");
      }
    };
    req.onsuccess = e => { db = e.target.result; res(); };
  });
}

function store(mode="readonly") {
  return db.transaction("events", mode).objectStore("events");
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

function saveEvent(ev) {
  return new Promise(res => store("readwrite").put(ev).onsuccess = () => res());
}

function deleteEvent(id) {
  return new Promise(res => store("readwrite").delete(id).onsuccess = () => res());
}

/* ===== DATE HELPERS ===== */
const ymd = d => d.toISOString().slice(0,10);
const parse = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const add = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const same = (a,b) => a.getFullYear()==b.getFullYear() && a.getMonth()==b.getMonth() && a.getDate()==b.getDate();

/* ===== STATE ===== */
let current = new Date();
let view = "month";

/* ===== RENDER MONTH ===== */
async function renderMonth() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-current-label");
  const weekdays = document.getElementById("calendar-weekday-labels");

  grid.innerHTML = "";
  weekdays.innerHTML = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div>${d}</div>`).join("");

  const events = await getEvents();
  const first = new Date(current.getFullYear(), current.getMonth(), 1);
  const start = add(first, -first.getDay());
  label.textContent = current.toLocaleString("default",{month:"long",year:"numeric"});

  for (let i=0;i<42;i++) {
    const d = add(start,i);
    const dayEvents = events.filter(e => e.date === ymd(d));

    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (same(d,new Date())) cell.classList.add("today");

    cell.innerHTML = `
      <div class="calendar-cell-header">
        <span class="date-number">${d.getDate()}</span>
      </div>
      <div class="calendar-events">
        ${dayEvents.map(ev=>`<div class="calendar-event-pill" data-id="${ev.id}">${ev.title}</div>`).join("")}
      </div>
    `;

    cell.onclick = () => openModal({ date: ymd(d) });
    grid.appendChild(cell);
  }

  renderAgenda(events);
}

/* ===== RENDER WEEK ===== */
async function renderWeek() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-current-label");
  const weekdays = document.getElementById("calendar-weekday-labels");

  grid.innerHTML = "";
  weekdays.innerHTML = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div>${d}</div>`).join("");

  const events = await getEvents();
  const start = add(current, -current.getDay());
  label.textContent = `Week of ${start.toLocaleDateString()}`;

  for (let i=0;i<7;i++) {
    const d = add(start,i);
    const dayEvents = events.filter(e => e.date === ymd(d));

    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (same(d,new Date())) cell.classList.add("today");

    cell.innerHTML = `
      <div class="calendar-cell-header">
        <span class="date-number">${d.getDate()}</span>
      </div>
      <div class="calendar-events">
        ${dayEvents.map(ev=>`<div class="calendar-event-pill" data-id="${ev.id}">${ev.title}</div>`).join("")}
      </div>
    `;

    cell.onclick = () => openModal({ date: ymd(d) });
    grid.appendChild(cell);
  }

  renderAgenda(events);
}

/* ===== AGENDA ===== */
function renderAgenda(events) {
  const list = document.getElementById("agenda-list");
  const upcoming = events
    .filter(e => parse(e.date) >= add(new Date(), -1))
    .sort((a,b)=>parse(a.date)-parse(b.date));

  if (!upcoming.length) {
    list.innerHTML = `<p style="opacity:0.7;">No events yet.</p>`;
    return;
  }

  list.innerHTML = upcoming.map(ev=>`
    <div class="agenda-item">
      <div class="agenda-main">
        <div class="agenda-title">${ev.title}</div>
        <div class="agenda-meta">${ev.date}</div>
      </div>
      <div class="agenda-actions">
        <button onclick="openModal(${ev.id})">Edit</button>
        <button onclick="deleteEvent(${ev.id}).then(()=>refresh())">Del</button>
      </div>
    </div>
  `).join("");
}

/* ===== MODAL ===== */
function openModal(ev) {
  const modal = document.getElementById("event-modal");
  const isEdit = typeof ev === "number";

  if (isEdit) {
    getEvents().then(all=>{
      const e = all.find(x=>x.id===ev);
      fillModal(e);
    });
  } else {
    fillModal(ev);
  }

  modal.style.display = "flex";
}

function fillModal(ev) {
  document.getElementById("event-title").value = ev.title || "";
  document.getElementById("event-date").value = ev.date || ymd(new Date());
  document.getElementById("event-start").value = ev.startTime || "";
  document.getElementById("event-end").value = ev.endTime || "";
  document.getElementById("event-type").value = ev.type || "general";
  document.getElementById("event-notes").value = ev.notes || "";
  document.getElementById("event-reminder").checked = !!ev.reminder;

  document.getElementById("event-modal").dataset.id = ev.id || "";
}

function closeModal() {
  document.getElementById("event-modal").style.display = "none";
}

document.getElementById("event-save").onclick = async () => {
  const id = document.getElementById("event-modal").dataset.id;
  const ev = {
    id: id ? Number(id) : undefined,
    title: document.getElementById("event-title").value,
    date: document.getElementById("event-date").value,
    startTime: document.getElementById("event-start").value,
    endTime: document.getElementById("event-end").value,
    type: document.getElementById("event-type").value,
    notes: document.getElementById("event-notes").value,
    reminder: document.getElementById("event-reminder").checked
  };

  await saveEvent(ev);
  closeModal();
  refresh();
};

document.getElementById("event-cancel").onclick = closeModal;

document.getElementById("event-delete").onclick = async () => {
  const id = document.getElementById("event-modal").dataset.id;
  if (id) await deleteEvent(Number(id));
  closeModal();
  refresh();
};

/* ===== REFRESH ===== */
function refresh() {
  view === "month" ? renderMonth() : renderWeek();
}

/* ===== NAV ===== */
document.getElementById("cal-prev").onclick = () => { current.setDate(current.getDate() - (view==="month"?30:7)); refresh(); };
document.getElementById("cal-next").onclick = () => { current.setDate(current.getDate() + (view==="month"?30:7)); refresh(); };
document.getElementById("cal-today").onclick = () => { current = new Date(); refresh(); };
document.getElementById("cal-view-month").onclick = () => { view="month"; refresh(); };
document.getElementById("cal-view-week").onclick = () => { view="week"; refresh(); };
document.getElementById("cal-new-event").onclick = () => openModal({});

/* ===== INIT ===== */
initDB().then(refresh);

/* ============================================================
   ROYALTY RUNNER — CALENDAR ENGINE (ALIGNED WITH RRDB)
   Uses unified DB: RoyaltyRunnerDB / store: calendar / version: 5
   ============================================================ */

const STORE = "calendar";

/* ===== HELPERS (use RRDB) ===== */
function getEvents() {
  return window.RRDB.getAllFromStore(STORE).then(list => list || []);
}

function saveEvent(ev) {
  if (ev == null) return Promise.reject(new Error("No event"));
  // if id exists, use saveToStore; otherwise addToStore to get auto id
  if (ev.id !== undefined && ev.id !== null) {
    return window.RRDB.saveToStore(STORE, ev).then(() => ev.id);
  } else {
    return window.RRDB.addToStore(STORE, ev);
  }
}

function deleteEvent(id) {
  return window.RRDB.deleteFromStore(STORE, id);
}

function getEventById(id) {
  return window.RRDB.getFromStore(STORE, id);
}

/* ===== DATE HELPERS ===== */
const ymd = d => new Date(d).toISOString().slice(0, 10);
const parseYmd = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const sameDay = (a,b) => a.getFullYear()==b.getFullYear() && a.getMonth()==b.getMonth() && a.getDate()==b.getDate();

/* ===== STATE ===== */
let current = new Date();
let view = "month";

/* ===== RENDERING ===== */
async function renderMonth() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-current-label");
  const weekdays = document.getElementById("calendar-weekday-labels");
  if (!grid || !label || !weekdays) return;

  grid.innerHTML = "";
  weekdays.innerHTML = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div>${d}</div>`).join("");

  const events = await getEvents();
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  label.textContent = current.toLocaleString("default", { month: "long", year: "numeric" });

  // blanks
  const blanks = firstDay.getDay();
  for (let i = 0; i < blanks; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-cell empty-cell";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const dateStr = ymd(d);
    const dayEvents = events.filter(e => String(e.date) === dateStr);

    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (sameDay(d, new Date())) cell.classList.add("today");

    cell.innerHTML = `
      <div class="calendar-cell-header">
        <span class="date-number">${day}</span>
      </div>
      <div class="calendar-events">
        ${dayEvents.map(ev => `<div class="calendar-event-pill" data-id="${ev.id}">${ev.title || ""}</div>`).join("")}
      </div>
    `;

    cell.addEventListener("click", () => openModal({ date: dateStr }));
    grid.appendChild(cell);
  }

  renderAgenda(events);
}

async function renderWeek() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-current-label");
  const weekdays = document.getElementById("calendar-weekday-labels");
  if (!grid || !label || !weekdays) return;

  grid.innerHTML = "";
  weekdays.innerHTML = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div>${d}</div>`).join("");

  const events = await getEvents();
  const start = new Date(current);
  start.setDate(start.getDate() - start.getDay());
  label.textContent = `Week of ${start.toLocaleDateString()}`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = ymd(d);
    const dayEvents = events.filter(e => String(e.date) === dateStr);

    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (sameDay(d, new Date())) cell.classList.add("today");

    cell.innerHTML = `
      <div class="calendar-cell-header">
        <span class="date-number">${d.getDate()}</span>
      </div>
      <div class="calendar-events">
        ${dayEvents.map(ev => `<div class="calendar-event-pill" data-id="${ev.id}">${ev.title || ""}</div>`).join("")}
      </div>
    `;

    cell.addEventListener("click", () => openModal({ date: dateStr }));
    grid.appendChild(cell);
  }

  renderAgenda(events);
}

function renderAgenda(events) {
  const list = document.getElementById("agenda-list");
  if (!list) return;
  const upcoming = (events || [])
    .filter(e => parseYmd(e.date) >= new Date(new Date().toISOString().slice(0,10)))
    .sort((a,b) => parseYmd(a.date) - parseYmd(b.date));

  if (!upcoming.length) {
    list.innerHTML = `<p style="opacity:0.7;">No events yet.</p>`;
    return;
  }

  list.innerHTML = upcoming.map(ev => `
    <div class="agenda-item">
      <div class="agenda-main">
        <div class="agenda-title">${ev.title || ""}</div>
        <div class="agenda-meta">${ev.date}</div>
      </div>
      <div class="agenda-actions">
        <button class="agenda-edit" data-id="${ev.id}">Edit</button>
        <button class="agenda-del" data-id="${ev.id}">Del</button>
      </div>
    </div>
  `).join("");

  // attach handlers
  list.querySelectorAll(".agenda-edit").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.getAttribute("data-id"));
      getEventById(id).then(ev => { if (ev) { fillModal(ev); document.getElementById("event-modal").style.display = "flex"; } });
    });
  });
  list.querySelectorAll(".agenda-del").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.getAttribute("data-id"));
      deleteEvent(id).then(() => refresh()).catch(err => console.error(err));
    });
  });
}

/* ===== MODAL ===== */
function openModal(ev) {
  const modal = document.getElementById("event-modal");
  if (!modal) return;
  if (typeof ev === "number") {
    getEventById(ev).then(e => { if (e) fillModal(e); modal.style.display = "flex"; });
  } else {
    fillModal(ev || {});
    modal.style.display = "flex";
  }
}

function fillModal(ev) {
  document.getElementById("event-title").value = ev.title || "";
  document.getElementById("event-date").value = ev.date || ymd(new Date());
  document.getElementById("event-start").value = ev.startTime || "";
  document.getElementById("event-end").value = ev.endTime || "";
  document.getElementById("event-type").value = ev.type || "general";
  document.getElementById("event-notes").value = ev.notes || "";
  document.getElementById("event-reminder").checked = !!ev.reminder;
  document.getElementById("event-modal").dataset.id = ev.id !== undefined ? String(ev.id) : "";
}

function closeModal() {
  const m = document.getElementById("event-modal");
  if (m) m.style.display = "none";
}

/* ===== UI ACTIONS ===== */
async function onSaveEvent() {
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
  try {
    await saveEvent(ev);
    closeModal();
    refresh();
  } catch (err) {
    console.error(err);
    alert("Unable to save event.");
  }
}

async function onDeleteFromModal() {
  const id = document.getElementById("event-modal").dataset.id;
  if (id) {
    try {
      await deleteEvent(Number(id));
    } catch (err) {
      console.error(err);
    }
  }
  closeModal();
  refresh();
}

/* ===== NAVIGATION ===== */
function prev() {
  if (view === "month") current.setMonth(current.getMonth() - 1);
  else current.setDate(current.getDate() - 7);
  refresh();
}
function next() {
  if (view === "month") current.setMonth(current.getMonth() + 1);
  else current.setDate(current.getDate() + 7);
  refresh();
}
function goToday() { current = new Date(); refresh(); }
function setMonthView() { view = "month"; refresh(); }
function setWeekView() { view = "week"; refresh(); }
function newEvent() { openModal({}); }

/* ===== REFRESH ===== */
function refresh() {
  if (view === "month") renderMonth();
  else renderWeek();
}

/* ===== INIT BINDINGS ===== */
document.addEventListener("DOMContentLoaded", () => {
  // ensure RRDB is ready
  if (!window.RRDB || !window.RRDB.openDB) {
    console.error("RRDB not available");
    return;
  }

  window.RRDB.openDB().then(() => {
    // wire buttons (guard existence)
    const el = id => document.getElementById(id);
    if (el("cal-prev")) el("cal-prev").onclick = prev;
    if (el("cal-next")) el("cal-next").onclick = next;
    if (el("cal-today")) el("cal-today").onclick = goToday;
    if (el("cal-view-month")) el("cal-view-month").onclick = setMonthView;
    if (el("cal-view-week")) el("cal-view-week").onclick = setWeekView;
    if (el("cal-new-event")) el("cal-new-event").onclick = newEvent;

    if (el("mini-prev-week")) el("mini-prev-week").onclick = () => { current.setDate(current.getDate() - 7); refresh(); };
    if (el("mini-next-week")) el("mini-next-week").onclick = () => { current.setDate(current.getDate() + 7); refresh(); };

    if (el("event-save")) el("event-save").onclick = onSaveEvent;
    if (el("event-cancel")) el("event-cancel").onclick = closeModal;
    if (el("event-delete")) el("event-delete").onclick = onDeleteFromModal;

    // delegate clicks on event pills to open edit
    document.addEventListener("click", (e) => {
      const pill = e.target.closest && e.target.closest(".calendar-event-pill");
      if (pill) {
        const id = Number(pill.getAttribute("data-id"));
        if (!Number.isNaN(id)) getEventById(id).then(ev => { if (ev) { fillModal(ev); document.getElementById("event-modal").style.display = "flex"; } });
      }
    });

    refresh();
  }).catch(err => console.error("RRDB open failed", err));
});

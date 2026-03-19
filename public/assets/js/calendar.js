/* ============================================================
   ROYALTY RUNNER — CALENDAR ENGINE (UNIFIED, RRDB-ALIGNED)
   Single file: uses window.RRDB (RoyaltyRunnerDB, store: "calendar")
   ============================================================ */

const STORE = "calendar";

/* ===== SAFE HELPERS (use RRDB) ===== */
function getEvents() {
  if (!window.RRDB || !window.RRDB.getAllFromStore) return Promise.resolve([]);
  return window.RRDB.getAllFromStore(STORE).then(list => list || []).catch(() => []);
}

function saveEvent(ev) {
  if (ev == null) return Promise.reject(new Error("No event"));
  if (ev.id !== undefined && ev.id !== null && ev.id !== "") {
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
const ymd = d => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
};
const parseYmd = s => {
  if (!s) return new Date(NaN);
  const parts = String(s).split("-").map(Number);
  if (parts.length !== 3) return new Date(s);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};
const sameDay = (a, b) => {
  const A = (a instanceof Date) ? a : new Date(a);
  const B = (b instanceof Date) ? b : new Date(b);
  return A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth() && A.getDate() === B.getDate();
};
function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
        ${dayEvents.map(ev => `<div class="calendar-event-pill" data-id="${escapeHtml(ev.id)}">${escapeHtml(ev.title || "")}</div>`).join("")}
      </div>
    `;

    cell.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest(".calendar-event-pill")) return;
      openModal({ date: dateStr });
    });

    grid.appendChild(cell);
  }

  attachPillHandlers();
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
        ${dayEvents.map(ev => `<div class="calendar-event-pill" data-id="${escapeHtml(ev.id)}">${escapeHtml(ev.title || "")}</div>`).join("")}
      </div>
    `;

    cell.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest(".calendar-event-pill")) return;
      openModal({ date: dateStr });
    });

    grid.appendChild(cell);
  }

  attachPillHandlers();
  renderAgenda(events);
}

function renderAgenda(events) {
  const list = document.getElementById("agenda-list");
  if (!list) return;
  const todayStr = new Date().toISOString().slice(0,10);
  const upcoming = (events || [])
    .filter(e => {
      const d = String(e.date || "");
      return d >= todayStr;
    })
    .sort((a,b) => String(a.date).localeCompare(String(b.date)));

  if (!upcoming.length) {
    list.innerHTML = `<p style="opacity:0.7;">No events yet.</p>`;
    return;
  }

  list.innerHTML = upcoming.map(ev => `
    <div class="agenda-item">
      <div class="agenda-main">
        <div class="agenda-title">${escapeHtml(ev.title || "")}</div>
        <div class="agenda-meta">${escapeHtml(ev.date || "")}</div>
      </div>
      <div class="agenda-actions">
        <button class="agenda-edit" data-id="${escapeHtml(ev.id)}">Edit</button>
        <button class="agenda-del" data-id="${escapeHtml(ev.id)}">Del</button>
      </div>
    </div>
  `).join("");

  // attach handlers
  list.querySelectorAll(".agenda-edit").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.getAttribute("data-id"));
      if (Number.isNaN(id)) return;
      getEventById(id).then(ev => { if (ev) { fillModal(ev); document.getElementById("event-modal").style.display = "flex"; } });
    });
  });
  list.querySelectorAll(".agenda-del").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.getAttribute("data-id"));
      if (Number.isNaN(id)) return;
      deleteEvent(id).then(() => refresh()).catch(err => console.error(err));
    });
  });
}

/* ===== PILL HANDLERS ===== */
function attachPillHandlers() {
  document.querySelectorAll(".calendar-event-pill").forEach(pill => {
    pill.removeEventListener("click", pill._rr_click);
    const handler = (e) => {
      const id = Number(pill.getAttribute("data-id"));
      if (Number.isNaN(id)) return;
      getEventById(id).then(ev => { if (ev) { fillModal(ev); document.getElementById("event-modal").style.display = "flex"; } });
      e.stopPropagation();
    };
    pill._rr_click = handler;
    pill.addEventListener("click", handler);
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
function newEvent() { openModal({ date: ymd(new Date()) }); }

/* ===== REFRESH ===== */
function refresh() {
  if (view === "month") renderMonth();
  else renderWeek();
}

/* ===== INIT BINDINGS ===== */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.RRDB || !window.RRDB.openDB) {
    console.error("RRDB not available");
    return;
  }

  window.RRDB.openDB().then(() => {
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

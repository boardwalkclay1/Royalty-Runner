/* calendar.js — Royalty Runner calendar module (fixed, syntax-checked)
   Uses window.RRDB store "calendar" and guards DOM/DB availability.
*/

const STORE = "calendar";

/* Helpers using RRDB */
function getEvents() {
  if (!window.RRDB || !window.RRDB.getAllFromStore) return Promise.resolve([]);
  return window.RRDB.getAllFromStore(STORE).then(list => list || []).catch(() => []);
}

function saveEvent(ev) {
  if (!window.RRDB) return Promise.reject(new Error("RRDB not available"));
  if (ev == null) return Promise.reject(new Error("No event"));
  if (ev.id !== undefined && ev.id !== null) {
    return window.RRDB.saveToStore(STORE, ev).then(() => ev.id);
  } else {
    return window.RRDB.addToStore(STORE, ev);
  }
}

function deleteEvent(id) {
  if (!window.RRDB) return Promise.reject(new Error("RRDB not available"));
  return window.RRDB.deleteFromStore(STORE, id);
}

function getEventById(id) {
  if (!window.RRDB) return Promise.reject(new Error("RRDB not available"));
  return window.RRDB.getFromStore(STORE, id);
}

/* Date helpers */
const ymd = d => new Date(d).toISOString().slice(0, 10);
const parseYmd = s => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* State */
let current = new Date();
let view = "month";

/* Render month view */
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

    const header = document.createElement("div");
    header.className = "calendar-cell-header";
    const num = document.createElement("span");
    num.className = "date-number";
    num.textContent = String(day);
    header.appendChild(num);

    const eventsWrap = document.createElement("div");
    eventsWrap.className = "calendar-events";
    dayEvents.forEach(ev => {
      const pill = document.createElement("div");
      pill.className = "calendar-event-pill";
      pill.setAttribute("data-id", String(ev.id));
      pill.textContent = ev.title || "";
      eventsWrap.appendChild(pill);
    });

    cell.appendChild(header);
    cell.appendChild(eventsWrap);

    cell.addEventListener("click", () => openModal({ date: dateStr }));
    grid.appendChild(cell);
  }

  renderAgenda(events);
}

/* Render week view */
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

    const header = document.createElement("div");
    header.className = "calendar-cell-header";
    const num = document.createElement("span");
    num.className = "date-number";
    num.textContent = String(d.getDate());
    header.appendChild(num);

    const eventsWrap = document.createElement("div");
    eventsWrap.className = "calendar-events";
    dayEvents.forEach(ev => {
      const pill = document.createElement("div");
      pill.className = "calendar-event-pill";
      pill.setAttribute("data-id", String(ev.id));
      pill.textContent = ev.title || "";
      eventsWrap.appendChild(pill);
    });

    cell.appendChild(header);
    cell.appendChild(eventsWrap);

    cell.addEventListener("click", () => openModal({ date: dateStr }));
    grid.appendChild(cell);
  }

  renderAgenda(events);
}

/* Agenda */
function renderAgenda(events) {
  const list = document.getElementById("agenda-list");
  if (!list) return;

  const todayStr = new Date().toISOString().slice(0,10);
  const upcoming = (events || [])
    .filter(e => String(e.date) >= todayStr)
    .sort((a,b) => String(a.date).localeCompare(String(b.date)));

  if (!upcoming.length) {
    list.innerHTML = `<p style="opacity:0.7;">No events yet.</p>`;
    return;
  }

  list.innerHTML = upcoming.map(ev => {
    const idAttr = ev.id !== undefined ? String(ev.id) : "";
    return (
      '<div class="agenda-item">' +
        '<div class="agenda-main">' +
          `<div class="agenda-title">${escapeHtml(ev.title || "")}</div>` +
          `<div class="agenda-meta">${escapeHtml(String(ev.date || ""))}</div>` +
        '</div>' +
        '<div class="agenda-actions">' +
          `<button class="agenda-edit" data-id="${idAttr}">Edit</button>` +
          `<button class="agenda-del" data-id="${idAttr}">Del</button>` +
        '</div>' +
      '</div>'
    );
  }).join("");

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

/* Modal helpers */
function openModal(ev) {
  const modal = document.getElementById("event-modal");
  if (!modal) return;
  if (typeof ev === "number") {
    getEventById(ev).then(e => { if (e) { fillModal(e); modal.style.display = "flex"; } });
  } else {
    fillModal(ev || {});
    modal.style.display = "flex";
  }
}

function fillModal(ev) {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ""; };
  set("event-title", ev.title || "");
  set("event-date", ev.date || ymd(new Date()));
  set("event-start", ev.startTime || "");
  set("event-end", ev.endTime || "");
  set("event-type", ev.type || "general");
  set("event-notes", ev.notes || "");
  const rem = document.getElementById("event-reminder");
  if (rem) rem.checked = !!ev.reminder;
  const modal = document.getElementById("event-modal");
  if (modal) modal.dataset.id = ev.id !== undefined ? String(ev.id) : "";
}

function closeModal() {
  const m = document.getElementById("event-modal");
  if (m) m.style.display = "none";
}

/* UI actions */
async function onSaveEvent() {
  const modal = document.getElementById("event-modal");
  if (!modal) return;
  const id = modal.dataset.id;
  const ev = {
    id: id ? Number(id) : undefined,
    title: (document.getElementById("event-title") || {}).value || "",
    date: (document.getElementById("event-date") || {}).value || ymd(new Date()),
    startTime: (document.getElementById("event-start") || {}).value || "",
    endTime: (document.getElementById("event-end") || {}).value || "",
    type: (document.getElementById("event-type") || {}).value || "general",
    notes: (document.getElementById("event-notes") || {}).value || "",
    reminder: !!(document.getElementById("event-reminder") || {}).checked
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
  const modal = document.getElementById("event-modal");
  if (!modal) return;
  const id = modal.dataset.id;
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

/* Navigation helpers */
function prev() { if (view === "month") current.setMonth(current.getMonth() - 1); else current.setDate(current.getDate() - 7); refresh(); }
function next() { if (view === "month") current.setMonth(current.getMonth() + 1); else current.setDate(current.getDate() + 7); refresh(); }
function goToday() { current = new Date(); refresh(); }
function setMonthView() { view = "month"; refresh(); }
function setWeekView() { view = "week"; refresh(); }
function newEvent() { openModal({}); }

function refresh() { if (view === "month") renderMonth(); else renderWeek(); }

/* Escape helper */
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

/* Init and bindings */
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

    if (el("event-save")) el("event-save").onclick = onSaveEvent;
    if (el("event-cancel")) el("event-cancel").onclick = closeModal;
    if (el("event-delete")) el("event-delete").onclick = onDeleteFromModal;

    document.addEventListener("click", (e) => {
      const pill = e.target.closest && e.target.closest(".calendar-event-pill");
      if (pill) {
        const id = Number(pill.getAttribute("data-id"));
        if (!Number.isNaN(id)) {
          getEventById(id).then(ev => { if (ev) { fillModal(ev); document.getElementById("event-modal").style.display = "flex"; } });
        }
      }
    });

    refresh();
  }).catch(err => console.error("RRDB open failed", err));
});

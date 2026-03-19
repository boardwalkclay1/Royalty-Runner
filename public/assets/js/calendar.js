/* assets/js/calendar.js
   Minimal, robust calendar that uses window.RRDB when available.
   Store name: "calendar"
   Date format: YYYY-MM-DD (strings)
*/

(function () {
  const STORE = "calendar";

  /* ---------- RRDB wrappers with safe fallbacks ---------- */
  function rrdbAvailable() {
    return !!(window.RRDB && typeof window.RRDB.openDB === "function");
  }

  function ensureDBOpen(timeout = 3000) {
    return new Promise((resolve) => {
      if (!rrdbAvailable()) return resolve(false);
      let done = false;
      window.RRDB.openDB().then(() => { done = true; resolve(true); }).catch(() => { done = true; resolve(false); });
      setTimeout(() => { if (!done) resolve(false); }, timeout);
    });
  }

  function getAllEvents() {
    if (rrdbAvailable() && window.RRDB.getAllFromStore) return window.RRDB.getAllFromStore(STORE).then(r => r || []).catch(() => []);
    return Promise.resolve([]); // fallback: empty
  }

  function addEventToDB(ev) {
    if (rrdbAvailable() && window.RRDB.addToStore) return window.RRDB.addToStore(STORE, ev);
    return Promise.reject(new Error("DB unavailable"));
  }

  function saveEventToDB(ev) {
    if (rrdbAvailable() && window.RRDB.saveToStore) return window.RRDB.saveToStore(STORE, ev);
    return Promise.reject(new Error("DB unavailable"));
  }

  function deleteEventFromDB(id) {
    if (rrdbAvailable() && window.RRDB.deleteFromStore) return window.RRDB.deleteFromStore(STORE, id);
    return Promise.reject(new Error("DB unavailable"));
  }

  function getEventFromDB(id) {
    if (rrdbAvailable() && window.RRDB.getFromStore) return window.RRDB.getFromStore(STORE, id);
    return Promise.resolve(null);
  }

  /* ---------- Utilities ---------- */
  const ymd = d => {
    const dt = (d instanceof Date) ? d : new Date(d);
    return dt.toISOString().slice(0, 10);
  };
  const sameDay = (a, b) => {
    const A = (a instanceof Date) ? a : new Date(a);
    const B = (b instanceof Date) ? b : new Date(b);
    return A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth() && A.getDate() === B.getDate();
  };
  const escapeHtml = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------- State ---------- */
  let current = new Date();
  let view = "month";

  /* ---------- Rendering ---------- */
  async function renderMonth() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("calendar-current-label");
    const weekdays = document.getElementById("calendar-weekday-labels");
    if (!grid || !label || !weekdays) return;

    grid.innerHTML = "";
    weekdays.innerHTML = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div>${d}</div>`).join("");

    const events = await getAllEvents();
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

      const pills = dayEvents.map(ev => `<div class="calendar-event-pill" data-id="${escapeHtml(ev.id)}">${escapeHtml(ev.title || "")}</div>`).join("");

      cell.innerHTML = `
        <div class="calendar-cell-header"><span class="date-number">${day}</span></div>
        <div class="calendar-events">${pills}</div>
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

    const events = await getAllEvents();
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

      const pills = dayEvents.map(ev => `<div class="calendar-event-pill" data-id="${escapeHtml(ev.id)}">${escapeHtml(ev.title || "")}</div>`).join("");

      cell.innerHTML = `
        <div class="calendar-cell-header"><span class="date-number">${d.getDate()}</span></div>
        <div class="calendar-events">${pills}</div>
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
    const upcoming = (events || []).filter(e => String(e.date || "") >= todayStr).sort((a,b) => String(a.date).localeCompare(String(b.date)));

    if (!upcoming.length) {
      list.innerHTML = `<p style="opacity:0.7">No events yet.</p>`;
      return;
    }

    list.innerHTML = upcoming.map(ev => `
      <div class="agenda-item">
        <div>
          <div class="agenda-title">${escapeHtml(ev.title || "")}</div>
          <div class="agenda-meta">${escapeHtml(ev.date || "")} ${ev.startTime ? "• " + escapeHtml(ev.startTime) : ""}</div>
        </div>
        <div>
          <button class="agenda-edit" data-id="${escapeHtml(ev.id)}">Edit</button>
          <button class="agenda-del" data-id="${escapeHtml(ev.id)}">Del</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".agenda-edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = Number(e.currentTarget.getAttribute("data-id"));
        if (Number.isNaN(id)) return;
        getEventFromDB(id).then(ev => { if (ev) { fillModal(ev); openModal(); } });
      });
    });

    list.querySelectorAll(".agenda-del").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = Number(e.currentTarget.getAttribute("data-id"));
        if (Number.isNaN(id)) return;
        deleteEventFromDB(id).then(() => refresh()).catch(err => console.error(err));
      });
    });
  }

  /* ---------- Pill handlers ---------- */
  function attachPillHandlers() {
    document.querySelectorAll(".calendar-event-pill").forEach(pill => {
      pill.onclick = (e) => {
        e.stopPropagation();
        const id = Number(pill.getAttribute("data-id"));
        if (Number.isNaN(id)) return;
        getEventFromDB(id).then(ev => { if (ev) { fillModal(ev); openModal(); } });
      };
    });
  }

  /* ---------- Modal ---------- */
  function openModal(pref) {
    const modal = document.getElementById("event-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    if (pref && typeof pref === "object" && pref.date) fillModal(pref);
    modal.style.display = "flex";
  }

  function closeModal() {
    const modal = document.getElementById("event-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
    modal.dataset.id = "";
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

  /* ---------- UI actions ---------- */
  async function onSaveEvent() {
    const id = document.getElementById("event-modal").dataset.id;
    const ev = {
      id: id ? Number(id) : undefined,
      title: document.getElementById("event-title").value.trim(),
      date: document.getElementById("event-date").value,
      startTime: document.getElementById("event-start").value,
      endTime: document.getElementById("event-end").value,
      type: document.getElementById("event-type").value,
      notes: document.getElementById("event-notes").value,
      reminder: document.getElementById("event-reminder").checked
    };

    try {
      if (ev.id !== undefined && ev.id !== null && ev.id !== "") {
        await saveEventToDB(ev);
      } else {
        await addEventToDB(ev);
      }
      closeModal();
      refresh();
    } catch (err) {
      console.error(err);
      alert("Unable to save event (DB unavailable).");
    }
  }

  async function onDeleteFromModal() {
    const id = document.getElementById("event-modal").dataset.id;
    if (id) {
      try { await deleteEventFromDB(Number(id)); } catch (err) { console.error(err); }
    }
    closeModal();
    refresh();
  }

  /* ---------- Navigation ---------- */
  function prev() { if (view === "month") current.setMonth(current.getMonth() - 1); else current.setDate(current.getDate() - 7); refresh(); }
  function next() { if (view === "month") current.setMonth(current.getMonth() + 1); else current.setDate(current.getDate() + 7); refresh(); }
  function goToday() { current = new Date(); refresh(); }
  function setMonthView() { view = "month"; refresh(); }
  function setWeekView() { view = "week"; refresh(); }
  function newEvent() { openModal({ date: ymd(new Date()) }); }

  function refresh() { if (view === "month") renderMonth(); else renderWeek(); }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
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

    const modal = document.getElementById("event-modal");
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    ensureDBOpen(3000).then(() => refresh()).catch(() => refresh());
  });
})();

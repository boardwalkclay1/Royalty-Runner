// Royalty Runner – Unified Calendar Engine (Rebuilt Clean + Correct)
// Powers: manage.html (mini weekly + reminders) and calendar.html (full month/week)

(function () {
  const DB_NAME = "RoyaltyRunnerDB";
  const DB_VERSION = 5;
  const EVENTS_STORE = "events";

  let db;
  let currentView = "month";
  let currentDate = new Date();
  let dragEventId = null;

  const page = document.documentElement.getAttribute("data-page");

  // ---------------- IndexedDB Setup ----------------
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (e) => {
    db = e.target.result;

    if (!db.objectStoreNames.contains(EVENTS_STORE)) {
      const store = db.createObjectStore(EVENTS_STORE, {
        keyPath: "id",
        autoIncrement: true
      });
      store.createIndex("date", "date", { unique: false });
      store.createIndex("reminder", "reminder", { unique: false });
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    initPage();
  };

  request.onerror = () => console.error("Calendar DB failed.");

  // ---------------- Helpers ----------------
  const ymd = (d) => d.toISOString().slice(0, 10);

  const parseYMD = (str) => {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const startOfWeek = (d) => {
    const x = new Date(d);
    const day = x.getDay();
    x.setDate(x.getDate() - day);
    return x;
  };

  const formatTimeRange = (s, e) => {
    if (!s && !e) return "";
    if (s && e) return `${s} – ${e}`;
    return s || e;
  };

  const openTx = (store, mode = "readonly") =>
    db.transaction(store, mode).objectStore(store);

  // ---------------- CRUD ----------------
  function getAllEvents(cb) {
    const store = openTx(EVENTS_STORE);
    const out = [];
    store.openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return cb(out);
      out.push(c.value);
      c.continue();
    };
  }

  function saveEvent(ev, cb) {
    const store = openTx(EVENTS_STORE, "readwrite");
    store.put(ev).onsuccess = () => cb && cb();
  }

  function deleteEvent(id, cb) {
    const store = openTx(EVENTS_STORE, "readwrite");
    store.delete(id).onsuccess = () => cb && cb();
  }

  // ---------------- Page Init ----------------
  function initPage() {
    if (page === "manage") {
      initManageMiniCalendar();
      initManageReminders();
    }
    if (page === "calendar") {
      initFullCalendar();
    }
  }

  // ---------------- Manage Page: Reminders ----------------
  function initManageReminders() {
    const container = document.getElementById("reminders-list");
    if (!container) return;

    getAllEvents((events) => {
      const today = ymd(new Date());

      const upcoming = events
        .filter((ev) => ev.reminder && ev.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);

      container.innerHTML = "";

      if (!upcoming.length) {
        container.innerHTML = `<p style="opacity:0.7;">No reminders yet.</p>`;
        return;
      }

      upcoming.forEach((ev) => {
        const d = parseYMD(ev.date);
        const item = document.createElement("div");
        item.className = "reminder-item";

        item.innerHTML = `
          <div class="reminder-date">${d.toLocaleDateString()}</div>
          <div>${ev.title || "(Untitled Event)"}</div>
          <div style="font-size:0.8rem;opacity:0.8;">
            ${formatTimeRange(ev.startTime, ev.endTime)}
          </div>
        `;

        container.appendChild(item);
      });
    });
  }

  // ---------------- Manage Page: Mini Calendar (FIXED) ----------------
  function initManageMiniCalendar() {
    const daysContainer = document.getElementById("mini-calendar-days");
    if (!daysContainer) return;

    const prevBtn = document.getElementById("mini-prev-week");
    const nextBtn = document.getElementById("mini-next-week");
    const label = document.getElementById("mini-week-label");

    let weekStart = startOfWeek(new Date());

    function renderMini() {
      daysContainer.innerHTML = "";

      const weekEnd = addDays(weekStart, 6);
      label.textContent =
        `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ` +
        `${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

      getAllEvents((events) => {
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          const ds = ymd(d);
          const evs = events.filter((ev) => ev.date === ds);

          const div = document.createElement("div");
          div.className = "mini-day";

          if (sameDay(d, new Date())) div.classList.add("today");
          if (evs.length) div.classList.add("has-events");

          div.innerHTML = `
            <div class="mini-date">${d.getDate()}</div>
            <div class="mini-count">${evs.length ? evs.length + " evt" : ""}</div>
          `;

          div.addEventListener("click", () => {
            const url = new URL(window.location.origin + "/calendar.html");
            url.searchParams.set("date", ds);
            window.location.href = url.toString();
          });

          daysContainer.appendChild(div);
        }
      });
    }

    prevBtn.addEventListener("click", () => {
      weekStart = addDays(weekStart, -7);
      renderMini();
    });

    nextBtn.addEventListener("click", () => {
      weekStart = addDays(weekStart, 7);
      renderMini();
    });

    renderMini();
  }

  // ---------------- Full Calendar Page ----------------
  function initFullCalendar() {
    const grid = document.getElementById("calendar-grid");
    const weekdayLabels = document.getElementById("calendar-weekday-labels");
    const label = document.getElementById("calendar-current-label");

    const btnToday = document.getElementById("cal-today");
    const btnPrev = document.getElementById("cal-prev");
    const btnNext = document.getElementById("cal-next");
    const btnMonth = document.getElementById("cal-view-month");
    const btnWeek = document.getElementById("cal-view-week");
    const btnNew = document.getElementById("cal-new-event");

    const agenda = document.getElementById("agenda-list");

    const modal = document.getElementById("event-modal");
    const modalTitle = document.getElementById("event-title");
    const modalDate = document.getElementById("event-date");
    const modalStart = document.getElementById("event-start");
    const modalEnd = document.getElementById("event-end");
    const modalType = document.getElementById("event-type");
    const modalNotes = document.getElementById("event-notes");
    const modalReminder = document.getElementById("event-reminder");
    const modalCancel = document.getElementById("event-cancel");
    const modalDelete = document.getElementById("event-delete");
    const modalSave = document.getElementById("event-save");

    let editingEventId = null;

    // Weekday labels
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdayLabels.innerHTML = weekdays.map((d) => `<div>${d}</div>`).join("");

    // URL ?date=YYYY-MM-DD
    const params = new URLSearchParams(window.location.search);
    if (params.has("date")) currentDate = parseYMD(params.get("date"));

    // ---------- Render ----------
    function renderCalendar() {
      grid.innerHTML = "";
      if (currentView === "month") renderMonth();
      else renderWeek();
      renderAgenda();
    }

    function renderMonth() {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const first = new Date(y, m, 1);
      const start = startOfWeek(first);

      label.textContent = currentDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
      });

      getAllEvents((events) => {
        for (let i = 0; i < 42; i++) {
          const d = addDays(start, i);
          const ds = ymd(d);
          const evs = events.filter((ev) => ev.date === ds);

          const cell = document.createElement("div");
          cell.className = "calendar-cell";
          if (sameDay(d, new Date())) cell.classList.add("today");
          if (d.getMonth() !== m) cell.style.opacity = 0.4;

          cell.dataset.date = ds;

          cell.innerHTML = `
            <div class="calendar-cell-header">
              <span class="date-number">${d.getDate()}</span>
            </div>
            <div class="calendar-events"></div>
          `;

          const container = cell.querySelector(".calendar-events");

          evs.forEach((ev) => {
            const pill = document.createElement("div");
            pill.className = "calendar-event-pill";
            pill.draggable = true;
            pill.dataset.id = ev.id;
            pill.textContent = ev.title || "(Untitled)";

            pill.addEventListener("dragstart", (e) => {
              dragEventId = ev.id;
            });

            pill.addEventListener("click", (e) => {
              e.stopPropagation();
              openEventModal(ev);
            });

            container.appendChild(pill);
          });

          cell.addEventListener("dragover", (e) => e.preventDefault());
          cell.addEventListener("drop", () => {
            if (!dragEventId) return;
            moveEventToDate(dragEventId, ds);
          });

          cell.addEventListener("click", () => openEventModal({ date: ds }));

          grid.appendChild(cell);
        }
      });
    }

    function renderWeek() {
      const start = startOfWeek(currentDate);
      const end = addDays(start, 6);

      label.textContent =
        `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ` +
        `${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

      getAllEvents((events) => {
        for (let i = 0; i < 7; i++) {
          const d = addDays(start, i);
          const ds = ymd(d);
          const evs = events.filter((ev) => ev.date === ds);

          const cell = document.createElement("div");
          cell.className = "calendar-cell";
          if (sameDay(d, new Date())) cell.classList.add("today");
          cell.dataset.date = ds;

          cell.innerHTML = `
            <div class="calendar-cell-header">
              <span class="date-number">${d.getDate()}</span>
              <span>${weekdays[d.getDay()]}</span>
            </div>
            <div class="calendar-events"></div>
          `;

          const container = cell.querySelector(".calendar-events");

          evs
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
            .forEach((ev) => {
              const pill = document.createElement("div");
              pill.className = "calendar-event-pill";
              pill.draggable = true;
              pill.dataset.id = ev.id;

              const time = formatTimeRange(ev.startTime, ev.endTime);
              pill.textContent = time ? `${time} – ${ev.title}` : ev.title;

              pill.addEventListener("dragstart", () => {
                dragEventId = ev.id;
              });

              pill.addEventListener("click", (e) => {
                e.stopPropagation();
                openEventModal(ev);
              });

              container.appendChild(pill);
            });

          cell.addEventListener("dragover", (e) => e.preventDefault());
          cell.addEventListener("drop", () => {
            if (!dragEventId) return;
            moveEventToDate(dragEventId, ds);
          });

          cell.addEventListener("click", () => openEventModal({ date: ds }));

          grid.appendChild(cell);
        }
      });
    }

    function moveEventToDate(id, newDate) {
      const store = openTx(EVENTS_STORE, "readwrite");
      const req = store.get(id);
      req.onsuccess = (e) => {
        const ev = e.target.result;
        if (!ev) return;
        ev.date = newDate;
        saveEvent(ev, () => {
          dragEventId = null;
          renderCalendar();
        });
      };
    }

    // ---------- Agenda ----------
    function renderAgenda() {
      if (!agenda) return;

      getAllEvents((events) => {
        const today = ymd(new Date());

        const upcoming = events
          .filter((ev) => ev.date >= today)
          .sort(
            (a, b) =>
              a.date.localeCompare(b.date) ||
              (a.startTime || "").localeCompare(b.startTime || "")
          );

        agenda.innerHTML = "";

        if (!upcoming.length) {
          agenda.innerHTML = `<p style="opacity:0.7;">No events yet.</p>`;
          return;
        }

        upcoming.forEach((ev) => {
          const d = parseYMD(ev.date);
          const item = document.createElement("div");
          item.className = "agenda-item";

          item.innerHTML = `
            <div class="agenda-main">
              <div class="agenda-title">${ev.title}</div>
              <div class="agenda-meta">
                ${d.toLocaleDateString()} • ${formatTimeRange(ev.startTime, ev.endTime) || "All day"} • ${ev.type}
              </div>
            </div>
            <div class="agenda-actions">
              <button class="agenda-edit" data-id="${ev.id}">Edit</button>
              <button class="agenda-delete" data-id="${ev.id}">Delete</button>
            </div>
          `;

          agenda.appendChild(item);
        });

        agenda.querySelectorAll(".agenda-edit").forEach((btn) => {
          btn.addEventListener("click", () => openEventById(Number(btn.dataset.id)));
        });

        agenda.querySelectorAll(".agenda-delete").forEach((btn) => {
          btn.addEventListener("click", () => {
            deleteEvent(Number(btn.dataset.id), renderCalendar);
          });
        });
      });
    }

    function openEventById(id) {
      const store = openTx(EVENTS_STORE);
      const req = store.get(id);
      req.onsuccess = (e) => {
        const ev = e.target.result;
        if (ev) openEventModal(ev);
      };
    }

    // ---------- Modal ----------
    function openEventModal(ev) {
      editingEventId = ev.id || null;

      modalTitle.value = ev.title || "";
      modalDate.value = ev.date || ymd(currentDate);
      modalStart.value = ev.startTime || "";
      modalEnd.value = ev.endTime || "";
      modalType.value = ev.type || "general";
      modalNotes.value = ev.notes || "";
      modalReminder.checked = !!ev.reminder;

      modal.style.display = "flex";
      modalDelete.style.display = editingEventId ? "inline-block" : "none";
    }

    function closeEventModal() {
      modal.style.display = "none";
      editingEventId = null;
    }

    modalCancel.addEventListener("click", closeEventModal);

    modalDelete.addEventListener("click", () => {
      if (!editingEventId) return closeEventModal();
      deleteEvent(editingEventId, () => {
        closeEventModal();
        renderCalendar();
      });
    });

    modalSave.addEventListener("click", () => {
      const ev = {
        id: editingEventId || undefined,
        title: modalTitle.value.trim() || "(Untitled Event)",
        date: modalDate.value,
        startTime: modalStart.value || "",
        endTime: modalEnd.value || "",
        type: modalType.value || "general",
        notes: modalNotes.value || "",
        reminder: modalReminder.checked
      };

      saveEvent(ev, () => {
        closeEventModal();
        renderCalendar();
      });
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeEventModal();
    });

    // ---------- Header Controls ----------
    btnToday.addEventListener

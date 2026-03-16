// Royalty Runner – Unified Calendar Engine
// Powers: manage.html (mini weekly + reminders) and calendar.html (full month/week + drag/drop)

(function() {
  const DB_NAME = "RoyaltyRunnerDB";
  const DB_VERSION = 5;
  const EVENTS_STORE = "events";

  let db;
  let currentView = "month"; // or "week"
  let currentDate = new Date();
  let dragEventId = null;

  const page = document.documentElement.getAttribute("data-page");

  // ---------- IndexedDB Setup ----------
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains(EVENTS_STORE)) {
      const store = db.createObjectStore(EVENTS_STORE, { keyPath: "id", autoIncrement: true });
      store.createIndex("date", "date", { unique: false });
      store.createIndex("reminder", "reminder", { unique: false });
    } else {
      const store = e.target.result.transaction.objectStore(EVENTS_STORE);
      if (!store.indexNames.contains("date")) {
        store.createIndex("date", "date", { unique: false });
      }
      if (!store.indexNames.contains("reminder")) {
        store.createIndex("reminder", "reminder", { unique: false });
      }
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    initPage();
  };

  request.onerror = () => {
    console.error("Calendar IndexedDB failed.");
  };

  // ---------- Helpers ----------
  function ymd(date) {
    return date.toISOString().slice(0, 10);
  }

  function parseYMD(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0-6
    const diff = d.getDate() - day; // Sunday as start
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  function formatHumanDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }

  function formatTimeRange(start, end) {
    if (!start && !end) return "";
    const opts = { hour: "numeric", minute: "2-digit" };
    const s = start ? start : "";
    const e = end ? end : "";
    if (s && e) {
      return `${s} – ${e}`;
    }
    return s || e;
  }

  function openTx(storeName, mode = "readonly") {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  // ---------- Events CRUD ----------
  function getAllEvents(callback) {
    const store = openTx(EVENTS_STORE, "readonly");
    const events = [];
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) {
        callback(events);
        return;
      }
      events.push(cursor.value);
      cursor.continue();
    };
  }

  function getEventsByDate(dateStr, callback) {
    const store = openTx(EVENTS_STORE, "readonly");
    const index = store.index("date");
    const range = IDBKeyRange.only(dateStr);
    const events = [];
    index.openCursor(range).onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) {
        callback(events);
        return;
      }
      events.push(cursor.value);
      cursor.continue();
    };
  }

  function saveEvent(event, callback) {
    const store = openTx(EVENTS_STORE, "readwrite");
    const req = store.put(event);
    req.onsuccess = () => callback && callback();
  }

  function deleteEvent(id, callback) {
    const store = openTx(EVENTS_STORE, "readwrite");
    const req = store.delete(id);
    req.onsuccess = () => callback && callback();
  }

  // ---------- Page Init ----------
  function initPage() {
    if (page === "manage") {
      initManageMiniCalendar();
      initManageReminders();
    } else if (page === "calendar") {
      initFullCalendar();
    }
  }

  // ---------- Manage Page: Reminders ----------
  function initManageReminders() {
    const container = document.getElementById("reminders-list");
    if (!container) return;

    getAllEvents((events) => {
      const now = new Date();
      const upcoming = events
        .filter(ev => ev.reminder)
        .filter(ev => {
          const d = parseYMD(ev.date);
          return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);

      container.innerHTML = "";

      if (!upcoming.length) {
        container.innerHTML = `<p style="opacity:0.7;">No reminders yet. Mark events with “Reminder” in the calendar.</p>`;
        return;
      }

      upcoming.forEach(ev => {
        const d = parseYMD(ev.date);
        const item = document.createElement("div");
        item.className = "reminder-item";
        item.innerHTML = `
          <div class="reminder-date">${d.toLocaleDateString()}</div>
          <div>${ev.title || "(Untitled Event)"}</div>
          <div style="font-size:0.8rem;opacity:0.8;">${formatTimeRange(ev.startTime, ev.endTime)}</div>
        `;
        container.appendChild(item);
      });
    });
  }

  // ---------- Manage Page: Mini Weekly Calendar ----------
  function initManageMiniCalendar() {
    const mini = document.getElementById("mini-calendar");
    if (!mini) return;

    const prevBtn = document.getElementById("mini-prev-week");
    const nextBtn = document.getElementById("mini-next-week");
    const label = document.getElementById("mini-week-label");
    const daysContainer = document.getElementById("mini-calendar-days");

    let weekStart = startOfWeek(new Date());

    function renderMiniWeek() {
      daysContainer.innerHTML = "";
      const weekEnd = addDays(weekStart, 6);
      label.textContent = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

      getAllEvents((events) => {
        for (let i = 0; i < 7; i++) {
          const dayDate = addDays(weekStart, i);
          const dayStr = ymd(dayDate);
          const dayEvents = events.filter(ev => ev.date === dayStr);

          const div = document.createElement("div");
          div.className = "mini-day";
          if (sameDay(dayDate, new Date())) div.classList.add("today");
          if (dayEvents.length) div.classList.add("has-events");

          div.innerHTML = `
            <span class="mini-date">${dayDate.getDate()}</span>
            <span class="mini-label">${dayEvents.length ? dayEvents.length + " event(s)" : "No events"}</span>
          `;

          div.addEventListener("click", () => {
            // Jump to calendar page anchored on this date
            const url = new URL(window.location.origin + "/calendar.html");
            url.searchParams.set("date", dayStr);
            window.location.href = url.toString();
          });

          daysContainer.appendChild(div);
        }
      });
    }

    prevBtn.addEventListener("click", () => {
      weekStart = addDays(weekStart, -7);
      renderMiniWeek();
    });

    nextBtn.addEventListener("click", () => {
      weekStart = addDays(weekStart, 7);
      renderMiniWeek();
    });

    renderMiniWeek();
  }

  // ---------- Full Calendar Page ----------
  function initFullCalendar() {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;

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
    weekdayLabels.innerHTML = weekdays.map(d => `<div>${d}</div>`).join("");

    // If URL has ?date=YYYY-MM-DD, jump there
    const params = new URLSearchParams(window.location.search);
    if (params.has("date")) {
      currentDate = parseYMD(params.get("date"));
    }

    function renderCalendar() {
      grid.innerHTML = "";

      if (currentView === "month") {
        renderMonthView();
      } else {
        renderWeekView();
      }

      renderAgenda();
    }

    function renderMonthView() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const start = startOfWeek(firstOfMonth);

      label.textContent = currentDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
      });

      getAllEvents((events) => {
        for (let i = 0; i < 42; i++) {
          const dayDate = addDays(start, i);
          const dayStr = ymd(dayDate);
          const dayEvents = events.filter(ev => ev.date === dayStr);

          const cell = document.createElement("div");
          cell.className = "calendar-cell";
          if (sameDay(dayDate, new Date())) cell.classList.add("today");

          const inMonth = dayDate.getMonth() === month;
          if (!inMonth) {
            cell.style.opacity = 0.4;
          }

          cell.dataset.date = dayStr;

          cell.innerHTML = `
            <div class="calendar-cell-header">
              <span class="date-number">${dayDate.getDate()}</span>
            </div>
            <div class="calendar-events"></div>
          `;

          const eventsContainer = cell.querySelector(".calendar-events");

          dayEvents.forEach(ev => {
            const pill = document.createElement("div");
            pill.className = "calendar-event-pill";
            pill.draggable = true;
            pill.dataset.id = ev.id;
            pill.textContent = ev.title || "(Untitled)";

            pill.addEventListener("dragstart", (e) => {
              dragEventId = ev.id;
              e.dataTransfer.effectAllowed = "move";
            });

            pill.addEventListener("click", (e) => {
              e.stopPropagation();
              openEventModal(ev);
            });

            eventsContainer.appendChild(pill);
          });

          cell.addEventListener("dragover", (e) => {
            e.preventDefault();
          });

          cell.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!dragEventId) return;
            moveEventToDate(dragEventId, dayStr);
          });

          cell.addEventListener("click", () => {
            openEventModal({ date: dayStr });
          });

          grid.appendChild(cell);
        }
      });
    }

    function renderWeekView() {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);

      label.textContent = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

      getAllEvents((events) => {
        for (let i = 0; i < 7; i++) {
          const dayDate = addDays(weekStart, i);
          const dayStr = ymd(dayDate);
          const dayEvents = events.filter(ev => ev.date === dayStr);

          const cell = document.createElement("div");
          cell.className = "calendar-cell";
          if (sameDay(dayDate, new Date())) cell.classList.add("today");
          cell.dataset.date = dayStr;

          cell.innerHTML = `
            <div class="calendar-cell-header">
              <span class="date-number">${dayDate.getDate()}</span>
              <span>${weekdays[dayDate.getDay()]}</span>
            </div>
            <div class="calendar-events"></div>
          `;

          const eventsContainer = cell.querySelector(".calendar-events");

          dayEvents
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
            .forEach(ev => {
              const pill = document.createElement("div");
              pill.className = "calendar-event-pill";
              pill.draggable = true;
              pill.dataset.id = ev.id;
              const timeLabel = formatTimeRange(ev.startTime, ev.endTime);
              pill.textContent = timeLabel ? `${timeLabel} – ${ev.title || "(Untitled)"}` : (ev.title || "(Untitled)");

              pill.addEventListener("dragstart", (e) => {
                dragEventId = ev.id;
                e.dataTransfer.effectAllowed = "move";
              });

              pill.addEventListener("click", (e) => {
                e.stopPropagation();
                openEventModal(ev);
              });

              eventsContainer.appendChild(pill);
            });

          cell.addEventListener("dragover", (e) => {
            e.preventDefault();
          });

          cell.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!dragEventId) return;
            moveEventToDate(dragEventId, dayStr);
          });

          cell.addEventListener("click", () => {
            openEventModal({ date: dayStr });
          });

          grid.appendChild(cell);
        }
      });
    }

    function moveEventToDate(id, newDateStr) {
      const store = openTx(EVENTS_STORE, "readwrite");
      const req = store.get(id);
      req.onsuccess = (e) => {
        const ev = e.target.result;
        if (!ev) return;
        ev.date = newDateStr;
        saveEvent(ev, () => {
          dragEventId = null;
          renderCalendar();
        });
      };
    }

    function renderAgenda() {
      if (!agenda) return;

      getAllEvents((events) => {
        const now = new Date();
        const todayStr = ymd(now);

        const upcoming = events
          .filter(ev => ev.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""));

        agenda.innerHTML = "";

        if (!upcoming.length) {
          agenda.innerHTML = `<p style="opacity:0.7;">No events yet. Add one from the calendar above.</p>`;
          return;
        }

        upcoming.forEach(ev => {
          const d = parseYMD(ev.date);
          const item = document.createElement("div");
          item.className = "agenda-item";

          item.innerHTML = `
            <div class="agenda-main">
              <div class="agenda-title">${ev.title || "(Untitled Event)"}</div>
              <div class="agenda-meta">
                ${d.toLocaleDateString()} • ${formatTimeRange(ev.startTime, ev.endTime) || "All day"} • ${ev.type || "general"}
              </div>
            </div>
            <div class="agenda-actions">
              <button data-id="${ev.id}" class="agenda-edit">Edit</button>
              <button data-id="${ev.id}" class="agenda-delete">Delete</button>
            </div>
          `;

          agenda.appendChild(item);
        });

        agenda.querySelectorAll(".agenda-edit").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            openEventById(id);
          });
        });

        agenda.querySelectorAll(".agenda-delete").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            deleteEvent(id, renderCalendar);
          });
        });
      });
    }

    function openEventById(id) {
      const store = openTx(EVENTS_STORE, "readonly");
      const req = store.get(id);
      req.onsuccess = (e) => {
        const ev = e.target.result;
        if (ev) openEventModal(ev);
      };
    }

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

      if (!editingEventId) {
        modalDelete.style.display = "none";
      } else {
        modalDelete.style.display = "inline-block";
      }
    }

    function closeEventModal() {
      modal.style.display = "none";
      editingEventId = null;
    }

    modalCancel.addEventListener("click", closeEventModal);

    modalDelete.addEventListener("click", () => {
      if (!editingEventId) {
        closeEventModal();
        return;
      }
      deleteEvent(editingEventId, () => {
        closeEventModal();
        renderCalendar();
      });
    });

    modalSave.addEventListener("click", () => {
      const title = modalTitle.value.trim();
      const dateStr = modalDate.value;
      if (!dateStr) {
        alert("Date is required.");
        return;
      }

      const eventObj = {
        id: editingEventId || undefined,
        title: title || "(Untitled Event)",
        date: dateStr,
        startTime: modalStart.value || "",
        endTime: modalEnd.value || "",
        type: modalType.value || "general",
        notes: modalNotes.value || "",
        reminder: modalReminder.checked
      };

      saveEvent(eventObj, () => {
        closeEventModal();
        renderCalendar();
      });
    });

    // Header controls
    btnToday.addEventListener("click", () => {
      currentDate = new Date();
      renderCalendar();
    });

    btnPrev.addEventListener("click", () => {
      if (currentView === "month") {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      } else {
        currentDate = addDays(currentDate, -7);
      }
      renderCalendar();
    });

    btnNext.addEventListener("click", () => {
      if (currentView === "month") {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      } else {
        currentDate = addDays(currentDate, 7);
      }
      renderCalendar();
    });

    btnMonth.addEventListener("click", () => {
      currentView = "month";
      renderCalendar();
    });

    btnWeek.addEventListener("click", () => {
      currentView = "week";
      renderCalendar();
    });

    btnNew.addEventListener("click", () => {
      openEventModal({ date: ymd(currentDate) });
    });

    // Close modal on background click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeEventModal();
    });

    // Initial render
    renderCalendar();
  }
})();

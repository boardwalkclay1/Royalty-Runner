document.addEventListener("DOMContentLoaded", () => {
  /* ============================
     PLATFORM DATA
  ============================ */
  const RR_PLATFORMS = [
    {
      id: "ascap",
      name: "ASCAP",
      url: "https://www.ascap.com/join",
      tag: "PRO",
      desc: "ASCAP collects performance royalties for songwriters and publishers.",
      notes: [
        "You will need your legal name.",
        "Have your IPI number ready.",
        "ASCAP requires a one-time signup fee."
      ]
    },
    {
      id: "bmi",
      name: "BMI",
      url: "https://www.bmi.com/join",
      tag: "PRO",
      desc: "BMI collects performance royalties for writers and publishers.",
      notes: [
        "BMI is free for songwriters.",
        "You must provide your legal name and address."
      ]
    },
    {
      id: "sesac",
      name: "SESAC",
      url: "https://www.sesac.com/#/join",
      tag: "PRO",
      desc: "SESAC is a selective PRO for songwriters and publishers.",
      notes: [
        "Invitation or affiliation is required.",
        "Have your catalog and credits ready."
      ]
    },
    {
      id: "soundexchange",
      name: "SoundExchange",
      url: "https://www.soundexchange.com",
      tag: "Neighboring Rights",
      desc: "SoundExchange collects digital performance royalties for artists and labels.",
      notes: [
        "You will need your legal name.",
        "Upload a photo ID for verification."
      ]
    },
    {
      id: "mlc",
      name: "The MLC",
      url: "https://www.themlc.com/membership",
      tag: "Mechanical",
      desc: "The MLC pays U.S. mechanical royalties for streaming services.",
      notes: [
        "You must register as a songwriter or publisher.",
        "Have your banking details ready for direct deposit."
      ]
    },
    {
      id: "songtrust",
      name: "Songtrust",
      url: "https://www.songtrust.com",
      tag: "Publishing Admin",
      desc: "Songtrust collects global publishing royalties on your behalf.",
      notes: [
        "You will need your catalog information.",
        "They take a percentage of collected royalties."
      ]
    },
    {
      id: "distrokid",
      name: "DistroKid",
      url: "https://distrokid.com",
      tag: "Distributor",
      desc: "DistroKid distributes your music to streaming platforms.",
      notes: [
        "You will need your artist name and artwork.",
        "They charge an annual fee for unlimited releases."
      ]
    },
    {
      id: "tunecore",
      name: "TuneCore",
      url: "https://www.tunecore.com",
      tag: "Distributor",
      desc: "TuneCore distributes your music and offers publishing admin.",
      notes: [
        "You can choose per-release or annual plans.",
        "Publishing admin is a separate service."
      ]
    },
    {
      id: "cdbaby",
      name: "CD Baby",
      url: "https://cdbaby.com",
      tag: "Distributor",
      desc: "CD Baby distributes your music and offers royalty collection.",
      notes: [
        "One-time fee per release.",
        "They can also collect publishing royalties if you opt in."
      ]
    }
  ];

  /* ============================
     STORAGE HELPERS
  ============================ */
  const STORAGE_KEY = "rr_registration_progress";

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveProgress(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota errors for now
    }
  }

  /* ============================
     DOM ELEMENTS (GUARDED)
  ============================ */
  const listEl = document.getElementById("hub-services");
  const titleEl = document.getElementById("hub-detail-title");
  const descEl = document.getElementById("hub-detail-desc");
  const tagEl = document.getElementById("hub-detail-tag");
  const notesEl = document.getElementById("hub-notes-list");
  const iframeEl = document.getElementById("hub-embed-frame");
  const overlayEl = document.getElementById("hub-embed-overlay");
  const completeBtn = document.getElementById("hub-mark-complete");

  const progressCountEl = document.getElementById("hub-progress-count");
  const progressTotalEl = document.getElementById("hub-progress-total");
  const progressFillEl = document.getElementById("hub-progress-fill");

  const menuBtn = document.getElementById("rr-menu-btn");
  const menuPanel = document.getElementById("rr-menu-panel");

  if (!listEl || !titleEl || !descEl || !tagEl || !notesEl || !iframeEl || !overlayEl || !completeBtn || !progressCountEl || !progressTotalEl || !progressFillEl) {
    console.warn("Registration Hub: required DOM elements missing. JS will not run.");
    return;
  }

  /* ============================
     STATE
  ============================ */
  let selectedPlatform = null;
  let progress = loadProgress();

  /* ============================
     RENDER PLATFORM LIST
  ============================ */
  function renderList() {
    listEl.innerHTML = "";
    RR_PLATFORMS.forEach(p => {
      const div = document.createElement("div");
      div.className = "hub-service-item";
      div.textContent = p.name;
      div.dataset.id = p.id;

      if (progress[p.id]) div.classList.add("active");

      div.addEventListener("click", () => selectPlatform(p.id));
      listEl.appendChild(div);
    });

    progressTotalEl.textContent = RR_PLATFORMS.length;
  }

  /* ============================
     SELECT PLATFORM
  ============================ */
  function selectPlatform(id) {
    const p = RR_PLATFORMS.find(x => x.id === id);
    if (!p) return;

    selectedPlatform = p;

    // highlight
    document.querySelectorAll(".hub-service-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === id);
    });

    // detail panel
    titleEl.textContent = p.name;
    descEl.textContent = p.desc;
    tagEl.textContent = p.tag;

    // notes
    notesEl.innerHTML = (p.notes || []).map(n => `<li>${n}</li>`).join("");

    // enable button
    completeBtn.disabled = false;

    // load iframe (best effort)
    if (iframeEl) {
      iframeEl.src = p.url;
      if (overlayEl) overlayEl.style.display = "none";
    } else {
      // fallback: open in new tab if iframe missing
      window.open(p.url, "_blank", "noopener");
    }
  }

  /* ============================
     MARK COMPLETE
  ============================ */
  completeBtn.addEventListener("click", () => {
    if (!selectedPlatform) return;

    progress[selectedPlatform.id] = true;
    saveProgress(progress);
    updateProgress();
    renderList();
  });

  /* ============================
     PROGRESS BAR
  ============================ */
  function updateProgress() {
    const done = Object.values(progress).filter(Boolean).length;
    const total = RR_PLATFORMS.length || 1;

    progressCountEl.textContent = done;
    const pct = Math.max(0, Math.min(100, (done / total) * 100));
    progressFillEl.style.width = `${pct}%`;
  }

  /* ============================
     MENU PANEL
  ============================ */
  if (menuBtn && menuPanel) {
    menuBtn.addEventListener("click", () => {
      menuPanel.classList.toggle("open");
    });
  }

  /* ============================
     INIT
  ============================ */
  renderList();
  updateProgress();
});

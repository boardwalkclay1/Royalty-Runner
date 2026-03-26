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
    id: "soundexchange",
    name: "SoundExchange",
    url: "https://www.soundexchange.com",
    tag: "Neighboring Rights",
    desc: "SoundExchange collects digital performance royalties for artists and labels.",
    notes: [
      "You will need your legal name.",
      "Upload a photo ID for verification."
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
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ============================
   DOM ELEMENTS
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

/* ============================
   RENDER PLATFORM LIST
============================ */
let selectedPlatform = null;
let progress = loadProgress();

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

renderList();

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
  notesEl.innerHTML = p.notes.map(n => `<li>${n}</li>`).join("");

  // enable button
  completeBtn.disabled = false;

  // load iframe
  iframeEl.src = p.url;
  overlayEl.style.display = "none";
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
  const done = Object.keys(progress).length;
  const total = RR_PLATFORMS.length;

  progressCountEl.textContent = done;
  progressFillEl.style.width = `${(done / total) * 100}%`;
}

updateProgress();

/* ============================
   MENU PANEL
============================ */
menuBtn.addEventListener("click", () => {
  menuPanel.classList.toggle("open");
});

// Save as: assets/js/royalty-center.js

const RR_SERVICES = [
  {
    id: "ascap",
    name: "ASCAP",
    type: "Performance Rights (US)",
    url: "https://www.ascap.com/join",
    allowEmbed: false, // ASCAP blocks iframe
    tag: "Songwriter & Publisher PRO",
    desc: "ASCAP collects performance royalties when your music is played publicly in the US.",
    notes: [
      "ASCAP blocks iframe embedding for security.",
      "Royalty Runner will open ASCAP in a secure external window.",
      "Use the auto-fill panel to copy your info quickly."
    ]
  },
  {
    id: "bmi",
    name: "BMI",
    type: "Performance Rights (US)",
    url: "https://www.bmi.com/join",
    allowEmbed: false, // BMI blocks iframe
    tag: "Songwriter & Publisher PRO",
    desc: "BMI collects performance royalties for songwriters and publishers in the US.",
    notes: [
      "BMI blocks iframe embedding for security.",
      "Royalty Runner will open BMI in a secure external window.",
      "Use the auto-fill panel to copy your info quickly."
    ]
  },
  {
    id: "mlc",
    name: "The MLC",
    type: "Mechanical Royalties (US)",
    url: "https://www.themlc.com/members",
    allowEmbed: true,
    tag: "Mechanical Royalties",
    desc: "The MLC pays mechanical royalties from US digital services like Spotify and Apple Music.",
    notes: [
      "You’ll need your songwriter/publisher info and banking details.",
      "Make sure your metadata matches your distributor and PRO."
    ]
  },
  {
    id: "soundexchange",
    name: "SoundExchange",
    type: "Digital Performance (US)",
    url: "https://www.soundexchange.com",
    allowEmbed: true,
    tag: "Digital Performance Royalties",
    desc: "SoundExchange pays digital performance royalties for sound recordings.",
    notes: [
      "Register as both artist and rights owner if you control your masters.",
      "Have ISRCs and release info ready."
    ]
  },
  {
    id: "songtrust",
    name: "Songtrust",
    type: "Publishing Admin",
    url: "https://www.songtrust.com",
    allowEmbed: true,
    tag: "Publishing Administration",
    desc: "Songtrust collects publishing royalties worldwide.",
    notes: [
      "Useful if you don’t have a publishing deal.",
      "They will ask for splits, PRO info, and catalog details."
    ]
  },
  {
    id: "distrokid",
    name: "DistroKid",
    type: "Distribution",
    url: "https://distrokid.com",
    allowEmbed: true,
    tag: "Digital Distribution",
    desc: "DistroKid distributes your music to major streaming platforms.",
    notes: [
      "Use consistent artist name and artwork.",
      "Keep your ISRCs and UPCs organized."
    ]
  }
];

const STORAGE_KEY = "rr_registration_progress_v1";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function updateProgressUI(progress) {
  const total = RR_SERVICES.length;
  const done = RR_SERVICES.filter(s => progress[s.id]).length;
  const pct = total ? (done / total) * 100 : 0;

  document.getElementById("hub-progress-count").textContent = done;
  document.getElementById("hub-progress-total").textContent = total;
  document.getElementById("hub-progress-fill").style.width = pct + "%";
}

function renderServiceList(progress) {
  const wrap = document.getElementById("hub-services");
  wrap.innerHTML = "";

  RR_SERVICES.forEach(service => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "service-item";
    item.dataset.id = service.id;

    item.innerHTML = `
      <div class="service-name">${service.name}</div>
      <div class="service-type">${service.type}</div>
      <div class="service-status ${progress[service.id] ? "complete" : ""}">
        ${progress[service.id] ? "Completed" : "Not completed"}
      </div>
    `;

    item.addEventListener("click", () => selectService(service.id));
    wrap.appendChild(item);
  });
}

let currentServiceId = null;

function selectService(id) {
  const service = RR_SERVICES.find(s => s.id === id);
  currentServiceId = id;

  document.querySelectorAll(".service-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
  });

  document.getElementById("hub-detail-title").textContent = service.name;
  document.getElementById("hub-detail-desc").textContent = service.desc;
  document.getElementById("hub-detail-tag").textContent = service.tag;

  const notesList = document.getElementById("hub-notes-list");
  notesList.innerHTML = "";
  service.notes.forEach(n => {
    const li = document.createElement("li");
    li.textContent = n;
    notesList.appendChild(li);
  });

  const frame = document.getElementById("hub-embed-frame");
  const overlay = document.getElementById("hub-embed-overlay");

  if (service.allowEmbed) {
    overlay.style.display = "none";
    frame.src = service.url;
  } else {
    overlay.style.display = "flex";
    frame.src = "about:blank";
    window.open(service.url, "_blank");
  }

  const progress = loadProgress();
  document.getElementById("hub-mark-complete").disabled = !!progress[service.id];
}

function markCurrentComplete() {
  if (!currentServiceId) return;

  const progress = loadProgress();
  progress[currentServiceId] = true;
  saveProgress(progress);

  updateProgressUI(progress);
  renderServiceList(progress);

  document.getElementById("hub-mark-complete").disabled = true;
}

function initMenu() {
  const btn = document.getElementById("rr-menu-btn");
  const panel = document.getElementById("rr-menu-panel");

  btn.addEventListener("click", () => {
    panel.style.display = panel.style.display === "flex" ? "none" : "flex";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("copyright-year").textContent =
    new Date().getFullYear();

  initMenu();

  const progress = loadProgress();
  updateProgressUI(progress);
  renderServiceList(progress);

  document
    .getElementById("hub-mark-complete")
    .addEventListener("click", markCurrentComplete);
});

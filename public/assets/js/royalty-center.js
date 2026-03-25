// Save as: assets/js/royalty-center.js

const RR_SERVICES = [
  {
    id: "ascap",
    name: "ASCAP",
    type: "Performance Rights (US)",
    url: "https://www.ascap.com/join",
    tag: "Songwriter & Publisher PRO",
    desc: "ASCAP collects performance royalties when your music is played on radio, TV, live venues, and streaming platforms in the US.",
    notes: [
      "Have your legal name, stage name, and contact info ready.",
      "You can register as a writer and later as a publisher if needed."
    ]
  },
  {
    id: "bmi",
    name: "BMI",
    type: "Performance Rights (US)",
    url: "https://www.bmi.com/join",
    tag: "Songwriter & Publisher PRO",
    desc: "BMI is another US PRO that collects performance royalties for songwriters and publishers.",
    notes: [
      "Choose one US PRO as your primary home (ASCAP or BMI).",
      "Use the same legal name and email you use across registrations."
    ]
  },
  {
    id: "mlc",
    name: "The MLC",
    type: "Mechanical Royalties (US)",
    url: "https://www.themlc.com/members",
    tag: "Mechanical Royalties",
    desc: "The Mechanical Licensing Collective pays mechanical royalties from US digital services like Spotify, Apple Music, and more.",
    notes: [
      "You’ll need your songwriter/publisher info and banking details.",
      "Make sure your works metadata matches your distributor and PRO."
    ]
  },
  {
    id: "soundexchange",
    name: "SoundExchange",
    type: "Digital Performance (US)",
    url: "https://www.soundexchange.com",
    tag: "Digital Performance Royalties",
    desc: "SoundExchange collects and pays digital performance royalties for sound recordings (masters) from non-interactive streams.",
    notes: [
      "Register both as an artist and as a rights owner if you control your masters.",
      "Have ISRCs and release info ready for your catalog."
    ]
  },
  {
    id: "songtrust",
    name: "Songtrust",
    type: "Publishing Admin",
    url: "https://www.songtrust.com",
    tag: "Publishing Administration",
    desc: "Songtrust helps you collect publishing royalties worldwide, including mechanicals and performance from many territories.",
    notes: [
      "Useful if you don’t have a traditional publishing deal.",
      "They will ask for splits, PRO info, and catalog details."
    ]
  },
  {
    id: "distrokid",
    name: "DistroKid",
    type: "Distribution",
    url: "https://distrokid.com",
    tag: "Digital Distribution",
    desc: "DistroKid distributes your music to major streaming platforms and stores, and routes master royalties back to you.",
    notes: [
      "Use consistent artist name and artwork across releases.",
      "Keep your ISRCs and UPCs organized for future registrations."
    ]
  }
];

const STORAGE_KEY = "rr_registration_progress_v1";

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

function updateProgressUI(progress) {
  const total = RR_SERVICES.length;
  const done = RR_SERVICES.filter(s => progress[s.id]).length;
  const pct = total ? (done / total) * 100 : 0;

  const countEl = document.getElementById("hub-progress-count");
  const totalEl = document.getElementById("hub-progress-total");
  const fillEl = document.getElementById("hub-progress-fill");

  if (countEl) countEl.textContent = String(done);
  if (totalEl) totalEl.textContent = String(total);
  if (fillEl) fillEl.style.width = pct + "%";
}

function renderServiceList(progress) {
  const wrap = document.getElementById("hub-services");
  if (!wrap) return;
  wrap.innerHTML = "";

  RR_SERVICES.forEach(service => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "service-item";
    item.dataset.id = service.id;

    const name = document.createElement("div");
    name.className = "service-name";
    name.textContent = service.name;

    const type = document.createElement("div");
    type.className = "service-type";
    type.textContent = service.type;

    const status = document.createElement("div");
    status.className = "service-status";
    if (progress[service.id]) {
      status.classList.add("complete");
      status.textContent = "Completed";
    } else {
      status.textContent = "Not completed";
    }

    item.appendChild(name);
    item.appendChild(type);
    item.appendChild(status);

    item.addEventListener("click", () => selectService(service.id));
    wrap.appendChild(item);
  });
}

let currentServiceId = null;

function selectService(id) {
  const service = RR_SERVICES.find(s => s.id === id);
  if (!service) return;
  currentServiceId = id;

  document.querySelectorAll(".service-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
  });

  const titleEl = document.getElementById("hub-detail-title");
  const descEl = document.getElementById("hub-detail-desc");
  const tagEl = document.getElementById("hub-detail-tag");
  const notesList = document.getElementById("hub-notes-list");
  const frame = document.getElementById("hub-embed-frame");
  const overlay = document.getElementById("hub-embed-overlay");
  const markBtn = document.getElementById("hub-mark-complete");

  if (titleEl) titleEl.textContent = service.name;
  if (descEl) descEl.textContent = service.desc;
  if (tagEl) tagEl.textContent = service.tag;

  if (notesList) {
    notesList.innerHTML = "";
    (service.notes || []).forEach(n => {
      const li = document.createElement("li");
      li.textContent = n;
      notesList.appendChild(li);
    });
  }

  if (overlay) overlay.style.display = "none";
  if (frame) frame.src = service.url;

  const progress = loadProgress();
  if (markBtn) {
    markBtn.disabled = !!progress[service.id];
  }
}

function markCurrentComplete() {
  if (!currentServiceId) return;
  const progress = loadProgress();
  progress[currentServiceId] = true;
  saveProgress(progress);
  updateProgressUI(progress);
  renderServiceList(progress);

  const markBtn = document.getElementById("hub-mark-complete");
  if (markBtn) markBtn.disabled = true;
}

function initMenu() {
  const btn = document.getElementById("rr-menu-btn");
  const panel = document.getElementById("rr-menu-panel");
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    const visible = panel.style.display === "flex";
    panel.style.display = visible ? "none" : "flex";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("copyright-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initMenu();

  const progress = loadProgress();
  updateProgressUI(progress);
  renderServiceList(progress);

  const markBtn = document.getElementById("hub-mark-complete");
  if (markBtn) markBtn.addEventListener("click", markCurrentComplete);
});

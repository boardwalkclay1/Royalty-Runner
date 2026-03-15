// public/assets/js/works-mixer.js
// Royalty Runner — Mixer Import + Auto Metadata + Waveform + Session Intelligence

import { decodeAudio, drawWaveform, getAudioMetadata } from "./studio-waveform.js";
import { autoTitleFromFilename, detectStemType, detectVersion, estimateBPM, estimateKey } from "./studio-intelligence.js";
import { groupFilesIntoSession } from "./session-engine.js";
import { exportWork } from "./studio-export.js";

const form = document.getElementById("mixer-import-form");
const fileInput = document.getElementById("mixer-files");
const worksList = document.getElementById("works-list");
const waveformCanvas = document.getElementById("mixer-waveform-preview");

let currentAudioBuffer = null;

// ------------------------------------------------------------
// WAVEFORM + METADATA PREVIEW
// ------------------------------------------------------------

async function previewFirstFile() {
  const file = fileInput.files[0];
  if (!file) return;

  const buffer = await decodeAudio(file);
  currentAudioBuffer = buffer;

  drawWaveform(waveformCanvas, buffer);

  const meta = getAudioMetadata(buffer);
  const bpm = estimateBPM(buffer);
  const key = estimateKey(buffer);

  document.getElementById("mixer-meta-duration").textContent = meta.duration.toFixed(2) + "s";
  document.getElementById("mixer-meta-samplerate").textContent = meta.sampleRate + " Hz";
  document.getElementById("mixer-meta-channels").textContent = meta.channels;
  document.getElementById("mixer-meta-peak").textContent = meta.peak.toFixed(3);
  document.getElementById("mixer-meta-rms").textContent = meta.rms.toFixed(3);
  document.getElementById("mixer-meta-bpm").textContent = bpm || "—";
  document.getElementById("mixer-meta-key").textContent = key || "—";

  form.elements["role"].value = detectStemType(file.name);
  form.elements["notes"].value = detectVersion(file.name);
}

// ------------------------------------------------------------
// IMPORT FORM
// ------------------------------------------------------------

function setupImportForm() {
  fileInput.addEventListener("change", previewFirstFile);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const role = form.elements["role"].value;
    const notes = form.elements["notes"].value.trim();
    const files = fileInput.files;

    if (!files.length) {
      alert("Upload at least one audio file.");
      return;
    }

    // Session grouping
    const session = groupFilesIntoSession(files);

    for (let file of files) {
      const work = {
        id: crypto.randomUUID(),
        title: autoTitleFromFilename(file.name),
        role: detectStemType(file.name) || role,
        notes: detectVersion(file.name) || notes,
        createdAt: Date.now(),
        audioBlob: file,
        audioType: file.type,
        audioSize: file.size,
        sessionId: session.id,
        progress: {
          pro_registered: false,
          mechanical_registered: false,
          copyright_registered: false,
          neighboring_registered: false,
          split_sheet: false
        },
        studioState: {}
      };

      await RRDB.saveWork(work);
    }

    form.reset();
    waveformCanvas.getContext("2d").clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    renderWorksList();
    alert("Your mixes have been saved to your Works catalog.");
  });
}

// ------------------------------------------------------------
// WORKS LIST
// ------------------------------------------------------------

function renderWorksList() {
  RRDB.getAllWorks().then((works) => {
    worksList.innerHTML = "";

    works
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
      .forEach((work) => {
        const div = document.createElement("div");
        div.className = "work-card";
        div.dataset.id = work.id;

        const audioUrl = work.audioBlob ? URL.createObjectURL(work.audioBlob) : "";

        div.innerHTML = `
          <h3>${work.title}</h3>
          <p>${work.role || ""}</p>
          ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : ""}

          <div style="margin-top:0.5rem;">
            <button class="bubble-btn" data-action="studio">Open in Studio</button>
            <button class="bubble-btn" data-action="export" style="background:#c80;color:#000;">Export</button>
            <button class="bubble-btn" data-action="delete" style="background:#400;color:#fff;">Delete</button>
          </div>
        `;

        worksList.appendChild(div);
      });
  });
}

// ------------------------------------------------------------
// LIST ACTIONS
// ------------------------------------------------------------

function handleListClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.closest(".work-card").dataset.id;
  const action = btn.dataset.action;

  if (action === "studio") {
    RRDB.getWorkById(id).then((work) => {
      if (!work || !work.audioBlob) {
        alert("This work has no audio to send to the studio.");
        return;
      }

      const evt = new CustomEvent("RR_STUDIO_LOAD_WORK", {
        detail: {
          id: work.id,
          title: work.title,
          blob: work.audioBlob,
        },
      });
      window.dispatchEvent(evt);
    });
  }

  if (action === "export") {
    RRDB.getWorkById(id).then((work) => {
      if (!work) return;
      exportWork(work);
    });
  }

  if (action === "delete") {
    if (!confirm("Delete this work?")) return;
    RRDB.deleteWork(id).then(renderWorksList);
  }
}

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

function init() {
  setupImportForm();
  renderWorksList();
  worksList.addEventListener("click", handleListClick);
}

document.addEventListener("DOMContentLoaded", init);

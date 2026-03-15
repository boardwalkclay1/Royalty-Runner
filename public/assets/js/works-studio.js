// public/assets/js/works-studio.js
// ROYALTY RUNNER — WORKS STUDIO CORE v3 (ES MODULE)
// Integrates waveform preview, auto metadata, BPM/key detection,
// session grouping, export engine, and Studio Engine loading.

import { decodeAudio, getAudioMetadata, drawWaveform } from "./studio-waveform.js";
import { autoTitleFromFilename, detectStemType, detectVersion, estimateBPM, estimateKey } from "./studio-intelligence.js";
import { groupFilesIntoSession } from "./session-engine.js";
import { exportWork } from "./studio-export.js";

const form = document.getElementById("work-form");
const worksList = document.getElementById("works-list");
const resetBtn = document.getElementById("reset-work-form");
const waveformCanvas = document.getElementById("waveform-preview");

let mediaRecorder = null;
let recordedChunks = [];
let currentAudioBlob = null;
let currentAudioBuffer = null;

// ------------------------------------------------------------
// RECORDING ENGINE
// ------------------------------------------------------------

async function ensureMediaRecorder() {
  if (mediaRecorder) return mediaRecorder;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    if (recordedChunks.length > 0) {
      currentAudioBlob = new Blob(recordedChunks, { type: "audio/webm" });
      loadWaveform(currentAudioBlob);
    }
  };

  return mediaRecorder;
}

function injectRecordButton() {
  const audioLabel = form.querySelector('input[name="audio"]').parentElement;
  const recordBtn = document.createElement("button");
  recordBtn.type = "button";
  recordBtn.className = "bubble-btn";
  recordBtn.textContent = "Start Recording";

  let recording = false;

  recordBtn.addEventListener("click", async () => {
    const rec = await ensureMediaRecorder();

    if (!recording) {
      recordedChunks = [];
      currentAudioBlob = null;
      rec.start();
      recording = true;
      recordBtn.textContent = "Stop Recording";
    } else {
      rec.stop();
      recording = false;
      recordBtn.textContent = "Start Recording";
    }
  });

  audioLabel.insertAdjacentElement("afterend", recordBtn);
}

// ------------------------------------------------------------
// WAVEFORM + INTELLIGENCE
// ------------------------------------------------------------

async function loadWaveform(blob) {
  if (!blob) return;

  currentAudioBuffer = await decodeAudio(blob);
  drawWaveform(waveformCanvas, currentAudioBuffer);

  const meta = getAudioMetadata(currentAudioBuffer);
  const bpm = estimateBPM(currentAudioBuffer);
  const key = estimateKey(currentAudioBuffer);

  document.getElementById("meta-duration").textContent = meta.duration.toFixed(2) + "s";
  document.getElementById("meta-samplerate").textContent = meta.sampleRate + " Hz";
  document.getElementById("meta-channels").textContent = meta.channels;
  document.getElementById("meta-peak").textContent = meta.peak.toFixed(3);
  document.getElementById("meta-rms").textContent = meta.rms.toFixed(3);
  document.getElementById("meta-bpm").textContent = bpm || "—";
  document.getElementById("meta-key").textContent = key || "—";
}

// ------------------------------------------------------------
// FORM → WORK OBJECT
// ------------------------------------------------------------

function getFormDataAsWork() {
  const fd = new FormData(form);
  const id = fd.get("id") || null;

  const fileInput = form.querySelector('input[name="audio"]');
  const file = fileInput.files[0] || null;

  let audioBlob = file || currentAudioBlob;

  if (!audioBlob && !id) {
    alert("Please upload or record audio for this work.");
    return null;
  }

  const now = new Date().toISOString();

  const work = {
    id: id || crypto.randomUUID(),
    title: fd.get("title") || "",
    role: fd.get("role") || "",
    isrc: fd.get("isrc") || "",
    iswc: fd.get("iswc") || "",
    proId: fd.get("pro_id") || "",
    mlcId: fd.get("mlc_id") || "",
    releaseDate: fd.get("release_date") || "",
    notes: fd.get("notes") || "",
    progress: {
      pro_registered: !!fd.get("pro_registered"),
      mechanical_registered: !!fd.get("mechanical_registered"),
      copyright_registered: !!fd.get("copyright_registered"),
      neighboring_registered: !!fd.get("neighboring_registered"),
      split_sheet: !!fd.get("split_sheet"),
    },
    studioState: {},
    createdAt: id ? (form.dataset.createdAt || now) : now,
    updatedAt: now,
  };

  if (audioBlob) {
    work.audioBlob = audioBlob;
    work.audioType = audioBlob.type || "audio/unknown";
    work.audioSize = audioBlob.size || 0;
  }

  return work;
}

// ------------------------------------------------------------
// AUTO METADATA ON FILE UPLOAD
// ------------------------------------------------------------

function setupAutoMetadata() {
  const fileInput = form.querySelector('input[name="audio"]');

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    currentAudioBlob = file;

    form.elements["title"].value = autoTitleFromFilename(file.name);
    form.elements["role"].value = detectStemType(file.name);

    loadWaveform(file);
  });
}

// ------------------------------------------------------------
// FORM FILLING
// ------------------------------------------------------------

function fillFormFromWork(work) {
  form.elements["id"].value = work.id || "";
  form.elements["title"].value = work.title || "";
  form.elements["role"].value = work.role || "Artist";
  form.elements["isrc"].value = work.isrc || "";
  form.elements["iswc"].value = work.iswc || "";
  form.elements["pro_id"].value = work.proId || "";
  form.elements["mlc_id"].value = work.mlcId || "";
  form.elements["release_date"].value = work.releaseDate || "";
  form.elements["notes"].value = work.notes || "";

  form.elements["pro_registered"].checked = work.progress?.pro_registered || false;
  form.elements["mechanical_registered"].checked = work.progress?.mechanical_registered || false;
  form.elements["copyright_registered"].checked = work.progress?.copyright_registered || false;
  form.elements["neighboring_registered"].checked = work.progress?.neighboring_registered || false;
  form.elements["split_sheet"].checked = work.progress?.split_sheet || false;

  currentAudioBlob = work.audioBlob || null;
  if (currentAudioBlob) loadWaveform(currentAudioBlob);

  const fileInput = form.querySelector('input[name="audio"]');
  if (fileInput) fileInput.value = "";
}

function resetForm() {
  form.reset();
  form.elements["id"].value = "";
  currentAudioBlob = null;
  recordedChunks = [];
  waveformCanvas.getContext("2d").clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
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
        const card = document.createElement("div");
        card.className = "work-card";
        card.dataset.id = work.id;

        let audioUrl = work.audioBlob ? URL.createObjectURL(work.audioBlob) : "";

        card.innerHTML = `
          <h4>${work.title || "(Untitled Work)"}</h4>
          <p>${work.role || ""}</p>
          ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : "<p>No audio attached.</p>"}

          <div style="margin-top:0.5rem;">
            <button type="button" class="bubble-btn" data-action="edit">Edit</button>
            <button type="button" class="bubble-btn" data-action="studio" style="background:#0a4;color:#000;">Open in Studio</button>
            <button type="button" class="bubble-btn" data-action="export" style="background:#c80;color:#000;">Export</button>
            <button type="button" class="bubble-btn" data-action="delete" style="background:#400;color:#fff;">Delete</button>
          </div>
        `;

        worksList.appendChild(card);
      });
  });
}

// ------------------------------------------------------------
// LIST ACTIONS
// ------------------------------------------------------------

function handleWorksListClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const card = btn.closest(".work-card");
  const id = card?.dataset.id;
  if (!id) return;

  const action = btn.dataset.action;

  if (action === "edit") {
    RRDB.getWorkById(id).then((work) => {
      if (!work) return;
      fillFormFromWork(work);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (action === "studio") {
    RRDB.getWorkById(id).then((work) => {
      if (!work || !work.audioBlob) {
        alert("This work has no audio to send to the studio.");
        return;
      }

      const evt = new CustomEvent("RR_STUDIO_LOAD_WORK", {
        detail: {
          id: work.id,
          title: work.title || "Untitled Work",
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
    RRDB.deleteWork(id).then(() => {
      renderWorksList();
      if (form.elements["id"].value === id) resetForm();
    });
  }
}

// ------------------------------------------------------------
// FORM SUBMIT
// ------------------------------------------------------------

function handleFormSubmit(e) {
  e.preventDefault();
  const work = getFormDataAsWork();
  if (!work) return;

  RRDB.saveWork(work).then(() => {
    resetForm();
    renderWorksList();
    alert("Work saved.");
  });
}

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

function init() {
  injectRecordButton();
  setupAutoMetadata();
  renderWorksList();

  form.addEventListener("submit", handleFormSubmit);
  worksList.addEventListener("click", handleWorksListClick);
  if (resetBtn) resetBtn.addEventListener("click", resetForm);
}

init();

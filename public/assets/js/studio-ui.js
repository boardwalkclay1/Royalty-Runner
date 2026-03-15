// public/assets/js/studio-ui.js
// ROYALTY RUNNER — STUDIO UI v3
// High‑level mixer UI for RRStudioEngine: tracks, mute/solo, remove,
// basic transport, master controls, and integration with Works (RR_STUDIO_LOAD_WORK).

import { RRStudioEngine } from "./studio-engine.js";

document.addEventListener("DOMContentLoaded", () => {
  const engine = new RRStudioEngine();

  // DOM refs
  const fileInput = document.getElementById("studio-file-input");
  const tracksContainer = document.getElementById("studio-tracks");
  const playBtn = document.getElementById("studio-play");
  const stopBtn = document.getElementById("studio-stop");
  const masterVol = document.getElementById("studio-master-volume");

  const masterHighBoost = document.getElementById("studio-master-high");
  const playFromStartBtn = document.getElementById("studio-play-start");
  const loopToggle = document.getElementById("studio-loop-toggle");

  let isPlaying = false;
  let loopEnabled = false;

  // ------------------------------------------------------------
  // FILE LOADING (LOCAL)
  // ------------------------------------------------------------

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const files = Array.from(fileInput.files || []);
      for (const f of files) {
        const track = await engine.addTrackFromFile(f);
        addTrackUI(track);
      }
      fileInput.value = "";
    });
  }

  // ------------------------------------------------------------
  // LOAD FROM WORKS (RR_STUDIO_LOAD_WORK)
  // ------------------------------------------------------------

  window.addEventListener("RR_STUDIO_LOAD_WORK", async (e) => {
    const { id, title, blob } = e.detail || {};
    if (!blob) return;

    const track = await engine.addTrackFromBlob(blob, title || `Work ${id || ""}`);
    addTrackUI(track);
    scrollToStudio();
  });

  function scrollToStudio() {
    const studioSection = document.getElementById("studio-shell");
    if (!studioSection) return;
    studioSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ------------------------------------------------------------
  // TRACK UI
  // ------------------------------------------------------------

  function addTrackUI(track) {
    const row = document.createElement("div");
    row.className = "studio-track-row";
    row.dataset.id = track.id;

    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${track.name}</strong>
        <button type="button" class="bubble-btn studio-remove" style="background:#400;color:#fff;padding:0.2rem 0.6rem;font-size:0.8rem;">X</button>
      </div>

      <div style="margin-top:0.4rem;">
        Vol:
        <input type="range" min="0" max="1" step="0.01" value="${track.volume ?? 0.8}" class="track-vol">
        Pan:
        <input type="range" min="-1" max="1" step="0.01" value="${track.pan ?? 0}" class="track-pan">
      </div>

      <div style="margin-top:0.4rem;">
        <label><input type="checkbox" class="track-mute"> Mute</label>
        <label style="margin-left:0.75rem;"><input type="checkbox" class="track-solo"> Solo</label>
      </div>

      <div class="studio-meter" style="margin-top:0.4rem;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
        <div class="studio-meter-fill" style="height:100%;width:0%;background:var(--copper);"></div>
      </div>
    `;

    const vol = row.querySelector(".track-vol");
    const pan = row.querySelector(".track-pan");
    const mute = row.querySelector(".track-mute");
    const solo = row.querySelector(".track-solo");
    const removeBtn = row.querySelector(".studio-remove");

    vol.addEventListener("input", () => {
      const v = parseFloat(vol.value);
      engine.setTrackVolume(track.id, v);
      track._uiVolume = v;
      refreshSoloMuteState();
    });

    pan.addEventListener("input", () => {
      engine.setTrackPan(track.id, parseFloat(pan.value));
    });

    mute.addEventListener("change", () => {
      setTrackMute(track.id, mute.checked);
      refreshSoloMuteState();
    });

    solo.addEventListener("change", () => {
      setTrackSolo(track.id, solo.checked);
      refreshSoloMuteState();
    });

    removeBtn.addEventListener("click", () => {
      removeTrack(track.id, row);
    });

    tracksContainer.appendChild(row);
  }

  function setTrackMute(id, muted) {
    const t = engine.tracks.find(tr => tr.id === id);
    if (!t) return;
    t.muted = muted;
  }

  function setTrackSolo(id, solo) {
    const t = engine.tracks.find(tr => tr.id === id);
    if (!t) return;
    t.solo = solo;
  }

  function refreshSoloMuteState() {
    const anySolo = engine.tracks.some(t => t.solo);
    engine.tracks.forEach(t => {
      const baseVol = t._uiVolume ?? 0.8;

      if (anySolo) {
        t.gainNode.gain.value = t.solo && !t.muted ? baseVol : 0;
      } else {
        t.gainNode.gain.value = t.muted ? 0 : baseVol;
      }
    });
  }

  function removeTrack(id, rowEl) {
    engine.stopAll();
    engine.removeTrack(id);
    if (rowEl && rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
    refreshSoloMuteState();
  }

  // ------------------------------------------------------------
  // TRANSPORT
  // ------------------------------------------------------------

  playBtn?.addEventListener("click", () => {
    if (!isPlaying) {
      engine.playAll(0, { loop: loopEnabled });
      isPlaying = true;
    } else {
      engine.stopAll();
      isPlaying = false;
    }
  });

  stopBtn?.addEventListener("click", () => {
    engine.stopAll();
    isPlaying = false;
  });

  playFromStartBtn?.addEventListener("click", () => {
    engine.stopAll();
    engine.playAll(0, { loop: loopEnabled });
    isPlaying = true;
  });

  loopToggle?.addEventListener("change", () => {
    loopEnabled = loopToggle.checked;
    engine.setLoop(loopEnabled);
  });

  // ------------------------------------------------------------
  // MASTER CONTROLS
  // ------------------------------------------------------------

  masterVol?.addEventListener("input", () => {
    engine.setMasterVolume(parseFloat(masterVol.value));
  });

  masterHighBoost?.addEventListener("input", () => {
    engine.setMasterHighBoost(parseFloat(masterHighBoost.value));
  });

  // ------------------------------------------------------------
  // SIMPLE METER ANIMATION (visual only)
  // ------------------------------------------------------------

  function animateMeters() {
    const rows = tracksContainer.querySelectorAll(".studio-track-row");
    rows.forEach(row => {
      const fill = row.querySelector(".studio-meter-fill");
      if (!fill) return;
      const randomLevel = isPlaying ? Math.random() * 100 : 0;
      fill.style.width = `${randomLevel}%`;
    });
    requestAnimationFrame(animateMeters);
  }

  animateMeters();
});

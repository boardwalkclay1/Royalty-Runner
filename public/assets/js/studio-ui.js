// ROYALTY RUNNER — STUDIO UI (wires DOM to RRStudioEngine)

import { RRStudioEngine } from "./studio-engine.js";

document.addEventListener("DOMContentLoaded", () => {
  const engine = new RRStudioEngine();

  const fileInput = document.getElementById("studio-file-input");
  const tracksContainer = document.getElementById("studio-tracks");
  const playBtn = document.getElementById("studio-play");
  const stopBtn = document.getElementById("studio-stop");
  const masterVol = document.getElementById("studio-master-volume");

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    for (const f of files) {
      const track = await engine.addTrackFromFile(f);
      addTrackUI(track);
    }
    fileInput.value = "";
  });

  function addTrackUI(track) {
    const row = document.createElement("div");
    row.className = "studio-track-row";
    row.dataset.id = track.id;

    row.innerHTML = `
      <strong>${track.name}</strong><br/>
      Vol: <input type="range" min="0" max="1" step="0.01" value="0.8" class="track-vol">
      Pan: <input type="range" min="-1" max="1" step="0.01" value="0" class="track-pan">
    `;

    const vol = row.querySelector(".track-vol");
    const pan = row.querySelector(".track-pan");

    vol.addEventListener("input", () => {
      engine.setTrackVolume(track.id, parseFloat(vol.value));
    });

    pan.addEventListener("input", () => {
      engine.setTrackPan(track.id, parseFloat(pan.value));
    });

    tracksContainer.appendChild(row);
  }

  playBtn.addEventListener("click", () => {
    engine.playAll(0);
  });

  stopBtn.addEventListener("click", () => {
    engine.stopAll();
  });

  masterVol.addEventListener("input", () => {
    engine.setMasterVolume(parseFloat(masterVol.value));
  });
});

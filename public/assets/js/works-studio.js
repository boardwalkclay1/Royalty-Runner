// assets/js/works-studio.js
// ROYALTY RUNNER — WORKS STUDIO CORE v2
// Handles: form wiring, recording, saving, progress, list rendering,
// and piping a Work’s audio into the Studio Player (RRStudioEngine).

(function () {
  const form = document.getElementById("work-form");
  const worksList = document.getElementById("works-list");
  const resetBtn = document.getElementById("reset-work-form");

  let mediaRecorder = null;
  let recordedChunks = [];
  let currentAudioBlob = null;

  // ---- RECORDING CORE ----

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

  // ---- FORM <-> WORK OBJECT ----

  function getFormDataAsWork() {
    const fd = new FormData(form);
    const id = fd.get("id") || null;

    const fileInput = form.querySelector('input[name="audio"]');
    const file = fileInput.files[0] || null;

    let audioBlob = null;
    if (file) {
      // Prefer modern formats (webm/wav), but allow any audio/*
      audioBlob = file;
    } else if (currentAudioBlob) {
      audioBlob = currentAudioBlob;
    }

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
      studioState: {}, // reserved for future studio metadata
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
    const fileInput = form.querySelector('input[name="audio"]');
    if (fileInput) fileInput.value = "";
  }

  function resetForm() {
    form.reset();
    form.elements["id"].value = "";
    currentAudioBlob = null;
    recordedChunks = [];
  }

  // ---- RENDER WORKS LIST ----

  function renderWorksList() {
    RRDB.getAllWorks().then((works) => {
      worksList.innerHTML = "";

      works
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        .forEach((work) => {
          const card = document.createElement("div");
          card.className = "work-card";
          card.dataset.id = work.id;

          let audioUrl = "";
          if (work.audioBlob) {
            audioUrl = URL.createObjectURL(work.audioBlob);
          }

          const created = work.createdAt ? new Date(work.createdAt).toLocaleString() : "";
          const updated = work.updatedAt ? new Date(work.updatedAt).toLocaleString() : "";
          const sizeKb = work.audioSize ? (work.audioSize / 1024).toFixed(1) : null;

          card.innerHTML = `
            <h4>${work.title || "(Untitled Work)"}</h4>
            <p>${work.role || ""}</p>
            <p>
              <small>Created: ${created}</small><br>
              <small>Updated: ${updated}</small><br>
              ${sizeKb ? `<small>Audio: ${sizeKb} KB</small>` : ""}
            </p>
            ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : "<p>No audio attached.</p>"}

            <div style="margin-top:0.5rem;">
              <strong>Progress:</strong><br/>
              <label><input type="checkbox" data-field="pro_registered" ${work.progress?.pro_registered ? "checked" : ""}> PRO</label>
              <label><input type="checkbox" data-field="mechanical_registered" ${work.progress?.mechanical_registered ? "checked" : ""}> MLC</label>
              <label><input type="checkbox" data-field="copyright_registered" ${work.progress?.copyright_registered ? "checked" : ""}> Copyright</label>
              <label><input type="checkbox" data-field="neighboring_registered" ${work.progress?.neighboring_registered ? "checked" : ""}> SoundExchange</label>
              <label><input type="checkbox" data-field="split_sheet" ${work.progress?.split_sheet ? "checked" : ""}> Split Sheet</label>
            </div>

            <div style="margin-top:0.5rem;">
              <button type="button" class="bubble-btn" data-action="edit">Edit</button>
              <button type="button" class="bubble-btn" data-action="studio" style="background:#0a4;color:#000;">Open in Studio</button>
              <button type="button" class="bubble-btn" data-action="delete" style="background:#400;color:#fff;">Delete</button>
            </div>
          `;

          worksList.appendChild(card);
        });
    });
  }

  // ---- LIST INTERACTIONS ----

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

        // Dispatch a custom event so the Studio Player can pick it up
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

    if (action === "delete") {
      if (!confirm("Delete this work from your studio and catalog?")) return;
      RRDB.deleteWork(id).then(() => {
        renderWorksList();
        const currentId = form.elements["id"].value;
        if (currentId === id) resetForm();
      });
    }
  }

  function handleProgressChange(e) {
    const checkbox = e.target.closest("input[type='checkbox'][data-field]");
    if (!checkbox) return;

    const card = checkbox.closest(".work-card");
    const id = card?.dataset.id;
    if (!id) return;

    const field = checkbox.dataset.field;
    const value = checkbox.checked;

    RRDB.updateWorkProgress(id, field, value);
  }

  // ---- FORM SUBMIT ----

  function handleFormSubmit(e) {
    e.preventDefault();
    const work = getFormDataAsWork();
    if (!work) return;

    RRDB.saveWork(work).then(() => {
      resetForm();
      renderWorksList();
      alert("Work saved to your studio catalog.");
    });
  }

  // ---- INIT ----

  function init() {
    injectRecordButton();
    renderWorksList();

    form.addEventListener("submit", handleFormSubmit);
    worksList.addEventListener("click", handleWorksListClick);
    worksList.addEventListener("change", handleProgressChange);
    if (resetBtn) resetBtn.addEventListener("click", resetForm);
  }

  init();
})();

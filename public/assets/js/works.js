// WORKS MANAGER ENGINE — IndexedDB + WAV Storage

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("work-form");
  const listEl = document.getElementById("works-list");

  // SAVE WORK
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const audioFile = data.get("audio");

    if (!audioFile || audioFile.type !== "audio/wav") {
      alert("Please upload a WAV file.");
      return;
    }

    const audioBuffer = await audioFile.arrayBuffer();

    const work = {
      id: crypto.randomUUID(),
      title: data.get("title"),
      role: data.get("role"),
      isrc: data.get("isrc"),
      iswc: data.get("iswc"),
      pro_id: data.get("pro_id"),
      mlc_id: data.get("mlc_id"),
      release_date: data.get("release_date"),
      notes: data.get("notes"),
      protection: {
        pro: data.get("pro_registered") ? true : false,
        mechanical: data.get("mechanical_registered") ? true : false,
        copyright: data.get("copyright_registered") ? true : false,
        neighboring: data.get("neighboring_registered") ? true : false,
        split: data.get("split_sheet") ? true : false,
      },
      audio: {
        name: audioFile.name,
        type: audioFile.type,
        data: audioBuffer
      },
      savedAt: new Date().toISOString()
    };

    await window.dbSet("works", work.id, work);

    form.reset();
    loadWorks();
  });

  // LOAD WORKS
  async function loadWorks() {
    const works = await window.dbGetAll("works");
    listEl.innerHTML = "";

    works.forEach(work => {
      const card = document.createElement("div");
      card.className = "work-card";

      const blob = new Blob([work.audio.data], { type: work.audio.type });
      const url = URL.createObjectURL(blob);

      card.innerHTML = `
        <strong class="cursive" style="font-size:1.4rem;">${work.title}</strong><br/>
        Role: ${work.role}<br/>
        Saved: ${new Date(work.savedAt).toLocaleString()}<br/><br/>

        <audio controls src="${url}"></audio><br/><br/>

        <button class="bubble-btn" data-id="${work.id}" data-action="share">Share</button>
        <button class="bubble-btn" data-id="${work.id}" data-action="delete">Delete</button>
      `;

      listEl.appendChild(card);
    });

    hookButtons();
  }

  // BUTTON ACTIONS
  function hookButtons() {
    document.querySelectorAll(".bubble-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "delete") {
          await window.dbDelete("works", id);
          loadWorks();
        }

        if (action === "share") {
          const work = await window.dbGet("works", id);
          const blob = new Blob([work.audio.data], { type: work.audio.type });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = work.audio.name;
          a.click();

          URL.revokeObjectURL(url);
        }
      });
    });
  }

  loadWorks();
});

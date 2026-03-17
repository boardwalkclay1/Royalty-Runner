// Inject HTML
document.getElementById("journal-module").innerHTML = `
  <h2 class="cursive" style="font-size:1.8rem;">Journal / Lyrics Pad</h2>

  <input id="journal-title" placeholder="Title" style="width:100%; margin-bottom:1rem;" />

  <textarea id="journal-content" placeholder="Start writing..."></textarea>

  <div id="journal-status" style="margin-top:0.5rem; color:var(--copper-light);">Not saved</div>

  <button id="journal-save" style="margin-top:1rem;">Save to Catalog</button>
`;

const journalTitle = document.getElementById("journal-title");
const journalContent = document.getElementById("journal-content");
const journalStatus = document.getElementById("journal-status");
const journalSave = document.getElementById("journal-save");

let journalTimer = null;

function autosaveJournal() {
  clearTimeout(journalTimer);
  journalTimer = setTimeout(() => {
    localStorage.setItem("rr_journal_draft", JSON.stringify({
      title: journalTitle.value,
      content: journalContent.value
    }));
    journalStatus.textContent = "Draft saved";
  }, 1200);
}

journalTitle.oninput = autosaveJournal;
journalContent.oninput = autosaveJournal;

(function loadDraft() {
  const raw = localStorage.getItem("rr_journal_draft");
  if (!raw) return;
  const d = JSON.parse(raw);
  journalTitle.value = d.title || "";
  journalContent.value = d.content || "";
  journalStatus.textContent = "Draft loaded";
})();

journalSave.onclick = () => {
  const text = journalContent.value.trim();
  if (!text) {
    journalStatus.textContent = "Nothing to save";
    return;
  }

  rrAddWork({
    id: "work_" + Date.now(),
    type: "lyrics",
    title: journalTitle.value || "Untitled",
    createdAt: Date.now(),
    content: text,
    wordCount: text.split(/\s+/).filter(Boolean).length
  });

  journalStatus.textContent = "Saved to Catalog";
};

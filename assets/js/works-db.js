// Royalty Runner – Works & Protection (IndexedDB + Meter)

const DB_NAME = "royaltyRunnerDB";
const DB_VERSION = 1;
const STORE_NAME = "works";

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("title", "title", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
}

function addWork(work) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(work);

    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllWorks() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

function calculateProtectionScore(work) {
  const flags = [
    work.flagPro,
    work.flagMech,
    work.flagCopy,
    work.flagNeighbor,
    work.flagBusiness,
  ];
  const total = flags.length;
  const completed = flags.filter(Boolean).length;
  const score = Math.round((completed / total) * 100);
  return { score, completed, total };
}

function renderWorks(works) {
  const container = document.getElementById("works-list");
  container.innerHTML = "";

  if (!works.length) {
    container.innerHTML = "<p>No works saved yet. Add your first one above.</p>";
    return;
  }

  works.forEach((work) => {
    const { score, completed, total } = calculateProtectionScore(work);

    const div = document.createElement("div");
    div.className = "rr-list-item";

    div.innerHTML = `
      <strong>${work.title}</strong><br/>
      Role: ${work.role || "—"}<br/>
      ISRC: ${work.isrc || "—"} | ISWC: ${work.iswc || "—"}<br/>
      PRO Work ID: ${work.proId || "—"} | MLC ID: ${work.mlcId || "—"}<br/>
      Release Date: ${work.releaseDate || "—"}<br/>
      <br/>
      <strong>Protection Meter:</strong> ${score}% (${completed}/${total} layers)<br/>
      <small>
        Publishing & PROs: ${work.flagPro ? "✔" : "❌"} |
        Mechanical & Digital: ${work.flagMech ? "✔" : "❌"} |
        Copyright & Trademarks: ${work.flagCopy ? "✔" : "❌"} |
        Neighboring Rights: ${work.flagNeighbor ? "✔" : "❌"} |
        Business & Contracts: ${work.flagBusiness ? "✔" : "❌"}
      </small>
      ${work.notes ? `<br/><br/><em>Notes:</em> ${work.notes}` : ""}
    `;

    container.appendChild(div);
  });
}

function setupForm() {
  const form = document.getElementById("work-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const work = {
      title: document.getElementById("work-title").value.trim(),
      role: document.getElementById("work-role").value,
      isrc: document.getElementById("work-isrc").value.trim(),
      iswc: document.getElementById("work-iswc").value.trim(),
      proId: document.getElementById("work-pro-id").value.trim(),
      mlcId: document.getElementById("work-mlc-id").value.trim(),
      releaseDate: document.getElementById("work-release-date").value,
      notes: document.getElementById("work-notes").value.trim(),
      flagPro: document.getElementById("flag-pro").checked,
      flagMech: document.getElementById("flag-mech").checked,
      flagCopy: document.getElementById("flag-copy").checked,
      flagNeighbor: document.getElementById("flag-neighbor").checked,
      flagBusiness: document.getElementById("flag-business").checked,
      createdAt: new Date().toISOString(),
    };

    if (!work.title) {
      alert("Title is required.");
      return;
    }

    try {
      await addWork(work);
      form.reset();
      const works = await getAllWorks();
      renderWorks(works);
    } catch (err) {
      console.error("Error saving work:", err);
      alert("Could not save work locally.");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await openDB();
    setupForm();
    const works = await getAllWorks();
    renderWorks(works);
  } catch (err) {
    console.error("Failed to initialize Works DB:", err);
  }
});

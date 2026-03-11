// --- Service worker registration ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

// --- IndexedDB setup ---
const DB_NAME = "royaltyAppDB";
const DB_VERSION = 1;
let db;

const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);

dbRequest.onupgradeneeded = (event) => {
  const db = event.target.result;

  if (!db.objectStoreNames.contains("profile")) {
    db.createObjectStore("profile", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("works")) {
    db.createObjectStore("works", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("forms")) {
    db.createObjectStore("forms", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("settings")) {
    db.createObjectStore("settings", { keyPath: "key" });
  }
};

dbRequest.onsuccess = (event) => {
  db = event.target.result;
  initPage();
};

dbRequest.onerror = () => {
  console.error("Failed to open IndexedDB");
};

// --- Simple helpers ---
function dbTx(storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    const req = dbTx(store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = dbTx(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, value) {
  return new Promise((resolve, reject) => {
    const req = dbTx(store, "readwrite").put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const req = dbTx(store, "readwrite").delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- Hidden premium tier wiring (not shown in UI yet) ---
async function getPremiumStatus() {
  const setting = await dbGet("settings", "premium");
  return setting?.value === true;
}

async function setPremiumStatus(value) {
  await dbPut("settings", { key: "premium", value: !!value });
}

// --- Page router ---
function initPage() {
  const page = document.documentElement.getAttribute("data-page");
  if (!page) return;

  switch (page) {
    case "profile":
      initProfilePage();
      break;
    case "works":
      initWorksPage();
      break;
    case "royalties":
      initRoyaltiesPage();
      break;
    case "catalog":
      initCatalogPage();
      break;
    case "export":
      initExportPage();
      break;
    case "index":
    default:
      // nothing special yet
      break;
  }
}

// --- Profile page ---
async function initProfilePage() {
  const form = document.getElementById("profile-form");
  const deleteBtn = document.getElementById("delete-profile");

  const existing = await dbGet("profile", "artist");
  if (existing) {
    form.legalName.value = existing.legalName || "";
    form.stageName.value = existing.stageName || "";
    form.email.value = existing.email || "";
    form.pro.value = existing.pro || "";
    form.ipi.value = existing.ipi || "";
    form.publisher.value = existing.publisher || "";
    form.country.value = existing.country || "";
    form.address.value = existing.address || "";
    form.socials.value = existing.socials || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      id: "artist",
      legalName: form.legalName.value.trim(),
      stageName: form.stageName.value.trim(),
      email: form.email.value.trim(),
      pro: form.pro.value.trim(),
      ipi: form.ipi.value.trim(),
      publisher: form.publisher.value.trim(),
      country: form.country.value.trim(),
      address: form.address.value.trim(),
      socials: form.socials.value.trim()
    };
    await dbPut("profile", data);
    alert("Profile saved locally in this browser.");
  });

  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Delete your profile from this browser? This cannot be undone.")) return;
    await dbDelete("profile", "artist");
    form.reset();
    alert("Profile deleted from this browser.");
  });
}

// --- Works page ---
async function initWorksPage() {
  const form = document.getElementById("work-form");
  const list = document.getElementById("works-list");

  async function renderWorks() {
    const works = await dbGetAll("works");
    list.innerHTML = "";
    if (!works.length) {
      list.innerHTML = "<li>No works added yet.</li>";
      return;
    }
    works.forEach((work) => {
      const li = document.createElement("li");
      li.className = "rr-list-item";
      li.innerHTML = `
        <div>
          <strong>${work.title}</strong>
          ${work.isrc ? ` – ISRC: ${work.isrc}` : ""}
          ${work.releaseDate ? ` – Released: ${work.releaseDate}` : ""}
        </div>
        <button data-id="${work.id}" class="delete-work">Delete</button>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll(".delete-work").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!confirm("Delete this work?")) return;
        await dbDelete("works", id);
        renderWorks();
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      title: form.title.value.trim(),
      isrc: form.isrc.value.trim(),
      releaseDate: form.releaseDate.value,
      writers: form.writers.value.trim(),
      notes: form.notes.value.trim()
    };
    await dbPut("works", data);
    form.reset();
    renderWorks();
  });

  renderWorks();
}

// --- Royalty forms page ---
async function initRoyaltiesPage() {
  const workSelect = document.getElementById("royalty-work-select");
  const destSelect = document.getElementById("royalty-destination");
  const form = document.getElementById("royalty-form");
  const output = document.getElementById("royalty-output");
  const copyBtn = document.getElementById("copy-royalty-output");

  const works = await dbGetAll("works");
  workSelect.innerHTML = "";
  if (!works.length) {
    workSelect.innerHTML = `<option value="">No works yet – add one first.</option>`;
  } else {
    workSelect.innerHTML = `<option value="">Select a work</option>`;
    works.forEach((w) => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = w.title;
      workSelect.appendChild(opt);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const workId = Number(workSelect.value);
    const destination = destSelect.value;
    if (!workId || !destination) return;

    const profile = await dbGet("profile", "artist");
    const work = await dbGet("works", workId);

    if (!profile) {
      output.value = "No profile found. Please create your artist profile first.";
      return;
    }
    if (!work) {
      output.value = "Selected work not found.";
      return;
    }

    const text = buildRoyaltyText(destination, profile, work);
    output.value = text;

    // store generated form (for export / future premium metrics)
    await dbPut("forms", {
      destination,
      workId,
      createdAt: new Date().toISOString(),
      text
    });
  });

  copyBtn.addEventListener("click", () => {
    if (!output.value) return;
    navigator.clipboard.writeText(output.value).then(() => {
      alert("Form text copied to clipboard.");
    });
  });
}

function buildRoyaltyText(destination, profile, work) {
  const baseHeader = `Destination: ${destination.toUpperCase()}\nGenerated by Royalty Runner\n\n`;
  const artistBlock = [
    `Artist legal name: ${profile.legalName || ""}`,
    `Stage name: ${profile.stageName || ""}`,
    `Email: ${profile.email || ""}`,
    `PRO: ${profile.pro || ""}`,
    `IPI/CAE: ${profile.ipi || ""}`,
    `Publisher: ${profile.publisher || ""}`,
    `Country: ${profile.country || ""}`,
    `Address: ${profile.address || ""}`
  ].join("\n");

  const workBlock = [
    `Work title: ${work.title || ""}`,
    `ISRC: ${work.isrc || ""}`,
    `Release date: ${work.releaseDate || ""}`,
    `Writers / splits: ${work.writers || ""}`,
    `Notes / links: ${work.notes || ""}`
  ].join("\n");

  return `${baseHeader}${artistBlock}\n\n${workBlock}\n`;
}

// --- Catalog page ---
function initCatalogPage() {
  const searchInput = document.getElementById("catalog-search");
  const listEl = document.getElementById("catalog-list");
  const lettersEl = document.getElementById("catalog-letters");

  const entries = getCatalogEntries();
  renderLetters(entries, lettersEl);
  renderCatalog(entries, listEl);

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const filtered = entries.filter((e) => {
      return (
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.region.toLowerCase().includes(q)
      );
    });
    renderCatalog(filtered, listEl);
  });
}

function renderLetters(entries, container) {
  const letters = Array.from(new Set(entries.map((e) => e.name[0].toUpperCase()))).sort();
  container.innerHTML = "";
  letters.forEach((letter) => {
    const btn = document.createElement("button");
    btn.textContent = letter;
    btn.className = "letter-button";
    btn.addEventListener("click", () => {
      const target = document.querySelector(`[data-letter="${letter}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
    container.appendChild(btn);
  });
}

function renderCatalog(entries, container) {
  container.innerHTML = "";
  let currentLetter = null;

  entries
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((entry) => {
      const letter = entry.name[0].toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        const h2 = document.createElement("h2");
        h2.textContent = letter;
        h2.setAttribute("data-letter", letter);
        container.appendChild(h2);
      }

      const card = document.createElement("article");
      card.className = "catalog-card";
      card.innerHTML = `
        <h3>${entry.name}</h3>
        <p><strong>Type:</strong> ${entry.type}</p>
        <p><strong>Region:</strong> ${entry.region}</p>
        <p>${entry.description}</p>
        <p><strong>Who should sign up:</strong> ${entry.who}</p>
        <p><strong>What you need:</strong> ${entry.requirements}</p>
      `;
      container.appendChild(card);
    });
}

function getCatalogEntries() {
  return [
    {
      name: "ASCAP",
      type: "PRO – performance royalties",
      region: "USA",
      description: "Collects performance royalties for songwriters and publishers when music is played publicly.",
      who: "Songwriters and publishers with songs being streamed, broadcast, or performed live.",
      requirements: "Legal name, contact info, tax info, bank details, song information."
    },
    {
      name: "BMI",
      type: "PRO – performance royalties",
      region: "USA",
      description: "Collects performance royalties for songwriters, composers, and publishers.",
      who: "Songwriters and publishers with music on streaming platforms, radio, or TV.",
      requirements: "Legal name, contact info, tax info, song information."
    },
    {
      name: "SoundExchange",
      type: "Digital performance royalties",
      region: "USA",
      description: "Pays digital performance royalties to featured artists and rights owners for non‑interactive streams.",
      who: "Recording artists and rights owners with music on internet radio and certain streaming services.",
      requirements: "Legal name, recording info, ISRCs if available, tax and payment info."
    },
    {
      name: "Mechanical Licensing Collective (MLC)",
      type: "Mechanical royalties",
      region: "USA",
      description: "Collects and distributes mechanical royalties for eligible streaming services in the U.S.",
      who: "Songwriters and publishers with songs on major streaming platforms.",
      requirements: "Song data, writer splits, publishing info, tax and payment info."
    },
    {
      name: "YouTube Content ID",
      type: "Digital fingerprinting",
      region: "Global",
      description: "Identifies and monetizes uses of your music on YouTube through fingerprinting.",
      who: "Artists and rights holders with original recordings used on YouTube.",
      requirements: "Audio files, ownership proof, metadata, and distribution partner or admin."
    },
    {
      name: "Spotify for Artists",
      type: "Analytics / metadata",
      region: "Global",
      description: "Provides analytics and profile control for your artist presence on Spotify.",
      who: "Artists with music distributed to Spotify.",
      requirements: "Spotify account, artist verification, basic profile info."
    },
    {
      name: "Apple Music for Artists",
      type: "Analytics / metadata",
      region: "Global",
      description: "Provides analytics and profile tools for Apple Music.",
      who: "Artists with music on Apple Music.",
      requirements: "Apple ID, artist verification, basic profile info."
    },
    {
      name: "Songtrust",
      type: "Publishing administration",
      region: "Global",
      description: "Collects publishing royalties from multiple sources worldwide.",
      who: "Songwriters who want a single admin to collect global publishing royalties.",
      requirements: "Song catalog, splits, personal and tax info."
    },
    {
      name: "PRS for Music",
      type: "PRO – performance royalties",
      region: "UK",
      description: "Collects performance royalties for songwriters and publishers in the UK and beyond.",
      who: "Songwriters and publishers with UK or international usage.",
      requirements: "Personal details, song info, membership application."
    },
    {
      name: "PPL",
      type: "Neighbouring rights",
      region: "UK",
      description: "Collects neighbouring rights royalties for performers and recording rightsholders.",
      who: "Performers and labels with recordings played in public or broadcast.",
      requirements: "Recording details, performer info, rights ownership info."
    }
  ];
}

// --- Export page ---
async function initExportPage() {
  const profileBtn = document.getElementById("export-profile");
  const worksBtn = document.getElementById("export-works");
  const formsBtn = document.getElementById("export-forms");

  const profileOut = document.getElementById("export-profile-output");
  const worksOut = document.getElementById("export-works-output");
  const formsOut = document.getElementById("export-forms-output");

  profileBtn.addEventListener("click", async () => {
    const profile = await dbGet("profile", "artist");
    profileOut.value = JSON.stringify(profile || {}, null, 2);
  });

  worksBtn.addEventListener("click", async () => {
    const works = await dbGetAll("works");
    worksOut.value = JSON.stringify(works, null, 2);
  });

  formsBtn.addEventListener("click", async () => {
    const forms = await dbGetAll("forms");
    formsOut.value = JSON.stringify(forms, null, 2);
  });
}

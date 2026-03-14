// Service worker registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

// IndexedDB setup
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

// DB helpers
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

// Premium wiring (hidden)
async function getPremiumStatus() {
  const setting = await dbGet("settings", "premium");
  return setting?.value === true;
}

async function setPremiumStatus(value) {
  await dbPut("settings", { key: "premium", value: !!value });
}

// Page router
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
      break;
  }
}

// Profile page
async function initProfilePage() {
  const form = document.getElementById("profile-form");
  const deleteBtn = document.getElementById("delete-profile");
  const missingEl = document.getElementById("profile-missing");

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
    showProfileMissing(existing, missingEl);
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
    showProfileMissing(data, missingEl);
    alert("Profile saved locally in this browser.");
  });

  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Delete your profile from this browser? This cannot be undone.")) return;
    await dbDelete("profile", "artist");
    form.reset();
    missingEl.textContent = "";
    alert("Profile deleted from this browser.");
  });
}

function showProfileMissing(profile, el) {
  const required = ["legalName", "pro", "ipi", "publisher", "country"];
  const missing = required.filter((field) => !profile[field]);
  if (!missing.length) {
    el.textContent = "Profile looks complete for most registrations.";
  } else {
    el.textContent =
      "Missing fields that some organizations may require: " + missing.join(", ") + ".";
  }
}

// Works page
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
        <button data-id="${work.id}" class="button-secondary small-button">Delete</button>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll(".small-button").forEach((btn) => {
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

// Royalty forms page
async function initRoyaltiesPage() {
  const workSelect = document.getElementById("royalty-work-select");
  const destSelect = document.getElementById("royalty-destination");
  const form = document.getElementById("royalty-form");
  const output = document.getElementById("royalty-output");
  const copyBtn = document.getElementById("copy-royalty-output");
  const oneClickBtn = document.getElementById("one-click-complete");
  const missingEl = document.getElementById("royalty-missing");

  const profile = await dbGet("profile", "artist");
  const works = await dbGetAll("works");
  const lastDest = await dbGet("settings", "lastDestination");

  // Populate works dropdown
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
    // Preselect latest work
    const latest = works[works.length - 1];
    workSelect.value = latest.id;
  }

  // Preselect last destination if available
  if (lastDest?.value) {
    destSelect.value = lastDest.value;
  }

  // Instant auto‑fill if we have profile, works, and destination
  if (profile && works.length && destSelect.value) {
    const latest = works[works.length - 1];
    const text = buildRoyaltyText(destSelect.value, profile, latest, missingEl);
    output.value = text;
  } else if (!profile) {
    missingEl.textContent = "No profile found. Create your artist profile first.";
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
      missingEl.textContent = "Profile is required for auto‑fill.";
      return;
    }
    if (!work) {
      output.value = "Selected work not found.";
      return;
    }

    const text = buildRoyaltyText(destination, profile, work, missingEl);
    output.value = text;

    await dbPut("forms", {
      destination,
      workId,
      createdAt: new Date().toISOString(),
      text
    });
    await dbPut("settings", { key: "lastDestination", value: destination });
  });

  oneClickBtn.addEventListener("click", async () => {
    const profile = await dbGet("profile", "artist");
    const works = await dbGetAll("works");
    const lastDest = await dbGet("settings", "lastDestination");

    if (!profile) {
      missingEl.textContent = "No profile found. Create your artist profile first.";
      return;
    }
    if (!works.length) {
      missingEl.textContent = "No works found. Add at least one work first.";
      return;
    }
    if (!lastDest?.value) {
      missingEl.textContent = "No last destination found. Choose a destination once, then try again.";
      return;
    }

    const latest = works[works.length - 1];
    workSelect.value = latest.id;
    destSelect.value = lastDest.value;

    const text = buildRoyaltyText(lastDest.value, profile, latest, missingEl);
    output.value = text;

    await dbPut("forms", {
      destination: lastDest.value,
      workId: latest.id,
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

function buildRoyaltyText(destination, profile, work, missingEl) {
  const missing = [];

  if (!profile.legalName) missing.push("legal name");
  if (!profile.pro) missing.push("PRO");
  if (!profile.ipi) missing.push("IPI/CAE");
  if (!work.title) missing.push("work title");

  if (missingEl) {
    if (missing.length) {
      missingEl.textContent =
        "You may want to fill these before submitting: " + missing.join(", ") + ".";
    } else {
      missingEl.textContent = "Looks good for most basic registrations.";
    }
  }

  const destLabel = {
    ascap: "ASCAP – Work Registration",
    bmi: "BMI – Work Registration",
    soundexchange: "SoundExchange – Repertoire",
    mlc: "MLC – Work Registration",
    youtube_cid: "YouTube Content ID – Metadata"
  }[destination] || destination.toUpperCase();

  const baseHeader = `Destination: ${destLabel}\nGenerated by Royalty Runner\n\n`;

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

// Catalog page
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
        ${
          entry.url
            ? `<p><a href="${entry.url}" target="_blank" class="catalog-link">Visit official site →</a></p>`
            : ""
        }
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
      description:
        "Collects performance royalties for songwriters and publishers when music is played publicly.",
      who: "Songwriters and publishers with songs being streamed, broadcast, or performed live.",
      requirements: "Legal name, contact info, tax info, bank details, song information.",
      url: "https://www.ascap.com/help/registering-your-music"
    },
    {
      name: "Apple Music for Artists",
      type: "Analytics / metadata",
      region: "Global",
      description: "Provides analytics and profile tools for Apple Music.",
      who: "Artists with music on Apple Music.",
      requirements: "Apple ID, artist verification, basic profile info.",
      url: "https://artists.apple.com/"
    },
    {
      name: "Audiam",
      type: "YouTube monetization / publishing admin",
      region: "Global",
      description: "Helps collect YouTube and other digital royalties for songwriters and publishers.",
      who: "Artists and writers with music used on YouTube and streaming platforms.",
      requirements: "Song data, ownership info, publishing details.",
      url: "https://www.audiam.com/"
    },
    {
      name: "BMI",
      type: "PRO – performance royalties",
      region: "USA",
      description:
        "Collects performance royalties for songwriters, composers, and publishers when music is used publicly.",
      who: "Songwriters and publishers with music on streaming platforms, radio, or TV.",
      requirements: "Legal name, contact info, tax info, song information.",
      url: "https://www.bmi.com/forms/works-registration"
    },
    {
      name: "Bandcamp",
      type: "Direct sales / fan support",
      region: "Global",
      description: "Platform for selling music and merch directly to fans.",
      who: "Independent artists who want direct fan support and sales.",
      requirements: "Artist profile, audio files, artwork, payment details.",
      url: "https://bandcamp.com/"
    },
    {
      name: "BeatStars Publishing",
      type: "Publishing administration",
      region: "Global",
      description: "Publishing admin service focused on producers and beat makers.",
      who: "Producers selling beats and wanting publishing royalties collected.",
      requirements: "Beat catalog, splits, personal and tax info.",
      url: "https://www.beatstars.com/publishing"
    },
    {
      name: "CD Baby Pro",
      type: "Distribution / publishing admin",
      region: "Global",
      description: "Digital distribution plus publishing administration for songwriters.",
      who: "Artists who want distribution and publishing collection in one place.",
      requirements: "Song data, splits, personal and tax info.",
      url: "https://cdbaby.com/publishing"
    },
    {
      name: "Content ID (YouTube)",
      type: "Digital fingerprinting",
      region: "Global",
      description: "Identifies and monetizes uses of your music on YouTube.",
      who: "Artists and rights holders with original recordings used on YouTube.",
      requirements: "Audio files, ownership proof, metadata, and a partner or admin.",
      url: "https://support.google.com/youtube/answer/2797370"
    },
    {
      name: "Copyright.gov",
      type: "Copyright registration",
      region: "USA",
      description: "Official U.S. copyright registration for songs and recordings.",
      who: "Songwriters and rights holders who want legal registration of their works.",
      requirements: "Work details, authorship info, deposit copy, fees.",
      url: "https://www.copyright.gov/registration/"
    },
    {
      name: "DistroKid",
      type: "Distribution",
      region: "Global",
      description: "Digital distribution to major streaming platforms.",
      who: "Artists who want fast, simple distribution.",
      requirements: "Audio, artwork, metadata, payment info.",
      url: "https://distrokid.com/"
    },
    {
      name: "Ditto Music",
      type: "Distribution / publishing admin",
      region: "Global",
      description: "Distribution and optional publishing administration.",
      who: "Artists wanting distribution with optional publishing services.",
      requirements: "Audio, artwork, metadata, personal info.",
      url: "https://www.dittomusic.com/"
    },
    {
      name: "Epidemic Sound",
      type: "Licensing / production music",
      region: "Global",
      description: "Licensing platform for creators and brands.",
      who: "Composers and producers creating catalog music for sync.",
      requirements: "Catalog submission, agreements, personal info.",
      url: "https://www.epidemicsound.com/"
    },
    {
      name: "EMPIRE",
      type: "Distribution / label services",
      region: "Global",
      description: "Distribution and label services for artists.",
      who: "Artists seeking distribution and potential label support.",
      requirements: "Music catalog, artist profile, business details.",
      url: "https://www.empire.com/"
    },
    {
      name: "Facebook Rights Manager",
      type: "Digital rights management",
      region: "Global",
      description: "Manages rights and monetization for content on Facebook and Instagram.",
      who: "Rights holders with content used on Meta platforms.",
      requirements: "Content files, ownership info, metadata.",
      url: "https://rightsmanager.fb.com/"
    },
    {
      name: "Global Music Rights (GMR)",
      type: "PRO – performance royalties",
      region: "USA",
      description: "Performance rights organization with a selective roster.",
      who: "Established songwriters and catalogs.",
      requirements: "Application, catalog, representation details.",
      url: "https://globalmusicrights.com/"
    },
    {
      name: "Harry Fox Agency (HFA)",
      type: "Mechanical licensing",
      region: "USA",
      description: "Handles mechanical licensing and royalty collection.",
      who: "Publishers and rights holders needing mechanical licensing.",
      requirements: "Song data, ownership info, agreements.",
      url: "https://www.harryfox.com/"
    },
    {
      name: "ISRC Manager",
      type: "Identifier assignment",
      region: "Global",
      description: "Assigns ISRC codes to sound recordings.",
      who: "Labels and independent artists releasing recordings.",
      requirements: "Recording info, ownership details.",
      url: "https://isrc.ifpi.org/"
    },
    {
      name: "Jaxsta",
      type: "Credits database",
      region: "Global",
      description: "Official music credits database.",
      who: "Artists, producers, and engineers wanting verified credits.",
      requirements: "Profile, credit claims, verification.",
      url: "https://www.jaxsta.com/"
    },
    {
      name: "Kobalt",
      type: "Publishing administration",
      region: "Global",
      description: "Global publishing administration and rights management.",
      who: "Songwriters and catalogs needing worldwide admin.",
      requirements: "Catalog, splits, agreements, personal info.",
      url: "https://www.kobaltmusic.com/"
    },
    {
      name: "LyricFind",
      type: "Lyric licensing",
      region: "Global",
      description: "Licenses lyrics for digital platforms.",
      who: "Publishers and rights holders controlling lyric rights.",
      requirements: "Lyric catalog, ownership info.",
      url: "https://www.lyricfind.com/"
    },
    {
      name: "Mechanical Licensing Collective (MLC)",
      type: "Mechanical royalties",
      region: "USA",
      description:
        "Collects and distributes mechanical royalties for eligible streaming services in the U.S.",
      who: "Songwriters and publishers with songs on major streaming platforms.",
      requirements: "Song data, writer splits, publishing info, tax and payment info.",
      url: "https://www.themlc.com/"
    },
    {
      name: "Music Reports",
      type: "Mechanical / digital royalties",
      region: "USA",
      description: "Licensing and royalty administration for digital services.",
      who: "Rights holders with works used by participating services.",
      requirements: "Catalog data, ownership info, agreements.",
      url: "https://www.musicreports.com/"
    },
    {
      name: "Muso.AI",
      type: "Credits / metadata",
      region: "Global",
      description: "Platform for managing and verifying music credits.",
      who: "Artists, producers, and engineers.",
      requirements: "Profile, credit claims, verification.",
      url: "https://muso.ai/"
    },
    {
      name: "NMPA",
      type: "Publishing advocacy",
      region: "USA",
      description: "Trade association representing music publishers and songwriters.",
      who: "Publishers and industry stakeholders.",
      requirements: "Membership application.",
      url: "https://www.nmpa.org/"
    },
    {
      name: "OneRPM",
      type: "Distribution / services",
      region: "Global",
      description: "Distribution and artist services platform.",
      who: "Artists seeking distribution and marketing support.",
      requirements: "Music catalog, profile, agreements.",
      url: "https://onerpm.com/"
    },
    {
      name: "PPL",
      type: "Neighbouring rights",
      region: "UK",
      description: "Collects neighbouring rights royalties for performers and recording rightsholders.",
      who: "Performers and labels with recordings played in public or broadcast.",
      requirements: "Recording details, performer info, rights ownership info.",
      url: "https://www.ppluk.com/"
    },
    {
      name: "PRS for Music",
      type: "PRO – performance royalties",
      region: "UK",
      description:
        "Collects performance royalties for songwriters and publishers in the UK and beyond.",
      who: "Songwriters and publishers with UK or international usage.",
      requirements: "Personal details, song info, membership application.",
      url: "https://www.prsformusic.com/"
    },
    {
      name: "Repost by SoundCloud",
      type: "Distribution / monetization",
      region: "Global",
      description: "Distribution and monetization service connected to SoundCloud.",
      who: "Artists using SoundCloud who want wider distribution.",
      requirements: "Music catalog, profile, payment info.",
      url: "https://repostnetwork.com/"
    },
    {
      name: "Royalty Exchange",
      type: "Royalty marketplace",
      region: "Global",
      description: "Marketplace for buying and selling royalty streams.",
      who: "Rights holders looking to sell or monetize royalties.",
      requirements: "Royalty statements, catalog info, agreements.",
      url: "https://www.royaltyexchange.com/"
    },
    {
      name: "Songtrust",
      type: "Publishing administration",
      region: "Global",
      description: "Collects publishing royalties from multiple sources worldwide.",
      who: "Songwriters who want a single admin to collect global publishing royalties.",
      requirements: "Song catalog, splits, personal and tax info.",
      url: "https://www.songtrust.com/"
    },
    {
      name: "SoundExchange",
      type: "Digital performance royalties",
      region: "USA",
      description:
        "Pays digital performance royalties to featured artists and rights owners for non‑interactive streams.",
      who: "Recording artists and rights owners with music on internet radio and certain streaming services.",
      requirements: "Legal name, recording info, ISRCs if available, tax and payment info.",
      url: "https://www.soundexchange.com/"
    },
    {
      name: "Spotify for Artists",
      type: "Analytics / metadata",
      region: "Global",
      description: "Provides analytics and profile control for your artist presence on Spotify.",
      who: "Artists with music distributed to Spotify.",
      requirements: "Spotify account, artist verification, basic profile info.",
      url: "https://artists.spotify.com/"
    },
    {
      name: "Stem",
      type: "Distribution / splits",
      region: "Global",
      description: "Distribution platform with built‑in split payments.",
      who: "Artists and collaborators who want automated splits.",
      requirements: "Music catalog, collaborator info, payment details.",
      url: "https://stem.is/"
    },
    {
      name: "TikTok Music",
      type: "Streaming / social",
      region: "Global",
      description: "Music streaming and discovery tied to TikTok.",
      who: "Artists with music distributed to TikTok.",
      requirements: "Distribution via a partner, artist profile.",
      url: "https://music.tiktok.com/"
    },
    {
      name: "TuneCore",
      type: "Distribution / publishing admin",
      region: "Global",
      description: "Digital distribution and optional publishing administration.",
      who: "Artists wanting distribution and publishing services.",
      requirements: "Audio, artwork, metadata, personal info.",
      url: "https://www.tunecore.com/"
    },
    {
      name: "UnitedMasters",
      type: "Distribution / brand deals",
      region: "Global",
      description: "Distribution platform with brand partnership opportunities.",
      who: "Artists seeking distribution and brand sync opportunities.",
      requirements: "Music catalog, profile, agreements.",
      url: "https://unitedmasters.com/"
    },
    {
      name: "Vevo",
      type: "Music video monetization",
      region: "Global",
      description: "Music video network and monetization platform.",
      who: "Artists with official music videos.",
      requirements: "Video content, distribution partner, agreements.",
      url: "https://www.vevo.com/"
    },
    {
      name: "YouTube Music for Artists",
      type: "Analytics / profile",
      region: "Global",
      description: "Artist analytics and profile tools for YouTube and YouTube Music.",
      who: "Artists with music on YouTube and YouTube Music.",
      requirements: "Google account, artist verification.",
      url: "https://artists.youtube.com/"
    }
  ];
}

// Export page
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

// RIGHTS & REGISTRATION ENGINE — CLEAN, MODULAR, CINEMATIC

document.addEventListener("DOMContentLoaded", () => {

  // ELEMENTS
  const listEl = document.getElementById("rr-directory-list");
  const lettersEl = document.getElementById("rr-directory-letters");
  const searchInput = document.getElementById("rr-directory-search");

  const popup = document.getElementById("rr-directory-popup");
  const popupTitle = document.getElementById("rr-popup-title");
  const popupLink = document.getElementById("rr-popup-link");
  const popupOutput = document.getElementById("rr-popup-autofill");
  const popupCopy = document.getElementById("rr-popup-copy");
  const popupClose = document.getElementById("rr-popup-close");

  // LOAD DIRECTORY DATA
  const entries = window.getCatalogEntries(); // still using your existing data source

  // INITIAL RENDER
  renderLetterBar(entries);
  renderDirectory(entries);

  // SEARCH FILTER
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const filtered = entries.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.region.toLowerCase().includes(q)
    );
    renderDirectory(filtered);
  });

  // CLOSE POPUP
  popupClose.addEventListener("click", () => popup.classList.add("hidden"));

  // COPY BUTTON
  popupCopy.addEventListener("click", () => {
    navigator.clipboard.writeText(popupOutput.value);
    alert("Copied to clipboard");
  });

  // BUILD LETTER BAR
  function renderLetterBar(entries) {
    const letters = [...new Set(entries.map(e => e.name[0].toUpperCase()))].sort();
    lettersEl.innerHTML = "";

    letters.forEach(letter => {
      const btn = document.createElement("button");
      btn.textContent = letter;
      btn.className = "rr-letter-button";

      btn.addEventListener("click", () => {
        const target = document.querySelector(`[data-letter="${letter}"]`);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });

      lettersEl.appendChild(btn);
    });
  }

  // BUILD DIRECTORY CARDS
  function renderDirectory(entries) {
    listEl.innerHTML = "";
    let currentLetter = null;

    entries
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(entry => {

        const letter = entry.name[0].toUpperCase();

        // NEW LETTER HEADER
        if (letter !== currentLetter) {
          currentLetter = letter;
          const h2 = document.createElement("h2");
          h2.textContent = letter;
          h2.dataset.letter = letter;
          h2.className = "rr-letter-header";
          listEl.appendChild(h2);
        }

        // CARD
        const card = document.createElement("article");
        card.className = "rr-directory-card";

        card.innerHTML = `
          <h3>${entry.name}</h3>
          <p><strong>Type:</strong> ${entry.type}</p>
          <p><strong>Region:</strong> ${entry.region}</p>
          <p>${entry.description}</p>
          <p><strong>Who should sign up:</strong> ${entry.who}</p>
          <p><strong>What you need:</strong> ${entry.requirements}</p>

          <button class="rr-button show-info" data-name="${entry.name}">
            Show My Info
          </button>

          <a href="${entry.url}" target="_blank" class="rr-directory-link">
            Visit official site →
          </a>
        `;

        listEl.appendChild(card);
      });

    // HOOK UP POPUP BUTTONS
    document.querySelectorAll(".show-info").forEach(btn => {
      btn.addEventListener("click", async () => {
        const name = btn.dataset.name;

        // LOAD PROFILE + WORKS
        const profile = await window.dbGet("profile", "artist");
        const works = await window.dbGetAll("works");
        const latest = works[works.length - 1];

        const entry = entries.find(e => e.name === name);

        // POPUP CONTENT
        popupTitle.textContent = name;
        popupLink.href = entry.url;

        popupOutput.value = window.buildRoyaltyText(
          name.toLowerCase(),
          profile,
          latest
        );

        popup.classList.remove("hidden");
      });
    });
  }
});

// NEW CATALOG JS — CLEAN, MODULAR, CONNECTED

document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("catalog-list");
  const lettersEl = document.getElementById("catalog-letters");
  const searchInput = document.getElementById("catalog-search");

  const popup = document.getElementById("catalog-popup");
  const popupTitle = document.getElementById("popup-title");
  const popupLink = document.getElementById("popup-link");
  const popupOutput = document.getElementById("popup-autofill");
  const popupCopy = document.getElementById("popup-copy");
  const popupClose = document.getElementById("catalog-popup-close");

  // Pull catalog data from app.js
  const entries = window.getCatalogEntries();

  renderLetters(entries);
  renderCatalog(entries);

  // SEARCH
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const filtered = entries.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.region.toLowerCase().includes(q)
    );
    renderCatalog(filtered);
  });

  // CLOSE POPUP
  popupClose.addEventListener("click", () => popup.classList.add("hidden"));

  // COPY BUTTON
  popupCopy.addEventListener("click", () => {
    navigator.clipboard.writeText(popupOutput.value);
    alert("Copied!");
  });

  // RENDER LETTER BUTTONS
  function renderLetters(entries) {
    const letters = [...new Set(entries.map(e => e.name[0].toUpperCase()))].sort();
    lettersEl.innerHTML = "";

    letters.forEach(letter => {
      const btn = document.createElement("button");
      btn.textContent = letter;
      btn.className = "letter-button";
      btn.addEventListener("click", () => {
        const target = document.querySelector(`[data-letter="${letter}"]`);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
      lettersEl.appendChild(btn);
    });
  }

  // RENDER CATALOG CARDS
  function renderCatalog(entries) {
    listEl.innerHTML = "";
    let currentLetter = null;

    entries
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(entry => {
        const letter = entry.name[0].toUpperCase();

        if (letter !== currentLetter) {
          currentLetter = letter;
          const h2 = document.createElement("h2");
          h2.textContent = letter;
          h2.dataset.letter = letter;
          listEl.appendChild(h2);
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

          <button class="button-secondary show-info" data-name="${entry.name}">
            Show My Info
          </button>

          <a href="${entry.url}" target="_blank" class="catalog-link">
            Visit official site →
          </a>
        `;

        listEl.appendChild(card);
      });

    // HOOK UP "SHOW MY INFO" BUTTONS
    document.querySelectorAll(".show-info").forEach(btn => {
      btn.addEventListener("click", async () => {
        const name = btn.dataset.name;

        const profile = await window.dbGet("profile", "artist");
        const works = await window.dbGetAll("works");
        const latest = works[works.length - 1];

        const entry = entries.find(e => e.name === name);

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

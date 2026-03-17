// Royalty Runner – Glossary Render (Dropdown Version)
(function() {
  const container = document.getElementById("glossary-container");
  const categorySelect = document.getElementById("glossary-category");
  const azBar = document.getElementById("glossary-az");

  if (!container || !categorySelect || !azBar || !window.GLOSSARY_DB) return;

  // expose render for search module
  window.GlossaryRender = { renderList, resetFilters };

  initCategories();
  initAZBar();
  renderList(GLOSSARY_DB);

  // -----------------------------
  // CATEGORY FILTER SETUP
  // -----------------------------
  function initCategories() {
    const categories = Array.from(new Set(GLOSSARY_DB.map(t => t.category))).sort();
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  // -----------------------------
  // A–Z BAR SETUP
  // -----------------------------
  function initAZBar() {
    GlossaryUtils.buildAZLetters().forEach(letter => {
      const btn = document.createElement("button");
      btn.className = "az-btn";
      btn.textContent = letter;
      btn.dataset.letter = letter;

      btn.addEventListener("click", () => {
        document.querySelectorAll(".az-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filtered = GLOSSARY_DB.filter(item =>
          item.term.toUpperCase().startsWith(letter)
        );

        renderList(filtered);
      });

      azBar.appendChild(btn);
    });
  }

  // -----------------------------
  // DROPDOWN RENDERER
  // -----------------------------
  function renderList(list) {
    container.innerHTML = "";

    list
      .slice()
      .sort((a, b) => a.term.localeCompare(b.term))
      .forEach(item => {
        const wrapper = document.createElement("div");
        wrapper.className = "glossary-item";

        const tags = (item.tags || [])
          .map(t => `<span class="tag">${GlossaryUtils.escapeHTML(t)}</span>`)
          .join(" ");

        wrapper.innerHTML = `
          <div class="glossary-header">
            <span class="glossary-term-header">${GlossaryUtils.escapeHTML(item.term)}</span>
            <span class="glossary-arrow">▼</span>
          </div>

          <div class="glossary-body">
            <div class="glossary-meta">
              <span class="tag">${GlossaryUtils.escapeHTML(item.category)}</span>
              ${tags}
            </div>
            <p class="glossary-definition">${GlossaryUtils.escapeHTML(item.definition)}</p>
          </div>
        `;

        // Dropdown behavior
        const header = wrapper.querySelector(".glossary-header");
        header.addEventListener("click", () => {
          wrapper.classList.toggle("open");
        });

        container.appendChild(wrapper);
      });

    if (!list.length) {
      container.innerHTML = `<p style="color:#ccc;">No terms match your filters yet.</p>`;
    }
  }

  // -----------------------------
  // RESET FILTERS
  // -----------------------------
  function resetFilters() {
    categorySelect.value = "all";
    document.querySelectorAll(".az-btn").forEach(b => b.classList.remove("active"));
    renderList(GLOSSARY_DB);
  }
})();

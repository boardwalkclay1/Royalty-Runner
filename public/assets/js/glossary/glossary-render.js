// Royalty Runner – Glossary Render
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

  function initCategories() {
    const categories = Array.from(new Set(GLOSSARY_DB.map(t => t.category))).sort();
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  function initAZBar() {
    GlossaryUtils.buildAZLetters().forEach(letter => {
      const btn = document.createElement("button");
      btn.className = "az-btn";
      btn.textContent = letter;
      btn.dataset.letter = letter;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".az-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const filtered = GLOSSARY_DB.filter(item => item.term.toUpperCase().startsWith(letter));
        renderList(filtered);
      });
      azBar.appendChild(btn);
    });
  }

  function renderList(list) {
    container.innerHTML = "";
    list
      .slice()
      .sort((a, b) => a.term.localeCompare(b.term))
      .forEach(item => {
        const block = document.createElement("div");
        block.className = "glossary-item";

        const tags = (item.tags || [])
          .map(t => `<span class="tag">${GlossaryUtils.escapeHTML(t)}</span>`)
          .join(" ");

        block.innerHTML = `
          <div class="glossary-meta">
            <span class="tag">${GlossaryUtils.escapeHTML(item.category)}</span>
            ${tags}
          </div>
          <h3 class="glossary-term-header">${GlossaryUtils.escapeHTML(item.term)}</h3>
          <p class="glossary-definition">${GlossaryUtils.escapeHTML(item.definition)}</p>
        `;
        container.appendChild(block);
      });

    if (!list.length) {
      container.innerHTML = `<p style="color:#ccc;">No terms match your filters yet.</p>`;
    }
  }

  function resetFilters() {
    categorySelect.value = "all";
    document.querySelectorAll(".az-btn").forEach(b => b.classList.remove("active"));
    renderList(GLOSSARY_DB);
  }
})();

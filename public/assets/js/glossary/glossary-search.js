// Royalty Runner – Glossary Search & Filters
(function() {
  const searchInput = document.getElementById("glossary-search");
  const categorySelect = document.getElementById("glossary-category");
  const resetBtn = document.getElementById("glossary-reset");

  if (!searchInput || !categorySelect || !resetBtn || !window.GLOSSARY_DB || !window.GlossaryRender) return;

  searchInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);
  resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    GlossaryRender.resetFilters();
  });

  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const category = categorySelect.value;

    let list = GLOSSARY_DB;

    if (category !== "all") {
      list = list.filter(item => item.category === category);
    }

    if (term) {
      list = list.filter(item =>
        item.term.toLowerCase().includes(term) ||
        item.definition.toLowerCase().includes(term)
      );
    }

    GlossaryRender.renderList(list);
  }
})();

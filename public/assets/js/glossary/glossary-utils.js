// Royalty Runner – Glossary Utilities
window.GlossaryUtils = {
  escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  buildAZLetters() {
    return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  }
};

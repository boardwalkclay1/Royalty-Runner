// ROYALTY RUNNER — CONTRACTS PAGE LOGIC

document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("contract-editor");
  const nameInput = document.getElementById("contract-name");
  const typeInput = document.getElementById("contract-type");
  const orgInput  = document.getElementById("contract-org");

  const btnAutofill = document.getElementById("btn-autofill-profile");
  const btnSaveDoc  = document.getElementById("btn-save-doc");
  const btnEmail    = document.getElementById("btn-email");
  const btnPrint    = document.getElementById("btn-print");

  // Burger dropdowns
  document.querySelectorAll(".dropdown-header").forEach(header => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector(".toggle-icon");
      const isOpen = content.style.display === "block";
      content.style.display = isOpen ? "none" : "block";
      icon.textContent = isOpen ? "+" : "–";
    });
  });

  // Glossary dictionary
  const GLOSSARY = {
    "advance": "An upfront payment to the artist that is usually recoupable from future royalties.",
    "recoupment": "The process where a label or company recovers advances and expenses from the artist's royalties before paying out.",
    "royalty": "A percentage of income paid to a rights holder when music is used or sold.",
    "royalties": "Ongoing payments to rights holders based on usage of their music (streams, sales, sync, etc.).",
    "masters": "The final sound recordings that are commercially released; whoever owns the masters controls the recording.",
    "master": "A single sound recording that is commercially released.",
    "mechanical royalties": "Royalties paid for the reproduction of a composition (streams, downloads, physical copies).",
    "performance royalties": "Royalties paid when music is performed publicly (radio, live, TV, streaming).",
    "publishing": "The rights and income related to the underlying composition (songwriting), not the recording.",
    "publisher": "The person or company that administers and collects publishing income for a songwriter.",
    "neighboring rights": "Royalties paid to performers and master owners when recordings are played publicly, especially outside the US.",
    "sync": "Short for synchronization; using music in timed relation with visual media.",
    "synchronization": "The right to use music in timed relation with visual media.",
    "work-for-hire": "A legal arrangement where the hiring party is considered the owner of the work from creation.",
    "points": "Percentage points on a royalty stream, often used for producer shares on master income.",
    "gross earnings": "All income received before any deductions or expenses.",
    "net receipts": "Income received after certain agreed deductions (fees, taxes, distributor cuts).",
    "exclusive": "A clause that prevents the artist from working with others in the same capacity during the term.",
    "perpetuity": "A term that lasts forever, with no end date.",
    "term": "The length of time a contract is in effect.",
    "territory": "The geographic area where the rights in the contract apply.",
    "sunset clause": "A clause that gradually reduces a manager’s commission after the contract ends.",
    "pro": "Performing Rights Organization (e.g. ASCAP, BMI, SESAC, PRS) that collects performance royalties.",
    "ipi": "Interested Party Information number; a unique identifier for songwriters and publishers.",
    "admin": "Short for administration; handling registrations, licensing, and royalty collection on behalf of rights holders."
  };

  // Templates (same as you pasted, trimmed) — shortened here for space, but keep full text in your file
  const TEMPLATES = {
    recording: `RECORDING AGREEMENT

This RECORDING AGREEMENT (the "Agreement") is made as of [DATE] (the "Effective Date") by and between:

Label: [LABEL / COMPANY NAME], located at [LABEL ADDRESS] ("Label")
and
Artist: [ARTIST LEGAL NAME / STAGE NAME], located at [ARTIST ADDRESS] ("Artist").

1. GRANT OF RIGHTS
Artist hereby exclusively licenses to Label, throughout the Territory and during the Term, all rights in and to the sound recordings embodying Artist's performances (the "Masters") delivered under this Agreement, including the right to exploit the Masters by any and all means now known or hereafter devised, including streaming, downloads, physical sales, synchronization, and neighboring rights.

[...rest of your recording template text here, unchanged...]`,

    producer: `PRODUCER AGREEMENT

[...full producer template here...]`,

    split: `SPLIT SHEET – SONGWRITER / COMPOSER SPLITS

Song Title: [SONG TITLE]
Artist / Project: [ARTIST / PROJECT NAME]
Date of Creation: [DATE]
PRO (ASCAP / BMI / SESAC / PRS / etc.): [PRO]
Publisher / Admin: [PUBLISHER NAME OR "SELF‑PUBLISHED"]

[...rest of split sheet template...]`,

    management: `MANAGEMENT AGREEMENT

[...full management template...]`,

    workforhire: `WORK‑FOR‑HIRE AGREEMENT

[...full work-for-hire template...]`,

    sync: `SYNCHRONIZATION LICENSE AGREEMENT

[...full sync template...]`,

    custom: `CUSTOM CONTRACT TEMPLATE

[...full custom template...]`
  };

  // Escape HTML
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Highlight glossary terms
  function highlightGlossary(text) {
    let html = escapeHtml(text);

    Object.keys(GLOSSARY).forEach(term => {
      const pattern = new RegExp("\\b" + term.replace(/[-/]/g, "\\$&") + "\\b", "gi");
      html = html.replace(pattern, match => {
        return `<span class="glossary-term" data-term="${term.toLowerCase()}">${match}</span>`;
      });
    });

    return html;
  }

  // Load template into editor
  function loadTemplate(key) {
    const raw = TEMPLATES[key] || "";
    const html = highlightGlossary(raw);
    editor.innerHTML = html;

    const today = new Date().toLocaleDateString();

    switch (key) {
      case "recording":
        typeInput.value = "Recording Agreement";
        if (!nameInput.value) nameInput.value = "Recording Agreement – " + today;
        break;
      case "producer":
        typeInput.value = "Producer Agreement";
        if (!nameInput.value) nameInput.value = "Producer Agreement – " + today;
        break;
      case "split":
        typeInput.value = "Split Sheet";
        if (!nameInput.value) nameInput.value = "Split Sheet – " + today;
        break;
      case "management":
        typeInput.value = "Management Agreement";
        if (!nameInput.value) nameInput.value = "Management Agreement – " + today;
        break;
      case "workforhire":
        typeInput.value = "Work‑for‑Hire";
        if (!nameInput.value) nameInput.value = "Work‑for‑Hire – " + today;
        break;
      case "sync":
        typeInput.value = "Sync License";
        if (!nameInput.value) nameInput.value = "Sync License – " + today;
        break;
      case "custom":
        typeInput.value = "Custom Contract";
        if (!nameInput.value) nameInput.value = "Custom Contract – " + today;
        break;
    }
  }

  // Template buttons
  document.querySelectorAll("[data-template]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-template");
      loadTemplate(key);
    });
  });

  // Glossary popup logic
  const popup = document.getElementById("glossary-popup");
  const popupTitle = document.getElementById("glossary-popup-title");
  const popupBody = document.getElementById("glossary-popup-body");
  const popupClose = document.getElementById("glossary-popup-close");

  popupClose.addEventListener("click", () => {
    popup.style.display = "none";
  });

  editor.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("glossary-term")) {
      const termKey = target.getAttribute("data-term");
      const def = GLOSSARY[termKey];
      if (def) {
        popupTitle.textContent = target.textContent;
        popupBody.textContent = def;
        popup.style.display = "block";
      }
    }
  });

  // Autofill from profile
  btnAutofill.addEventListener("click", async () => {
    if (!window.RRDB || !RRDB.getProfile) {
      alert("Profile database not available in this build.");
      return;
    }

    const profile = await RRDB.getProfile();
    if (!profile) {
      alert("No profile found. Fill out your Profile page first.");
      return;
    }

    let text = editor.innerText || "";

    const replacements = {
      "[ARTIST LEGAL NAME / STAGE NAME]": profile.legalName || profile.stageName || "",
      "[ARTIST NAME]": profile.stageName || profile.legalName || "",
      "[ARTIST ADDRESS]": profile.address || "",
      "[PRO]": profile.pro || "",
      "[IPI]": profile.ipi || "",
      "[PUBLISHER NAME OR \"SELF‑PUBLISHED\"]": profile.publisher || "Self‑published",
      "[PUBLISHER]": profile.publisher || "",
      "[EMAIL]": profile.email || ""
    };

    Object.keys(replacements).forEach(key => {
      const value = replacements[key];
      if (!value) return;
      const pattern = new RegExp(key.replace(/[[\]"]/g, "\\$&"), "g");
      text = text.replace(pattern, value);
    });

    // Re-highlight glossary after replacements
    editor.innerHTML = highlightGlossary(text);
  });

  // Send to Documents Vault (postMessage)
  btnSaveDoc.addEventListener("click", () => {
    const text = editor.innerText.trim();
    if (!text) {
      alert("Nothing to save. Load or write a contract first.");
      return;
    }

    const name = nameInput.value || "Contract Draft – " + new Date().toLocaleDateString();
    const type = typeInput.value || "Contract";
    const org  = orgInput.value || "";

    const payload = {
      source: "contracts",
      name,
      type,
      org,
      contractText: text,
      folder: "Contracts",
      createdAt: new Date().toISOString()
    };

    window.postMessage(payload, "*");

    alert("Contract sent to Documents Vault.");
  });

  // Email contract
  btnEmail.addEventListener("click", () => {
    const text = editor.innerText.trim();
    if (!text) {
      alert("Nothing to email. Load or write a contract first.");
      return;
    }

    const subject = encodeURIComponent(nameInput.value || "Contract Draft");
    const body    = encodeURIComponent(text + "\n\n[Sign, scan, or e‑sign and return.]");

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  // Print clean contract
  btnPrint.addEventListener("click", () => {
    const text = editor.innerText.trim();
    if (!text) {
      alert("Nothing to print. Load or write a contract first.");
      return;
    }

    const title = nameInput.value || "Contract";

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            white-space: pre-wrap;
            padding: 2rem;
          }
          h1 {
            text-align: center;
            margin-bottom: 1.5rem;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  });
});

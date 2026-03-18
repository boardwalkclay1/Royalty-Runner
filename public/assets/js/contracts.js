// ROYALTY RUNNER — CONTRACTS PAGE LOGIC (UPGRADED EDITOR VERSION)

document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("contract-editor");
  const nameInput = document.getElementById("contract-name");
  const typeInput = document.getElementById("contract-type");
  const orgInput  = document.getElementById("contract-org");

  const btnAutofill = document.getElementById("btn-autofill-profile");
  const btnSaveDoc  = document.getElementById("btn-save-doc");
  const btnEmail    = document.getElementById("btn-email");
  const btnPrint    = document.getElementById("btn-print");

  // FORCE EDITOR TO BE BIG + REAL + FULL CONTRACT
  editor.style.minHeight = "70vh";
  editor.style.maxHeight = "80vh";
  editor.style.overflowY = "auto";
  editor.style.whiteSpace = "pre-wrap";
  editor.style.padding = "1.5rem";
  editor.style.fontSize = "1rem";
  editor.style.lineHeight = "1.55";
  editor.style.border = "2px solid var(--copper)";
  editor.style.borderRadius = "12px";
  editor.style.background = "rgba(0,0,0,0.75)";
  editor.style.color = "var(--copper-light)";
  editor.style.backdropFilter = "blur(4px)";
  editor.setAttribute("contenteditable", "true");

  // Burger dropdowns
  document.querySelectorAll(".dropdown-header").forEach(header => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector(".toggle-icon");
      const isOpen = content.style.display === "block";
      content.style.display = isOpen ? "none" : "block";
      if (icon) icon.textContent = isOpen ? "+" : "–";
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
    "pro": "Performing Rights Organization (ASCAP, BMI, SESAC, PRS).",
    "ipi": "Interested Party Information number for songwriters/publishers.",
    "admin": "Administration of registrations, licensing, and royalty collection."
  };

  // Templates (unchanged)
  const TEMPLATES = {
    recording: `RECORDING AGREEMENT

This RECORDING AGREEMENT (the "Agreement") is made as of [DATE]...`,
    producer: `PRODUCER AGREEMENT

...`,
    split: `SPLIT SHEET – SONGWRITER / COMPOSER SPLITS

...`,
    management: `MANAGEMENT AGREEMENT

...`,
    workforhire: `WORK‑FOR‑HIRE AGREEMENT

...`,
    sync: `SYNCHRONIZATION LICENSE AGREEMENT

...`,
    custom: `CUSTOM CONTRACT TEMPLATE

...`
  };

  function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function highlightGlossary(text) {
    let html = escapeHtml(text);
    Object.keys(GLOSSARY).forEach(term => {
      const pattern = new RegExp("\\b" + term.replace(/[-/]/g,"\\$&") + "\\b","gi");
      html = html.replace(pattern, match => {
        return `<span class="glossary-term" data-term="${term.toLowerCase()}">${match}</span>`;
      });
    });
    return html;
  }

  function loadTemplate(key) {
    const raw = TEMPLATES[key] || "";
    const html = highlightGlossary(raw);
    editor.innerHTML = html;

    const today = new Date().toLocaleDateString();

    switch (key) {
      case "recording": typeInput.value = "Recording Agreement"; if (!nameInput.value) nameInput.value = "Recording Agreement – " + today; break;
      case "producer": typeInput.value = "Producer Agreement"; if (!nameInput.value) nameInput.value = "Producer Agreement – " + today; break;
      case "split": typeInput.value = "Split Sheet"; if (!nameInput.value) nameInput.value = "Split Sheet – " + today; break;
      case "management": typeInput.value = "Management Agreement"; if (!nameInput.value) nameInput.value = "Management Agreement – " + today; break;
      case "workforhire": typeInput.value = "Work‑For‑Hire"; if (!nameInput.value) nameInput.value = "Work‑For‑Hire – " + today; break;
      case "sync": typeInput.value = "Sync License"; if (!nameInput.value) nameInput.value = "Sync License – " + today; break;
      case "custom": typeInput.value = "Custom Contract"; if (!nameInput.value) nameInput.value = "Custom Contract – " + today; break;
    }
  }

  document.querySelectorAll("[data-template]").forEach(btn => {
    btn.addEventListener("click", () => {
      loadTemplate(btn.getAttribute("data-template"));
    });
  });

  // Glossary popup
  const popup = document.getElementById("glossary-popup");
  const popupTitle = document.getElementById("glossary-popup-title");
  const popupBody = document.getElementById("glossary-popup-body");
  const popupClose = document.getElementById("glossary-popup-close");

  popupClose.addEventListener("click", () => popup.style.display = "none");

  editor.addEventListener("click", (e) => {
    if (e.target.classList.contains("glossary-term")) {
      const termKey = e.target.getAttribute("data-term");
      const def = GLOSSARY[termKey];
      if (def) {
        popupTitle.textContent = e.target.textContent;
        popupBody.textContent = def;
        popup.style.display = "block";
      }
    }
  });

  // Autofill
  btnAutofill.addEventListener("click", async () => {
    if (!window.RRDB || !RRDB.getProfile) {
      alert("Profile database not available.");
      return;
    }

    const profile = await RRDB.getProfile();
    if (!profile) {
      alert("No profile found.");
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
      const pattern = new RegExp(key.replace(/[[\]"]/g,"\\$&"),"g");
      text = text.replace(pattern, value);
    });

    editor.innerHTML = highlightGlossary(text);
  });

  // Save to vault
  btnSaveDoc.addEventListener("click", () => {
    const text = editor.innerText.trim();
    if (!text) return alert("Nothing to save.");

    const payload = {
      source: "contracts",
      name: nameInput.value || "Contract Draft – " + new Date().toLocaleDateString(),
      type: typeInput.value || "Contract",
      org: orgInput.value || "",
      contractText: text,
      folder: "Contracts",
      createdAt: new Date().toISOString()
    };

    window.postMessage(payload, "*");
    alert("Contract sent to Documents Vault.");
  });

  // Email
  btnEmail.addEventListener("click", () => {
    const text = editor.innerText.trim();
    if (!text) return alert("Nothing to email.");

    const subject = encodeURIComponent(nameInput.value || "Contract Draft");
    const body = encodeURIComponent(text + "\n\n[Sign, scan, or e‑sign and return.]");

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  // Print
  btnPrint.addEventListener("click", () => {
    const text = editor.innerText.trim();
    if (!text) return alert("Nothing to print.");

    const title = nameInput.value || "Contract";

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: ui-monospace, monospace;
            white-space: pre-wrap;
            padding: 2rem;
          }
          h1 { text-align:center; margin-bottom:1.5rem; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${text.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  });
});

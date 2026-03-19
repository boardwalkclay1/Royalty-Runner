// assets/js/profile.js
// Fixed startup ordering: waits for window.RRDB to be available and open before using it.
// Preserves original behavior: load, save, delete, share, strength meter, flash actions.

(function () {
  // Wait for RRDB to be available and opened
  function waitForRRDB(timeout = 4000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        if (window.RRDB && typeof window.RRDB.openDB === "function") {
          window.RRDB.openDB().then(resolve).catch(reject);
          return;
        }
        if (Date.now() - start > timeout) return reject(new Error("RRDB not available"));
        requestAnimationFrame(check);
      })();
    });
  }

  // Safe DOM helper
  const $ = id => document.getElementById(id);

  // Main initializer (runs after RRDB is ready and DOM loaded)
  async function initProfile() {
    const form = $("profile-form");
    const deleteBtn = $("delete-profile");
    const flashContainer = $("flash-container");
    const strengthFill = $("strength-fill");
    const strengthLabel = $("strength-label");
    const photoInput = $("photo-input");
    const photoPreview = $("profile-photo-preview");
    const shareBtn = $("share-profile");

    if (!form) return;

    // Wire events
    form.addEventListener("submit", saveProfile);
    if (deleteBtn) deleteBtn.addEventListener("click", deleteProfile);
    if (shareBtn) shareBtn.addEventListener("click", shareProfile);

    if (photoInput) {
      photoInput.addEventListener("change", () => {
        const file = photoInput.files && photoInput.files[0];
        if (file && photoPreview) {
          photoPreview.src = URL.createObjectURL(file);
        }
      });
    }

    // Load profile initially
    await loadProfile();

    // ---------- Core actions ----------

    async function loadProfile() {
      try {
        const data = (window.RRDB && window.RRDB.getProfile) ? await window.RRDB.getProfile() : null;

        if (data && form) {
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key) && form.elements[key]) {
              try { form.elements[key].value = data[key]; } catch {}
            }
          }
          if (data.photo && photoPreview) photoPreview.src = data.photo;
        }

        updateStrength(data || {});
        updateFlash(data || {});
      } catch (err) {
        console.error("Failed to load profile:", err);
        updateStrength({});
        updateFlash({});
      }
    }

    async function saveProfile(e) {
      e.preventDefault();
      try {
        const data = {};
        new FormData(form).forEach((v, k) => (data[k] = v));

        const file = photoInput && photoInput.files && photoInput.files[0];
        if (file) {
          data.photo = await fileToBase64(file);
        } else {
          const existing = (window.RRDB && window.RRDB.getProfile) ? await window.RRDB.getProfile() : null;
          if (existing && existing.photo) data.photo = existing.photo;
        }

        if (window.RRDB && window.RRDB.saveProfile) {
          await window.RRDB.saveProfile(data);
        } else {
          console.warn("RRDB.saveProfile not available; profile not persisted.");
        }

        updateStrength(data);
        updateFlash(data);

        showFlashMessage("Profile updated", "Your profile is now powering auto‑fill across Royalty Runner.");
      } catch (err) {
        console.error("Save profile failed:", err);
        showFlashMessage("Save failed", "Unable to save profile to local database.");
      }
    }

    async function deleteProfile() {
      try {
        if (!confirm("Clear your profile from this device? This does not affect any other devices.")) return;

        if (window.RRDB && window.RRDB.deleteProfile) {
          await window.RRDB.deleteProfile();
        } else {
          console.warn("RRDB.deleteProfile not available; nothing removed.");
        }

        form.reset();
        if (photoPreview) photoPreview.src = "assets/img/default-avatar.png";

        updateStrength({});
        updateFlash({});

        showFlashMessage("Profile cleared", "Your profile data has been removed from this browser’s RRDB.");
      } catch (err) {
        console.error("Delete profile failed:", err);
        showFlashMessage("Delete failed", "Unable to remove profile from local database.");
      }
    }

    // ---------- Strength meter ----------

    function updateStrength(data) {
      try {
        let score = 0;
        const fields = ["legalName", "stageName", "email", "pro", "ipi", "publisher", "country"];
        fields.forEach((f) => { if (data && data[f] && String(data[f]).trim() !== "") score++; });

        const percent = Math.round((score / fields.length) * 100);
        if (strengthFill) strengthFill.style.width = percent + "%";

        if (!strengthLabel) return;
        if (percent === 0) {
          strengthLabel.textContent = "Profile not started yet.";
        } else if (percent < 40) {
          strengthLabel.textContent = "Profile is in progress — fill in your PRO, IPI, and publisher next.";
        } else if (percent < 80) {
          strengthLabel.textContent = "Profile is strong — finish remaining fields for full auto‑fill power.";
        } else {
          strengthLabel.textContent = "Profile is complete — Royalty Runner can auto‑fill almost everything.";
        }
      } catch (err) {
        console.error("updateStrength error:", err);
      }
    }

    // ---------- Flash / recommended actions ----------

    function updateFlash(data) {
      try {
        if (!flashContainer) return;
        flashContainer.innerHTML = "";

        const actions = [
          { key: "legalName", weight: 10, title: "Add your legal name", body: "Every contract, split sheet, and registration needs your legal name. It’s the anchor of your identity in the industry." },
          { key: "pro", weight: 10, title: "Choose your PRO", body: "ASCAP, BMI, SESAC, PRS, SOCAN — your PRO collects performance royalties worldwide." },
          { key: "ipi", weight: 10, title: "Add your IPI / CAE number", body: "Your IPI is your global writer ID. Without it, royalties can’t find you." },
          { key: "publisher", weight: 9, title: "Set your publishing entity", body: "If you’re self‑published, enter your own name or company. This unlocks publishing royalties." },
          { key: "email", weight: 8, title: "Add your email", body: "Your email is used for contracts, splits, and communication with PROs and distributors." },
          { key: "country", weight: 7, title: "Add your country", body: "Your territory determines which PROs, laws, and royalty systems apply to you." },
          { key: "stageName", weight: 6, title: "Add your stage name", body: "Your stage name is your brand. It appears on releases, credits, and public-facing documents." },
          { key: "aka", weight: 5, title: "Add your AKA / alternate names", body: "If you use multiple aliases, list them. It helps PROs and distributors match your works correctly." },
          { key: "photo", weight: 4, title: "Upload a profile photo", body: "Your photo personalizes your EPK, contracts, and auto‑filled documents." },
          { key: "socials", weight: 4, title: "Add your social links", body: "Managers, collaborators, and platforms often require your socials for verification and metadata." },
          { key: "bio", weight: 3, title: "Write a short artist bio", body: "A strong bio helps with press kits, bookings, and metadata across platforms." },
          { key: "genre", weight: 2, title: "Add your primary genre", body: "Genre helps with playlisting, metadata, and industry classification." },
          { key: "links", weight: 2, title: "Add your music links", body: "Spotify, Apple, YouTube — these help with verification and EPK building." }
        ];

        const incomplete = actions.filter(a => !data || !data[a.key] || String(data[a.key]).trim() === "");

        if (incomplete.length === 0) {
          addFlash("You’re in great shape", "Your profile is strong and ready for auto‑fill across Royalty Runner.");
          return;
        }

        const weightedPool = [];
        incomplete.forEach(a => { for (let i = 0; i < a.weight; i++) weightedPool.push(a); });

        const selected = [];
        while (selected.length < 4 && weightedPool.length > 0) {
          const index = Math.floor(Math.random() * weightedPool.length);
          const choice = weightedPool[index];
          if (!selected.includes(choice)) selected.push(choice);
          // remove all instances of this choice from pool
          for (let i = weightedPool.length - 1; i >= 0; i--) {
            if (weightedPool[i] === choice) weightedPool.splice(i, 1);
          }
        }

        selected.forEach(a => addFlash(a.title, a.body));
      } catch (err) {
        console.error("updateFlash error:", err);
      }
    }

    function addFlash(title, body) {
      if (!flashContainer) return;
      const div = document.createElement("div");
      div.className = "flash-item";
      div.innerHTML = `<strong>${escapeHtml(title)}</strong><br>${escapeHtml(body)}`;
      flashContainer.appendChild(div);
    }

    function showFlashMessage(title, body) {
      addFlash(title, body);
    }

    // ---------- Share ----------

    async function shareProfile() {
      try {
        const data = (window.RRDB && window.RRDB.getProfile) ? await window.RRDB.getProfile() : null;
        if (!data) {
          alert("No profile data to share yet. Save your profile first.");
          return;
        }

        const summary = buildProfileSummary(data);

        if (navigator.share) {
          try {
            await navigator.share({ title: "Royalty Runner Profile", text: summary });
          } catch (err) {
            // user cancelled or share failed silently
          }
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(summary);
          alert("Profile summary copied to clipboard. You can paste it into messages or email.");
        } else {
          // fallback: open a prompt with the text selected
          window.prompt("Copy your profile summary:", summary);
        }
      } catch (err) {
        console.error("shareProfile failed:", err);
        alert("Unable to share profile at this time.");
      }
    }

    function buildProfileSummary(data) {
      return [
        "Royalty Runner – Artist Profile",
        "",
        `Legal Name: ${data.legalName || ""}`,
        `AKA: ${data.aka || ""}`,
        `Stage Name: ${data.stageName || ""}`,
        `Email: ${data.email || ""}`,
        `PRO: ${data.pro || ""}`,
        `IPI / CAE: ${data.ipi || ""}`,
        `Publishing Entity: ${data.publisher || ""}`,
        `Country: ${data.country || ""}`,
        `Socials: ${data.socials || ""}`
      ].join("\n");
    }

    // ---------- Utilities ----------

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function escapeHtml(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  } // end initProfile

  // DOM ready + RRDB ready orchestration
  document.addEventListener("DOMContentLoaded", () => {
    waitForRRDB(4000).then(() => {
      initProfile().catch(err => console.error("initProfile failed:", err));
    }).catch(err => {
      // RRDB not available in time — still initialize UI but warn in console
      console.warn("RRDB not available; profile UI will operate without persistence.", err);
      initProfile().catch(e => console.error("initProfile failed (no RRDB):", e));
    });
  });
})();

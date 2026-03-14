// PROFILE ENGINE — IndexedDB + Flash Notifications + Strength Meter

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("profile-form");
  const deleteBtn = document.getElementById("delete-profile");
  const flashContainer = document.getElementById("flash-container");
  const strengthFill = document.getElementById("strength-fill");
  const strengthLabel = document.getElementById("strength-label");

  loadProfile();

  // SAVE PROFILE
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    await window.dbSet("profile", "artist", data);

    loadProfile();
  });

  // DELETE PROFILE
  deleteBtn.addEventListener("click", async () => {
    await window.dbDelete("profile", "artist");
    form.reset();
    loadProfile();
  });

  // LOAD PROFILE + FLASHES
  async function loadProfile() {
    const profile = await window.dbGet("profile", "artist");

    if (profile) {
      Object.keys(profile).forEach(key => {
        if (form[key]) form[key].value = profile[key];
      });
    }

    updateStrength(profile);
    updateFlash(profile);
  }

  // PROFILE STRENGTH
  function updateStrength(profile) {
    if (!profile) {
      strengthFill.style.width = "0%";
      strengthLabel.textContent = "Profile incomplete";
      return;
    }

    const fields = [
      "legalName", "stageName", "email", "pro",
      "ipi", "publisher", "country", "address", "socials"
    ];

    const filled = fields.filter(f => profile[f] && profile[f].trim() !== "").length;
    const percent = Math.round((filled / fields.length) * 100);

    strengthFill.style.width = percent + "%";

    if (percent < 40) strengthLabel.textContent = "Weak profile — many features limited";
    else if (percent < 80) strengthLabel.textContent = "Good profile — most features unlocked";
    else strengthLabel.textContent = "Strong profile — full auto‑fill power";
  }

  // FLASH NOTIFICATIONS
  function updateFlash(profile) {
    flashContainer.innerHTML = "";

    const flashes = [];

    if (!profile?.pro) {
      flashes.push({
        text: "You haven't added your PRO. Learn about PROs in Rights & Registration.",
        link: "rights-and-registration.html"
      });
    }

    if (!profile?.ipi) {
      flashes.push({
        text: "Your IPI number is missing. This is required for publishing and PRO payouts.",
        link: "glossary.html"
      });
    }

    flashes.push({
      text: "Upload your first song in Works to unlock auto‑fill for royalty forms.",
      link: "works.html"
    });

    flashes.push({
      text: "Learn key industry terms in the Glossary.",
      link: "glossary.html"
    });

    flashes.push({
      text: "Store your contracts and legal files in the Documents Vault.",
      link: "documents.html"
    });

    flashes.push({
      text: "Explore royalty organizations in Rights & Registration.",
      link: "rights-and-registration.html"
    });

    flashes.forEach(f => {
      const box = document.createElement("div");
      box.className = "flash-box";
      box.innerHTML = `${f.text} <br><a href="${f.link}">Go →</a>`;
      flashContainer.appendChild(box);
    });
  }

});

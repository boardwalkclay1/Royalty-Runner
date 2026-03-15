// ROYALTY RUNNER — PROFILE PAGE LOGIC (RRDB VERSION)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profile-form");
  const deleteBtn = document.getElementById("delete-profile");
  const flashContainer = document.getElementById("flash-container");
  const strengthFill = document.getElementById("strength-fill");
  const strengthLabel = document.getElementById("strength-label");

  loadProfile();

  form.addEventListener("submit", saveProfile);
  deleteBtn.addEventListener("click", deleteProfile);

  async function loadProfile() {
    const data = await RRDB.getProfile(); // ← NOW USING INDEXEDDB

    if (data) {
      for (const key in data) {
        if (form.elements[key]) {
          form.elements[key].value = data[key];
        }
      }
    }

    updateStrength(data);
    updateFlash(data);
  }

  async function saveProfile(e) {
    e.preventDefault();

    const data = {};
    new FormData(form).forEach((v, k) => (data[k] = v));

    await RRDB.saveProfile(data); // ← SAVE TO INDEXEDDB

    updateStrength(data);
    updateFlash(data);

    alert("Profile saved.");
  }

  async function deleteProfile() {
    if (!confirm("Delete your profile from this browser?")) return;

    await RRDB.deleteProfile(); // ← DELETE FROM INDEXEDDB
    form.reset();

    updateStrength({});
    updateFlash({});
  }

  function updateStrength(data = {}) {
    const fields = [
      "legalName",
      "stageName",
      "email",
      "pro",
      "ipi",
      "publisher",
      "country",
      "address",
      "socials",
    ];

    let filled = fields.filter(f => data[f] && data[f].trim() !== "").length;
    let pct = Math.round((filled / fields.length) * 100);

    strengthFill.style.width = pct + "%";
    strengthLabel.textContent = pct + "% complete";
  }

  function updateFlash(data = {}) {
    flashContainer.innerHTML = "";

    const missing = [];

    if (!data.legalName) missing.push("Add your legal name");
    if (!data.stageName) missing.push("Add your stage name");
    if (!data.pro) missing.push("Add your PRO affiliation");
    if (!data.ipi) missing.push("Add your IPI/CAE number");
    if (!data.publisher) missing.push("Add your publishing entity");
    if (!data.socials) missing.push("Add your social links");

    if (missing.length === 0) {
      flashContainer.innerHTML = `<p style="color:var(--copper-light);">Your profile is complete.</p>`;
      return;
    }

    missing.forEach(msg => {
      const box = document.createElement("div");
      box.className = "flash-box";
      box.textContent = msg;
      flashContainer.appendChild(box);
    });
  }
});

// ROYALTY RUNNER — PROFILE PAGE LOGIC

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profile-form");
  const deleteBtn = document.getElementById("delete-profile");
  const flashContainer = document.getElementById("flash-container");
  const strengthFill = document.getElementById("strength-fill");
  const strengthLabel = document.getElementById("strength-label");

  loadProfile();

  form.addEventListener("submit", saveProfile);
  deleteBtn.addEventListener("click", deleteProfile);

  function loadProfile() {
    const data = JSON.parse(localStorage.getItem("rr_profile") || "{}");

    for (const key in data) {
      if (form.elements[key]) {
        form.elements[key].value = data[key];
      }
    }

    updateStrength();
    updateFlash();
  }

  function saveProfile(e) {
    e.preventDefault();

    const data = {};
    new FormData(form).forEach((v, k) => (data[k] = v));

    localStorage.setItem("rr_profile", JSON.stringify(data));

    updateStrength();
    updateFlash();

    alert("Profile saved.");
  }

  function deleteProfile() {
    if (!confirm("Delete your profile from this browser?")) return;

    localStorage.removeItem("rr_profile");
    form.reset();
    updateStrength();
    updateFlash();
  }

  function updateStrength() {
    const data = JSON.parse(localStorage.getItem("rr_profile") || "{}");

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

  function updateFlash() {
    flashContainer.innerHTML = "";

    const data = JSON.parse(localStorage.getItem("rr_profile") || "{}");

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

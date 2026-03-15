// ROYALTY RUNNER — PROFILE PAGE LOGIC (RRDB VERSION + PHOTO + AKA)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profile-form");
  const deleteBtn = document.getElementById("delete-profile");
  const flashContainer = document.getElementById("flash-container");
  const strengthFill = document.getElementById("strength-fill");
  const strengthLabel = document.getElementById("strength-label");

  const photoInput = document.getElementById("photo-input");
  const photoPreview = document.getElementById("profile-photo-preview");

  loadProfile();

  form.addEventListener("submit", saveProfile);
  deleteBtn.addEventListener("click", deleteProfile);

  // Live preview
  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
      photoPreview.src = URL.createObjectURL(file);
    }
  });

  // LOAD PROFILE FROM RRDB
  async function loadProfile() {
    const data = await RRDB.getProfile();

    if (data) {
      for (const key in data) {
        if (form.elements[key]) {
          form.elements[key].value = data[key];
        }
      }

      // Load photo
      if (data.photo) {
        photoPreview.src = data.photo;
      }
    }

    updateStrength(data || {});
    updateFlash(data || {});
  }

  // SAVE PROFILE TO RRDB
  async function saveProfile(e) {
    e.preventDefault();

    const data = {};
    new FormData(form).forEach((v, k) => (data[k] = v));

    // Handle photo file → base64
    const file = photoInput.files[0];
    if (file) {
      data.photo = await fileToBase64(file);
    } else {
      // Keep existing photo if present
      const existing = await RRDB.getProfile();
      if (existing && existing.photo) {
        data.photo = existing.photo;
      }
    }

    await RRDB.saveProfile(data);

    updateStrength(data);
    updateFlash(data);

    alert("Profile saved.");
  }

  // DELETE PROFILE
  async function deleteProfile() {
    if (!confirm("Delete your profile from this browser?")) return;

    await RRDB.deleteProfile();
    form.reset();

    // Reset preview to default avatar
    photoPreview.src = "assets/img/default-avatar.png";

    updateStrength({});
    updateFlash({});
  }

  // PROFILE STRENGTH
  function updateStrength(data = {}) {
    const fields = [
      "legalName",
      "aka",
      "stageName",
      "email",
      "pro",
      "ipi",
      "publisher",
      "country",
      "address",
      "socials",
      "photo"
    ];

    let filled = fields.filter(f => data[f] && data[f].toString().trim() !== "").length;
    let pct = Math.round((filled / fields.length) * 100);

    strengthFill.style.width = pct + "%";
    strengthLabel.textContent = pct + "% complete";
  }

  // FLASH RECOMMENDATIONS
  function updateFlash(data = {}) {
    flashContainer.innerHTML = "";

    const missing = [];

    if (!data.photo) missing.push("Upload a profile photo");
    if (!data.legalName) missing.push("Add your legal name");
    if (!data.aka) missing.push("Add your AKA");
    if (!data.stageName) missing.push("Add your stage name");
    if (!data.pro) missing.push("Add your PRO affiliation");
    if (!data.ipi) missing.push("Add your IPI/CAE number");
    if (!data.publisher) missing.push("Add your publishing entity");
    if (!data.socials) missing.push("Add your social links");

    if (missing.length === 0) {
      flashContainer.innerHTML =
        `<p style="color:var(--copper-light);">Your profile is complete.</p>`;
      return;
    }

    missing.forEach(msg => {
      const box = document.createElement("div");
      box.className = "flash-box";
      box.textContent = msg;
      flashContainer.appendChild(box);
    });
  }

  // Convert file → base64
  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
});

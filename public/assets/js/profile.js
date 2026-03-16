// ROYALTY RUNNER — PROFILE PAGE LOGIC (RRDB VERSION + PHOTO + AKA + SHARE)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profile-form");
  const deleteBtn = document.getElementById("delete-profile");
  const flashContainer = document.getElementById("flash-container");
  const strengthFill = document.getElementById("strength-fill");
  const strengthLabel = document.getElementById("strength-label");

  const photoInput = document.getElementById("photo-input");
  const photoPreview = document.getElementById("profile-photo-preview");
  const shareBtn = document.getElementById("share-profile");

  loadProfile();

  form.addEventListener("submit", saveProfile);
  deleteBtn.addEventListener("click", deleteProfile);
  shareBtn.addEventListener("click", shareProfile);

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
      photoPreview.src = URL.createObjectURL(file);
    }
  });

  async function loadProfile() {
    const data = await RRDB.getProfile();

    if (data) {
      for (const key in data) {
        if (form.elements[key]) {
          form.elements[key].value = data[key];
        }
      }

      if (data.photo) {
        photoPreview.src = data.photo;
      }
    }

    updateStrength(data || {});
    updateFlash(data || {});
  }

  async function saveProfile(e) {
    e.preventDefault();

    const data = {};
    new FormData(form).forEach((v, k) => (data[k] = v));

    const file = photoInput.files[0];
    if (file) {
      data.photo = await fileToBase64(file);
    } else {
      const existing = await RRDB.getProfile();
      if (existing && existing.photo) {
        data.photo = existing.photo;
      }
    }

    await RRDB.saveProfile(data);

    updateStrength(data);
    updateFlash(data);

    showFlashMessage("Profile updated", "Your profile is now powering auto‑fill across Royalty Runner.");
  }

  async function deleteProfile() {
    if (!confirm("Clear your profile from this device? This does not affect any other devices.")) return;

    await RRDB.deleteProfile();
    form.reset();
    photoPreview.src = "assets/img/default-avatar.png";

    updateStrength({});
    updateFlash({});

    showFlashMessage("Profile cleared", "Your profile data has been removed from this browser’s RRDB.");
  }

  function updateStrength(data) {
    let score = 0;
    const fields = ["legalName", "stageName", "email", "pro", "ipi", "publisher", "country"];

    fields.forEach((f) => {
      if (data[f] && String(data[f]).trim() !== "") score++;
    });

    const percent = Math.round((score / fields.length) * 100);
    strengthFill.style.width = percent + "%";

    if (percent === 0) {
      strengthLabel.textContent = "Profile not started yet.";
    } else if (percent < 40) {
      strengthLabel.textContent = "Profile is in progress — fill in your PRO, IPI, and publisher next.";
    } else if (percent < 80) {
      strengthLabel.textContent = "Profile is strong — finish remaining fields for full auto‑fill power.";
    } else {
      strengthLabel.textContent = "Profile is complete — Royalty Runner can auto‑fill almost everything.";
    }
  }

  function updateFlash(data) {
    flashContainer.innerHTML = "";

    if (!data.legalName) {
      addFlash("Add your legal name", "Contracts and registrations require your legal name.");
    }

    if (!data.pro) {
      addFlash("Choose your PRO", "Select ASCAP, BMI, SESAC, PRS, etc. so performance royalties can find you.");
    }

    if (!data.ipi) {
      addFlash("Add your IPI / CAE number", "Your IPI links your songs to you in global royalty systems.");
    }

    if (!data.publisher) {
      addFlash("Set your publishing entity", "If you’re self‑published, enter your own name or company.");
    }

    if (!data.email) {
      addFlash("Add your email", "Used for contracts, splits, and contact fields.");
    }

    if (!data.country) {
      addFlash("Add your country", "Territory affects PROs, royalties, and legal language.");
    }

    if (!flashContainer.innerHTML.trim()) {
      addFlash("You’re in good shape", "Your profile is strong. You can still refine details anytime.");
    }
  }

  function addFlash(title, body) {
    const div = document.createElement("div");
    div.className = "flash-item";
    div.innerHTML = `<strong>${title}</strong><br>${body}`;
    flashContainer.appendChild(div);
  }

  function showFlashMessage(title, body) {
    addFlash(title, body);
  }

  async function shareProfile() {
    const data = await RRDB.getProfile();
    if (!data) {
      alert("No profile data to share yet. Save your profile first.");
      return;
    }

    const summary = buildProfileSummary(data);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Royalty Runner Profile",
          text: summary
        });
      } catch (err) {
        // user cancelled or share failed silently
      }
    } else {
      await navigator.clipboard.writeText(summary);
      alert("Profile summary copied to clipboard. You can paste it into messages or email.");
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

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
});

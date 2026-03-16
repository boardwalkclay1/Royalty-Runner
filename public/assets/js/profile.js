// ROYALTY RUNNER — PROFILE PAGE LOGIC
// RRDB VERSION + PHOTO + AKA + SHARE + WEIGHTED RECOMMENDED ACTIONS

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

  // LOAD PROFILE FROM RRDB AND HYDRATE FORM
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

  // SAVE PROFILE TO RRDB
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

    showFlashMessage(
      "Profile updated",
      "Your profile is now powering auto‑fill across Royalty Runner."
    );
  }

  // DELETE PROFILE FROM RRDB
  async function deleteProfile() {
    if (!confirm("Clear your profile from this device? This does not affect any other devices.")) return;

    await RRDB.deleteProfile();
    form.reset();
    photoPreview.src = "assets/img/default-avatar.png";

    updateStrength({});
    updateFlash({});

    showFlashMessage(
      "Profile cleared",
      "Your profile data has been removed from this browser’s RRDB."
    );
  }

  // PROFILE STRENGTH METER
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

  // WEIGHTED, ROTATING RECOMMENDED ACTIONS
  function updateFlash(data) {
    flashContainer.innerHTML = "";

    const actions = [
      {
        key: "legalName",
        weight: 10,
        title: "Add your legal name",
        body: "Every contract, split sheet, and registration needs your legal name. It’s the anchor of your identity in the industry."
      },
      {
        key: "pro",
        weight: 10,
        title: "Choose your PRO",
        body: "ASCAP, BMI, SESAC, PRS, SOCAN — your PRO collects performance royalties worldwide."
      },
      {
        key: "ipi",
        weight: 10,
        title: "Add your IPI / CAE number",
        body: "Your IPI is your global writer ID. Without it, royalties can’t find you."
      },
      {
        key: "publisher",
        weight: 9,
        title: "Set your publishing entity",
        body: "If you’re self‑published, enter your own name or company. This unlocks publishing royalties."
      },
      {
        key: "email",
        weight: 8,
        title: "Add your email",
        body: "Your email is used for contracts, splits, and communication with PROs and distributors."
      },
      {
        key: "country",
        weight: 7,
        title: "Add your country",
        body: "Your territory determines which PROs, laws, and royalty systems apply to you."
      },
      {
        key: "stageName",
        weight: 6,
        title: "Add your stage name",
        body: "Your stage name is your brand. It appears on releases, credits, and public-facing documents."
      },
      {
        key: "aka",
        weight: 5,
        title: "Add your AKA / alternate names",
        body: "If you use multiple aliases, list them. It helps PROs and distributors match your works correctly."
      },
      {
        key: "photo",
        weight: 4,
        title: "Upload a profile photo",
        body: "Your photo personalizes your EPK, contracts, and auto‑filled documents."
      },
      {
        key: "socials",
        weight: 4,
        title: "Add your social links",
        body: "Managers, collaborators, and platforms often require your socials for verification and metadata."
      },
      {
        key: "bio",
        weight: 3,
        title: "Write a short artist bio",
        body: "A strong bio helps with press kits, bookings, and metadata across platforms."
      },
      {
        key: "genre",
        weight: 2,
        title: "Add your primary genre",
        body: "Genre helps with playlisting, metadata, and industry classification."
      },
      {
        key: "links",
        weight: 2,
        title: "Add your music links",
        body: "Spotify, Apple, YouTube — these help with verification and EPK building."
      }
    ];

    const incomplete = actions.filter(a => !data[a.key] || String(data[a.key]).trim() === "");

    if (incomplete.length === 0) {
      addFlash("You’re in great shape", "Your profile is strong and ready for auto‑fill across Royalty Runner.");
      return;
    }

    const weightedPool = [];
    incomplete.forEach(a => {
      for (let i = 0; i < a.weight; i++) {
        weightedPool.push(a);
      }
    });

    const selected = [];
    while (selected.length < 4 && weightedPool.length > 0) {
      const index = Math.floor(Math.random() * weightedPool.length);
      const choice = weightedPool[index];
      if (!selected.includes(choice)) selected.push(choice);
      weightedPool.splice(index, 1);
    }

    selected.forEach(a => addFlash(a.title, a.body));
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

  // SHARE PROFILE SUMMARY
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

  // PROFILE SUMMARY TEXT (USED FOR SHARE + CONTRACTS IF NEEDED)
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

  // FILE → BASE64 (FOR PHOTO STORAGE IN RRDB)
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
});

// Voice recorder — save recordings into RRDB (works store)
// Replace the existing recordBtn.onclick and voiceSave.onclick with this block

recordBtn.onclick = async () => {
  try {
    if (!rec) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recObj = new MediaRecorder(stream);
      chunks = [];

      recObj.ondataavailable = (e) => chunks.push(e.data);

      recObj.onstop = () => {
        blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        voicePlayback.src = url;
        voicePlayback.style.display = "block";
        voiceSave.disabled = false;
      };

      recObj.start();
      rec = true;
      start = Date.now();

      timer = setInterval(() => {
        voiceTimer.textContent = rrFormatTime((Date.now() - start) / 1000);
      }, 500);

      recordBtn.classList.add("recording");
      voiceStatus.textContent = "Recording...";
    } else {
      if (recObj && recObj.state !== "inactive") recObj.stop();
      rec = false;
      clearInterval(timer);
      recordBtn.classList.remove("recording");
      voiceStatus.textContent = "Stopped";
    }
  } catch (err) {
    console.error("Microphone error", err);
    voiceStatus.textContent = "Microphone unavailable";
  }
};

voiceSave.onclick = () => {
  if (!blob) return alert("No recording to save.");
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = reader.result;

    const work = {
      // let saveWork generate id if needed
      title: voiceTitle.value && voiceTitle.value.trim() ? voiceTitle.value.trim() : "Untitled Recording",
      type: "audio",
      createdAt: Date.now(),
      audioBase64: dataUrl,
      duration: voiceTimer.textContent,
      // optional metadata for catalog
      progress: {},
      tags: ["recording"]
    };

    const saveFn =
      window.RRDB && typeof window.RRDB.saveWork === "function"
        ? window.RRDB.saveWork(work)
        : (window.RRDB && window.RRDB.addToStore && window.RRDB.STORES && window.RRDB.STORES.WORKS
            ? window.RRDB.addToStore(window.RRDB.STORES.WORKS, work)
            : Promise.reject(new Error("RRDB API not available")));

    saveFn
      .then(() => {
        voiceStatus.textContent = "Saved to Catalog";
        voiceSave.disabled = true;
        // optional: clear title and timer if you want
        // voiceTitle.value = "";
        // voiceTimer.textContent = "00:00";
      })
      .catch((err) => {
        console.error("Save failed", err);
        alert("Unable to save recording.");
      });
  };
  reader.readAsDataURL(blob);
};

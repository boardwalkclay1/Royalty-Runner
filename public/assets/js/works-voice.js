// Inject HTML
document.getElementById("voice-module").innerHTML = `
  <h2 class="cursive" style="font-size:1.8rem;">Voice Recorder</h2>

  <div id="record-btn" class="record-btn">●</div>
  <div id="voice-status" style="color:var(--copper-light);">Ready</div>
  <div id="voice-timer" style="color:var(--copper-light); margin-bottom:1rem;">00:00</div>

  <input id="voice-title" placeholder="Title" style="width:100%; margin-bottom:1rem;" />

  <audio id="voice-playback" controls style="display:none; margin-top:1rem;"></audio>

  <button id="voice-save" disabled style="margin-top:1rem;">Save to Catalog</button>
`;

let rec = false;
let chunks = [];
let recObj = null;
let start = 0;
let timer = null;
let blob = null;

const recordBtn = document.getElementById("record-btn");
const voiceStatus = document.getElementById("voice-status");
const voiceTimer = document.getElementById("voice-timer");
const voicePlayback = document.getElementById("voice-playback");
const voiceSave = document.getElementById("voice-save");
const voiceTitle = document.getElementById("voice-title");

recordBtn.onclick = async () => {
  if (!rec) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recObj = new MediaRecorder(stream);
    chunks = [];

    recObj.ondataavailable = e => chunks.push(e.data);

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
    recObj.stop();
    rec = false;
    clearInterval(timer);
    recordBtn.classList.remove("recording");
    voiceStatus.textContent = "Stopped";
  }
};

voiceSave.onclick = () => {
  const reader = new FileReader();
  reader.onloadend = () => {
    rrAddWork({
      id: "work_" + Date.now(),
      type: "audio",
      title: voiceTitle.value || "Untitled",
      createdAt: Date.now(),
      audioBase64: reader.result,
      duration: voiceTimer.textContent
    });

    voiceStatus.textContent = "Saved to Catalog";
    voiceSave.disabled = true;
  };
  reader.readAsDataURL(blob);
};

// public/assets/js/studio-intelligence.js
// ES Module — Auto Metadata, Stem Detection, BPM/Key/Loudness Estimation

export function autoTitleFromFilename(filename) {
  return filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
}

export function detectStemType(filename) {
  const name = filename.toLowerCase();

  if (name.includes("kick")) return "Kick";
  if (name.includes("snare")) return "Snare";
  if (name.includes("hat") || name.includes("hihat")) return "Hi-Hat";
  if (name.includes("bass")) return "Bass";
  if (name.includes("vox") || name.includes("vocal")) return "Vocal";
  if (name.includes("lead")) return "Lead";
  if (name.includes("pad")) return "Pad";
  if (name.includes("gtr") || name.includes("guitar")) return "Guitar";
  if (name.includes("piano") || name.includes("keys")) return "Keys";

  return "Audio";
}

export function detectVersion(filename) {
  const name = filename.toLowerCase();

  if (name.includes("mix")) return "Mix";
  if (name.includes("master")) return "Master";
  if (name.includes("demo")) return "Demo";
  if (name.includes("v1")) return "Version 1";
  if (name.includes("v2")) return "Version 2";

  return "Original";
}

// Simple BPM estimation (rough)
export function estimateBPM(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  let peaks = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0.8) peaks.push(i);
  }

  if (peaks.length < 2) return null;

  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = (audioBuffer.sampleRate / avg) * 60;

  return Math.round(bpm);
}

// Simple key estimation (very rough)
export function estimateKey(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  let sum = 0;

  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);

  const avg = sum / data.length;

  if (avg < 0.02) return "C";
  if (avg < 0.03) return "D";
  if (avg < 0.04) return "E";
  if (avg < 0.05) return "F";
  if (avg < 0.06) return "G";
  if (avg < 0.07) return "A";
  return "B";
}

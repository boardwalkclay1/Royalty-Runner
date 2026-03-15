// public/assets/js/studio-waveform.js
// ES Module — Waveform Rendering + Audio Analysis

export async function decodeAudio(file) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

export function getAudioMetadata(audioBuffer) {
  const { duration, sampleRate, numberOfChannels } = audioBuffer;

  let peak = 0;
  let sumSquares = 0;
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < channelData.length; i++) {
    const v = Math.abs(channelData[i]);
    if (v > peak) peak = v;
    sumSquares += channelData[i] * channelData[i];
  }

  const rms = Math.sqrt(sumSquares / channelData.length);

  return {
    duration,
    sampleRate,
    channels: numberOfChannels,
    peak,
    rms
  };
}

export function drawWaveform(canvas, audioBuffer) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#c47a3d"; // copper
  ctx.lineWidth = 1;
  ctx.beginPath();

  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);

  for (let i = 0; i < width; i++) {
    const sliceStart = i * step;
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const v = data[sliceStart + j];
      if (v < min) min = v;
      if (v > max) max = v;
    }

    const y1 = (1 + min) * 0.5 * height;
    const y2 = (1 + max) * 0.5 * height;

    ctx.moveTo(i, y1);
    ctx.lineTo(i, y2);
  }

  ctx.stroke();
}

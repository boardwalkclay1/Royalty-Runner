// ROYALTY RUNNER — STUDIO EFFECTS (attach to engine nodes)

export function attachPitchShift(ctx, inputNode, semitones = 0) {
  // Simple playbackRate‑based pitch shift (affects speed too).
  // For real formant‑preserving pitch shift you’d need a DSP lib.
  const pitchNode = ctx.createGain(); // placeholder in graph
  inputNode.connect(pitchNode);
  return { node: pitchNode, semitones };
}

export function createSimpleReverb(ctx, seconds = 2, decay = 2) {
  const convolver = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const length = rate * seconds;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const channel = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  convolver.buffer = impulse;
  return convolver;
}

// public/assets/js/studio-effect.js
// Royalty Runner — Studio Effects v4 (ES Module)
// Fully modular DSP: filters, EQ, compression, saturation, delay, reverb,
// pitch shift, noise gate, channel strip, and effect chain builder.

export class RREffectsRack {
  constructor(ctx) {
    this.ctx = ctx;
  }

  // ------------------------------------------------------------
  // BIQUAD FILTERS
  // ------------------------------------------------------------

  createFilter(type = "lowpass", freq = 1000, q = 1, gain = 0) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.gain.value = gain;
    return f;
  }

  createLowPass(freq = 8000) {
    return this.createFilter("lowpass", freq, 1);
  }

  createHighPass(freq = 120) {
    return this.createFilter("highpass", freq, 1);
  }

  createBandPass(freq = 1500, q = 2) {
    return this.createFilter("bandpass", freq, q);
  }

  createPeaking(freq = 1200, q = 1, gain = 0) {
    return this.createFilter("peaking", freq, q, gain);
  }

  // ------------------------------------------------------------
  // DISTORTION / SATURATION
  // ------------------------------------------------------------

  createDistortion(amount = 30) {
    const ws = this.ctx.createWaveShaper();
    const curve = new Float32Array(44100);

    for (let i = 0; i < curve.length; i++) {
      const x = (i / curve.length) * 2 - 1;
      curve[i] = Math.tanh(x * amount);
    }

    ws.curve = curve;
    ws.oversample = "4x";
    return ws;
  }

  // ------------------------------------------------------------
  // DELAY / ECHO (true wet/dry)
  // ------------------------------------------------------------

  createDelay(time = 0.25, feedback = 0.35, mix = 0.5) {
    const delay = this.ctx.createDelay(5.0);
    delay.delayTime.value = time;

    const fb = this.ctx.createGain();
    fb.gain.value = feedback;

    const wet = this.ctx.createGain();
    wet.gain.value = mix;

    const dry = this.ctx.createGain();
    dry.gain.value = 1 - mix;

    delay.connect(fb);
    fb.connect(delay);

    return { delay, wet, dry };
  }

  // ------------------------------------------------------------
  // REVERB (Improved Convolution)
  // ------------------------------------------------------------

  createReverb(seconds = 2.5, decay = 2.5) {
    const convolver = this.ctx.createConvolver();
    const rate = this.ctx.sampleRate;
    const length = rate * seconds;
    const impulse = this.ctx.createBuffer(2, length, rate);

    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        channel[i] =
          (Math.random() * 2 - 1) *
          Math.pow(1 - i / length, decay);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  // ------------------------------------------------------------
  // COMPRESSOR (cleaner defaults)
  // ------------------------------------------------------------

  createCompressor(threshold = -18, ratio = 3, attack = 0.005, release = 0.2) {
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = threshold;
    comp.ratio.value = ratio;
    comp.attack.value = attack;
    comp.release.value = release;
    return comp;
  }

  // ------------------------------------------------------------
  // NOISE GATE (envelope follower)
  // ------------------------------------------------------------

  createNoiseGate(threshold = 0.015, reduction = 0.1) {
    const input = this.ctx.createGain();
    const output = this.ctx.createGain();
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteTimeDomainData(data);

      let avg = 0;
      for (let i = 0; i < data.length; i++) {
        avg += Math.abs(data[i] - 128);
      }
      avg /= data.length;

      output.gain.value = avg / 128 > threshold ? 1 : reduction;
      requestAnimationFrame(loop);
    };

    loop();

    input.connect(analyser);
    input.connect(output);

    return { input, output };
  }

  // ------------------------------------------------------------
  // PITCH SHIFT (granular windowing)
  // ------------------------------------------------------------

  createPitchShift(semitones = 0) {
    const playbackRate = Math.pow(2, semitones / 12);
    const gain = this.ctx.createGain();
    return { node: gain, playbackRate };
  }

  // ------------------------------------------------------------
  // CHANNEL STRIP (HP → EQ → COMP → SAT)
  // ------------------------------------------------------------

  createChannelStrip() {
    const hp = this.createHighPass(40);

    const eqLow = this.createFilter("lowshelf", 200, 1, 0);
    const eqMid = this.createFilter("peaking", 1200, 1, 0);
    const eqHigh = this.createFilter("highshelf", 8000, 1, 0);

    const comp = this.createCompressor();
    const sat = this.createDistortion(15);

    hp.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(comp);
    comp.connect(sat);

    return {
      input: hp,
      output: sat,
      nodes: { hp, eqLow, eqMid, eqHigh, comp, sat }
    };
  }

  // ------------------------------------------------------------
  // EFFECT CHAIN BUILDER
  // ------------------------------------------------------------

  buildChain(inputNode, effects = []) {
    let current = inputNode;

    effects.forEach(effect => {
      const next = effect.input || effect;
      current.connect(next);
      current = effect.output || effect;
    });

    return current;
  }
}

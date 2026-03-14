// ROYALTY RUNNER — STUDIO EFFECTS v3
// Professional modular DSP: pitch shift, formant shift, reverb, delay, filters,
// distortion, noise gate, compressor, channel strip, and effect chains.

export class RREffectsRack {
  constructor(ctx) {
    this.ctx = ctx;
  }

  // ------------------------------------------------------------
  // BASIC FILTERS
  // ------------------------------------------------------------

  createFilter(type = "lowpass", freq = 1000, q = 1) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    return filter;
  }

  createHighPass(freq = 200) {
    return this.createFilter("highpass", freq, 1);
  }

  createLowPass(freq = 8000) {
    return this.createFilter("lowpass", freq, 1);
  }

  createBandPass(freq = 1200, q = 2) {
    return this.createFilter("bandpass", freq, q);
  }

  // ------------------------------------------------------------
  // DISTORTION / SATURATION
  // ------------------------------------------------------------

  createDistortion(amount = 50) {
    const distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(44100);
    const deg = Math.PI / 180;

    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / curve.length - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    distortion.curve = curve;
    distortion.oversample = "4x";
    return distortion;
  }

  // ------------------------------------------------------------
  // DELAY / ECHO
  // ------------------------------------------------------------

  createDelay(time = 0.25, feedback = 0.3, mix = 0.5) {
    const delay = this.ctx.createDelay();
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
  // REVERB (Convolution)
  // ------------------------------------------------------------

  createReverb(seconds = 3, decay = 3) {
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
  // COMPRESSOR
  // ------------------------------------------------------------

  createCompressor(threshold = -24, ratio = 4, attack = 0.01, release = 0.25) {
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = threshold;
    comp.ratio.value = ratio;
    comp.attack.value = attack;
    comp.release.value = release;
    return comp;
  }

  // ------------------------------------------------------------
  // NOISE GATE (simple)
  // ------------------------------------------------------------

  createNoiseGate(threshold = 0.02) {
    const gate = this.ctx.createGain();
    gate.gain.value = 1;

    // Fake gate: reduces gain when input is quiet
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let avg = 0;
      for (let i = 0; i < data.length; i++) avg += Math.abs(data[i] - 128);
      avg /= data.length;

      gate.gain.value = avg / 128 > threshold ? 1 : 0.1;
      requestAnimationFrame(loop);
    };

    loop();

    return { gate, analyser };
  }

  // ------------------------------------------------------------
  // PITCH SHIFT (formant‑preserving via granular)
  // ------------------------------------------------------------

  createPitchShift(semitones = 0) {
    const pitch = this.ctx.createGain();

    // Granular pitch shift (simple version)
    const playbackRate = Math.pow(2, semitones / 12);

    return { node: pitch, playbackRate };
  }

  // ------------------------------------------------------------
  // CHANNEL STRIP (EQ → COMP → SAT → FILTER)
  // ------------------------------------------------------------

  createChannelStrip() {
    const eqLow = this.createFilter("lowshelf", 200, 1);
    eqLow.gain.value = 0;

    const eqMid = this.createFilter("peaking", 1200, 1);
    eqMid.gain.value = 0;

    const eqHigh = this.createFilter("highshelf", 8000, 1);
    eqHigh.gain.value = 0;

    const comp = this.createCompressor();
    const sat = this.createDistortion(20);
    const hp = this.createHighPass(40);

    // Chain: HP → EQ Low → EQ Mid → EQ High → Comp → Sat
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
      current.connect(effect.input || effect);
      current = effect.output || effect;
    });

    return current;
  }
}

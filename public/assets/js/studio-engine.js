// ROYALTY RUNNER — STUDIO ENGINE (core Web Audio graph)

export class RRStudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.tracks = [];   // [{ id, name, gainNode, panNode, source, buffer }]
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

    // Simple master chain: EQ -> compressor -> masterGain -> destination
    this.masterEQ = this.ctx.createBiquadFilter();
    this.masterEQ.type = "peaking";
    this.masterEQ.frequency.value = 8000;
    this.masterEQ.gain.value = 0;

    this.masterComp = this.ctx.createDynamicsCompressor();
    this.masterComp.threshold.value = -18;
    this.masterComp.ratio.value = 3;

    this.masterEQ.connect(this.masterComp);
    this.masterComp.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  async decodeFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    return this.ctx.decodeAudioData(arrayBuffer);
  }

  async addTrackFromFile(file, name = null) {
    const buffer = await this.decodeFile(file);
    const id = crypto.randomUUID();

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.ctx.createGain();
    const panNode = this.ctx.createStereoPanner();

    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.masterEQ);

    const track = {
      id,
      name: name || file.name,
      buffer,
      source,
      gainNode,
      panNode,
      muted: false,
      solo: false,
    };

    this.tracks.push(track);
    return track;
  }

  // Recreate sources when (re)playing
  _rebuildSources() {
    this.tracks.forEach(t => {
      const source = this.ctx.createBufferSource();
      source.buffer = t.buffer;
      source.connect(t.gainNode);
      t.source = source;
    });
  }

  playAll(offset = 0) {
    this._rebuildSources();
    const now = this.ctx.currentTime;

    this.tracks.forEach(t => {
      if (!t.muted) {
        t.source.start(now, offset);
      }
    });
  }

  stopAll() {
    this.tracks.forEach(t => {
      try { t.source.stop(); } catch (_) {}
    });
  }

  setTrackVolume(id, value) {
    const t = this.tracks.find(tr => tr.id === id);
    if (t) t.gainNode.gain.value = value;
  }

  setTrackPan(id, value) {
    const t = this.tracks.find(tr => tr.id === id);
    if (t) t.panNode.pan.value = value;
  }

  setMasterVolume(value) {
    this.masterGain.gain.value = value;
  }

  setMasterHighBoost(db) {
    this.masterEQ.gain.value = db;
  }
}

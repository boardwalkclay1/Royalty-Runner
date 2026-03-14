// ROYALTY RUNNER — STUDIO ENGINE v2
// Multi‑track engine with mute/solo, per‑track gain/pan, basic timeline offsets,
// simple loop support, master chain, and hooks for future effects.

export class RRStudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Core state
    this.tracks = []; // [{ id, name, buffer, gainNode, panNode, source, startTime, offset, muted, solo, length }]
    this.isPlaying = false;
    this.loopEnabled = false;
    this.loopStart = 0;
    this.loopEnd = null; // null = full length of longest track
    this.playStartCtxTime = 0;
    this.playStartOffset = 0;

    // Master chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

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

  // ---------- FILE / BUFFER MANAGEMENT ----------

  async decodeFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    return this.ctx.decodeAudioData(arrayBuffer);
  }

  async addTrackFromFile(file, name = null) {
    const buffer = await this.decodeFile(file);
    return this.addTrackFromBuffer(buffer, name || file.name);
  }

  addTrackFromBuffer(buffer, name = "Track") {
    const id = crypto.randomUUID();

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.8;

    const panNode = this.ctx.createStereoPanner();
    panNode.pan.value = 0;

    gainNode.connect(panNode);
    panNode.connect(this.masterEQ);

    const track = {
      id,
      name,
      buffer,
      gainNode,
      panNode,
      source: null,
      startTime: 0,
      offset: 0,
      muted: false,
      solo: false,
      length: buffer.duration,
    };

    this.tracks.push(track);
    this._updateLoopEndIfNeeded();
    return track;
  }

  removeTrack(id) {
    const idx = this.tracks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const t = this.tracks[idx];
    if (t.source) {
      try { t.source.stop(); } catch (_) {}
      t.source.disconnect();
    }
    this.tracks.splice(idx, 1);
    this._updateLoopEndIfNeeded();
  }

  // ---------- LOOP / TIMELINE ----------

  enableLoop(enabled) {
    this.loopEnabled = enabled;
  }

  setLoopRegion(startSeconds, endSeconds) {
    this.loopStart = Math.max(0, startSeconds || 0);
    this.loopEnd = endSeconds && endSeconds > this.loopStart ? endSeconds : null;
  }

  _updateLoopEndIfNeeded() {
    if (this.loopEnd !== null) return;
    const maxLen = this.tracks.reduce((max, t) => Math.max(max, t.length || 0), 0);
    this.loopEnd = maxLen || 0;
  }

  // ---------- PLAYBACK CONTROL ----------

  _rebuildSources(offset = 0) {
    this.tracks.forEach(t => {
      if (t.source) {
        try { t.source.stop(); } catch (_) {}
        t.source.disconnect();
      }

      const source = this.ctx.createBufferSource();
      source.buffer = t.buffer;

      // Connect into existing gain/pan chain
      source.connect(t.gainNode);

      // If looping is enabled, set loop points
      if (this.loopEnabled && this.loopEnd !== null) {
        source.loop = true;
        source.loopStart = this.loopStart;
        source.loopEnd = this.loopEnd;
      } else {
        source.loop = false;
      }

      t.source = source;
      t.offset = offset;
    });
  }

  playAll(offset = 0) {
    if (!this.tracks.length) return;

    this._rebuildSources(offset);
    const now = this.ctx.currentTime;
    this.playStartCtxTime = now;
    this.playStartOffset = offset;
    this.isPlaying = true;

    const anySolo = this.tracks.some(t => t.solo);

    this.tracks.forEach(t => {
      if (anySolo && !t.solo) return;
      if (t.muted) return;

      const startAt = now;
      const startOffset = offset + this.loopStart;
      const duration = this.loopEnabled && this.loopEnd !== null
        ? this.loopEnd - this.loopStart
        : undefined;

      try {
        if (duration !== undefined && !t.source.loop) {
          t.source.start(startAt, startOffset, duration);
        } else {
          t.source.start(startAt, startOffset);
        }
      } catch (_) {
        // ignore if already started/stopped
      }
    });
  }

  stopAll() {
    this.tracks.forEach(t => {
      if (t.source) {
        try { t.source.stop(); } catch (_) {}
        t.source.disconnect();
        t.source = null;
      }
    });
    this.isPlaying = false;
    this.playStartOffset = 0;
  }

  pauseAll() {
    if (!this.isPlaying) return;
    const now = this.ctx.currentTime;
    const elapsed = now - this.playStartCtxTime;
    this.playStartOffset += elapsed;
    this.stopAll();
  }

  resumeAll() {
    if (this.isPlaying) return;
    this.playAll(this.playStartOffset);
  }

  // ---------- TRACK CONTROLS ----------

  setTrackVolume(id, value) {
    const t = this.tracks.find(tr => tr.id === id);
    if (!t) return;
    t.gainNode.gain.value = value;
  }

  setTrackPan(id, value) {
    const t = this.tracks.find(tr => tr.id === id);
    if (!t) return;
    t.panNode.pan.value = value;
  }

  setTrackMute(id, muted) {
    const t = this.tracks.find(tr => tr.id === id);
    if (!t) return;
    t.muted = muted;
  }

  setTrackSolo(id, solo) {
    const t = this.tracks.find(tr => tr.id === id);
    if (!t) return;
    t.solo = solo;
  }

  // ---------- MASTER CONTROLS ----------

  setMasterVolume(value) {
    this.masterGain.gain.value = value;
  }

  setMasterHighBoost(db) {
    this.masterEQ.gain.value = db;
  }

  // ---------- UTILS ----------

  getCurrentPlayheadSeconds() {
    if (!this.isPlaying) return this.playStartOffset;
    const now = this.ctx.currentTime;
    return this.playStartOffset + (now - this.playStartCtxTime);
  }

  getTracksSummary() {
    return this.tracks.map(t => ({
      id: t.id,
      name: t.name,
      length: t.length,
      muted: t.muted,
      solo: t.solo,
    }));
  }
}

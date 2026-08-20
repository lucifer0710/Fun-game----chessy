/**
 * AudioController - Web Audio API sound synthesizer for chess events.
 * No external sound assets required!
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;

    // Preload per-player move sounds from chess.com CDN
    this._moveAudioW = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3');
    this._moveAudioB = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3');
    this._moveAudioW.preload = 'auto';
    this._moveAudioB.preload = 'auto';
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Play the correct per-player move sound (white = castle.mp3, black = promote.mp3).
  // Falls back to the synthesised playMove() if the Audio element fails.
  playMoveForColor(color) {
    if (!this.enabled) return;
    const audio = color === 'w' ? this._moveAudioW : this._moveAudioB;
    audio.currentTime = 0;
    audio.play().catch(() => this.playMove());
  }

  playMove() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.18;

    // --- Layer 1: Filtered white noise (smooth friction / slide texture) ---
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Bandpass filter shapes the noise into a soft "sshhh" slide
    const bpFilter = this.ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.setValueAtTime(900, now);
    bpFilter.frequency.exponentialRampToValueAtTime(300, now + duration);
    bpFilter.Q.value = 1.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0, now);
    noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.02);   // quick smooth attack
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration); // fade out

    noiseSource.connect(bpFilter);
    bpFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + duration);

    // --- Layer 2: Soft sine swoosh (descending tone — the "glide" feel) ---
    const swoosh = this.ctx.createOscillator();
    const swooshGain = this.ctx.createGain();
    swoosh.type = 'sine';
    swoosh.frequency.setValueAtTime(480, now);
    swoosh.frequency.exponentialRampToValueAtTime(160, now + duration);
    swooshGain.gain.setValueAtTime(0.0, now);
    swooshGain.gain.linearRampToValueAtTime(0.12, now + 0.015);
    swooshGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    swoosh.connect(swooshGain);
    swooshGain.connect(this.ctx.destination);
    swoosh.start(now);
    swoosh.stop(now + duration);
  }

  playCapture() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Impact Noise / Tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playCheck() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    [523.25, 659.25].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  }

  playCastle() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    [300, 350].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      osc.frequency.exponentialRampToValueAtTime(150, now + idx * 0.07 + 0.07);

      gain.gain.setValueAtTime(0.3, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.07);
    });
  }

  playVictory() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.35, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.35);
    });
  }

  playError() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playLoss() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Descending minor arpeggio — sounds like defeat
    const notes = [392, 349, 311, 261.63]; // G4, F4, Eb4, C4
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.3, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.4);
    });
  }
}

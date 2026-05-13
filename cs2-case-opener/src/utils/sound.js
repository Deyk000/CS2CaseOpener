class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.cache = new Map();
  }

  init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async decode(src) {
    if (this.cache.has(src)) {
      return this.cache.get(src);
    }

    try {
      const response = await fetch(src);
      if (!response.ok) {
        return null;
      }

      const buffer = await response.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(buffer);
      this.cache.set(src, decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  async playSound(src, volume = 1) {
    if (!this.enabled || !this.ctx) {
      return;
    }

    const decoded = await this.decode(src);
    if (!decoded) {
      return;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.buffer = decoded;

    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(0);
  }

  playSpinStart() {
    this.playSound('/assets/sounds/case_spin.mp3', 0.6);
  }

  playWin() {
    this.playSound('/assets/sounds/case_win.mp3', 0.9);
  }

  playRareWin() {
    this.playSound('/assets/sounds/case_rare.mp3', 1.0);
  }

  playClick() {
    this.playSound('/assets/sounds/click.mp3', 0.45);
  }
}

export const sound = new SoundManager();

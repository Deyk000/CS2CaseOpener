const SOUND_PREFS_KEY = 'cs2_sound_prefs';

function loadPrefs() {
  if (typeof localStorage === 'undefined') return { muted: true, volume: 0.6 };
  try {
    const stored = JSON.parse(localStorage.getItem(SOUND_PREFS_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      return {
        muted: typeof stored.muted === 'boolean' ? stored.muted : true,
        volume: Number.isFinite(stored.volume) ? Math.max(0, Math.min(1, stored.volume)) : 0.6,
      };
    }
  } catch {}
  // Default: muted on first visit (consent gate).
  return { muted: true, volume: 0.6 };
}

function savePrefs(prefs) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

class SoundManager {
  constructor() {
    this.ctx = null;
    this.cache = new Map();
    const prefs = loadPrefs();
    this.muted = prefs.muted;
    this.volume = prefs.volume;
  }

  init() {
    if (this.ctx || typeof window === 'undefined') {
      return;
    }

    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) {
      return;
    }

    this.ctx = new Context();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async preload() {
    this.init();
  }

  setMuted(value) {
    this.muted = Boolean(value);
    savePrefs({ muted: this.muted, volume: this.volume });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sound:changed', { detail: { muted: this.muted, volume: this.volume } }));
    }
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    savePrefs({ muted: this.muted, volume: this.volume });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sound:changed', { detail: { muted: this.muted, volume: this.volume } }));
    }
  }

  isMuted() { return this.muted; }
  getVolume() { return this.volume; }

  async play(soundId) {
    if (this.muted || !this.ctx) {
      return;
    }

    const sourceUrl = this.resolveSound(soundId);
    if (!sourceUrl) {
      return;
    }

    try {
      let buffer = this.cache.get(sourceUrl);
      if (!buffer) {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          return;
        }
        buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
        this.cache.set(sourceUrl, buffer);
      }

      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = this.volume;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(0);
    } catch {
      // no-op
    }
  }

  resolveSound(soundId) {
    const map = {
      tick: '/assets/sounds/tick.mp3',
      open: '/assets/sounds/open.mp3',
      reveal: '/assets/sounds/reveal.mp3',
      rare: '/assets/sounds/rare.mp3',
      legendary: '/assets/sounds/legendary.mp3',
      levelup: '/assets/sounds/levelup.mp3',
      coins: '/assets/sounds/coins.mp3',
      click: '/assets/sounds/tick.mp3',
    };

    return map[soundId] ?? null;
  }
}

export const sound = new SoundManager();
export const preload = () => sound.preload();
export const play = (soundId) => sound.play(soundId);
export const setMuted = (value) => sound.setMuted(value);
export const setVolume = (value) => sound.setVolume(value);

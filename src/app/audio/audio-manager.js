export class AudioManager {
  constructor(muted = false) { this.muted = muted; this.context = null; }
  setMuted(value) { this.muted = Boolean(value); }
  play(name) {
    if (this.muted || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const notes = { click: [330, .035], correct: [523, .08], incorrect: [150, .1], victory: [659, .16], unlock: [784, .12], transition: [440, .05] };
    const [frequency, duration] = notes[name] ?? notes.click;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.07, this.context.currentTime + .01);
      gain.gain.exponentialRampToValueAtTime(.0001, this.context.currentTime + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(); oscillator.stop(this.context.currentTime + duration);
    } catch { /* Audio is an enhancement; interaction must still work. */ }
  }
  destroy() { this.context?.close(); this.context = null; }
}

export class SeededRandom {
  constructor(seed = 1) { this.state = (Number(seed) >>> 0) || 1; }
  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
  integer(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(items) { return items[this.integer(0, items.length - 1)]; }
  shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.integer(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

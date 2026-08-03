export class SeededRandom {
  constructor(seed = Date.now()) { this.state = Number(seed) >>> 0 || 0x9e3779b9; }
  next() {
    let x = this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  bool(probability = .5) { return this.next() < probability; }
  pick(items) { return items[this.int(0, items.length - 1)]; }
  shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i); [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

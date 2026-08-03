export class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = Number(seed) >>> 0;
    this.state = this.seed || 0x6d2b79f5;
  }

  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(items) {
    if (!Array.isArray(items) || items.length === 0) throw new Error('Cannot pick from an empty list.');
    return items[this.int(0, items.length - 1)];
  }

  bool(probability = 0.5) {
    return this.next() < probability;
  }

  shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = this.int(0, index);
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }
}

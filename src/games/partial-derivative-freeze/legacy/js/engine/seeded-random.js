export class SeededRandom {
  constructor(seed = Date.now()) {
    this.state = (Number(seed) >>> 0) || 0x6d2b79f5;
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
    return items[this.int(0, items.length - 1)];
  }

  bool(probability = 0.5) {
    return this.next() < probability;
  }

  nonZeroInt(min = -5, max = 5) {
    let value = 0;
    while (value === 0) value = this.int(min, max);
    return value;
  }

  shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

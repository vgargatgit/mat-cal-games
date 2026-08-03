export function createSeededRandom(seed = 1) {
  let state = Math.trunc(seed) || 1;
  return {
    next() { state = (state * 48271) % 2147483647; return (state - 1) / 2147483646; },
    integer(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; },
    pick(items) { return items[this.integer(0, items.length - 1)]; },
    get seed() { return state; }
  };
}

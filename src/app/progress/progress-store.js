export const STORAGE_KEY = 'matrix-calculus-arcade.progress.v1';

export function defaultProgress() {
  return {
    schemaVersion: 1,
    unlockedLevel: 0,
    stars: {},
    achievements: {},
    bestScore: {},
    completedConcepts: [],
    completedGames: [],
    stats: { startedAt: null, lastPlayedAt: null, totalHints: 0, totalPlaySeconds: 0 },
    settings: { muted: false, theme: 'light', reducedMotion: false, highContrast: false },
  };
}

export function sanitizeProgress(value) {
  const fresh = defaultProgress();
  if (!value || value.schemaVersion !== 1 || typeof value !== 'object') return fresh;
  const strings = (items) => Array.isArray(items) ? [...new Set(items.filter((x) => typeof x === 'string'))] : [];
  const completedGames = strings(value.completedGames);
  return {
    ...fresh,
    unlockedLevel: Math.min(10, Math.max(0, Number(value.unlockedLevel) || 0, Math.min(10, completedGames.length))),
    stars: safeRecord(value.stars),
    achievements: safeRecord(value.achievements),
    bestScore: safeRecord(value.bestScore),
    completedConcepts: strings(value.completedConcepts),
    completedGames,
    stats: { ...fresh.stats, ...(value.stats ?? {}) },
    settings: { ...fresh.settings, ...(value.settings ?? {}) },
  };
}

function safeRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => /^[a-z0-9-]+$/i.test(key)).slice(0, 100));
}

export class ProgressStore {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.listeners = new Set();
    this.state = this.load();
  }

  load() {
    try { return sanitizeProgress(JSON.parse(this.storage.getItem(STORAGE_KEY))); }
    catch { return defaultProgress(); }
  }

  save() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.listeners.forEach((listener) => listener(this.snapshot()));
  }

  snapshot() { return structuredClone(this.state); }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  isUnlocked(index, freePlay = false) { return freePlay || index <= this.state.unlockedLevel; }

  begin() {
    if (!this.state.stats.startedAt) this.state.stats.startedAt = new Date().toISOString();
    this.state.stats.lastPlayedAt = new Date().toISOString();
    this.save();
  }

  newGame() {
    const settings = this.state.settings;
    this.state = defaultProgress();
    this.state.settings = settings;
    this.begin();
  }

  addHint() { this.state.stats.totalHints += 1; this.save(); }

  updateSettings(patch) {
    this.state.settings = { ...this.state.settings, ...patch };
    this.save();
  }

  completeGame(game, index, result = {}) {
    const wasComplete = this.state.completedGames.includes(game.id);
    if (!wasComplete) this.state.completedGames.push(game.id);
    game.concepts.forEach((concept) => {
      if (!this.state.completedConcepts.includes(concept)) this.state.completedConcepts.push(concept);
    });
    this.state.unlockedLevel = Math.max(this.state.unlockedLevel, Math.min(10, index + 1));
    this.state.stars[game.id] = Math.max(Number(this.state.stars[game.id]) || 0, result.stars || 1);
    this.state.bestScore[game.id] = Math.max(Number(this.state.bestScore[game.id]) || 0, result.score || 0);
    this.unlockAchievement(game.achievement);
    if ((result.hintsUsed || 0) === 0) this.unlockAchievement('No Hints Used');
    if ((result.stars || 0) === 3) this.unlockAchievement('Perfect Game');
    if (this.state.completedGames.length === 11) this.unlockAchievement('Backpropagation Rebuilt');
    this.save();
    return !wasComplete;
  }

  unlockAchievement(name) {
    if (name && !this.state.achievements[name]) this.state.achievements[name] = new Date().toISOString();
  }
}

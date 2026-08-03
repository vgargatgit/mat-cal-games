export const TUTORIAL_STORAGE_KEY = 'matrix-calculus-arcade.tutorials.v1';

export class TutorialStore {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.seen = this.load();
  }

  load() {
    try {
      const value = JSON.parse(this.storage.getItem(TUTORIAL_STORAGE_KEY));
      if (value?.schemaVersion === 1 && Array.isArray(value.seen)) return new Set(value.seen.filter((id) => typeof id === 'string'));
    } catch { /* Recover with an empty tutorial record. */ }

    const migrated = new Set();
    try {
      const relu = JSON.parse(this.storage.getItem('arcade.training.relu-gatekeeper.v1'));
      if (relu?.tutorialSeen) migrated.add('relu-gatekeeper');
    } catch { /* A corrupt game record must not block the arcade. */ }
    return migrated;
  }

  hasSeen(gameId) { return this.seen.has(gameId); }

  markSeen(gameId) {
    this.seen.add(gameId);
    this.save();
  }

  reset() {
    this.seen.clear();
    this.save();
  }

  save() {
    this.storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, seen: [...this.seen] }));
  }
}

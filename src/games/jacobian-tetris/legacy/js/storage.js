const KEY = 'arcade.legacy.jacobian-tetris.v1';

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function defaultProgress() {
  return {
    currentLevel: 1,
    completed: [],
    score: 0,
    mastery: { orientation: 0, sparsity: 0, diagonal: 0, broadcast: 0, chain: 0, reverse: 0 },
    settings: { sound: false, reducedMotion: false },
    practiceSeed: 4821
  };
}

export function saveProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress));
}

export function resetProgress() {
  const progress = defaultProgress();
  saveProgress(progress);
  return progress;
}

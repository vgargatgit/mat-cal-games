import { createGradientDescentNavigator } from './view.js';
import { gameById } from '../game-data.js';

const metadata = gameById('gradient-descent-navigator');
let game = null;
export default {
  id: metadata.id, title: metadata.title, description: metadata.description, difficulty: metadata.difficulty,
  create(container, context) { game = createGradientDescentNavigator(container, context, metadata); return this; },
  destroy() { game?.destroy(); game = null; },
  pause() { game?.pause(); }, resume() { game?.resume(); }, restart() { game?.restart(); }, hint() { return game?.hint() ?? false; },
};

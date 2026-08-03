import { createReLUGatekeeper } from './view.js';
import { gameById } from '../game-data.js';

const metadata = gameById('relu-gatekeeper');
let game = null;
export default {
  id: metadata.id, title: metadata.title, description: metadata.description, difficulty: metadata.difficulty,
  create(container, context) { game = createReLUGatekeeper(container, context, metadata); return this; },
  destroy() { game?.destroy(); game = null; },
  pause() { game?.pause(); }, resume() { game?.resume(); }, restart() { game?.restart(); }, hint() { return game?.hint() ?? false; },
};

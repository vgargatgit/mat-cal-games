import { GAME_DATA } from './game-data.js';

export const GAME_CATALOG = GAME_DATA.map((game) => ({
  ...game,
  load: () => import(`./${game.id}/module.js`).then((module) => module.default),
}));

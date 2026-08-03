import { createLegacyGameModule } from '../legacy-game-module.js';
import { gameById } from '../game-data.js';
export default createLegacyGameModule({ ...gameById('partial-derivative-freeze'), moduleUrl: import.meta.url });

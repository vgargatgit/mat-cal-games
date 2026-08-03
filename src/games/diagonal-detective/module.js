import { createLegacyGameModule } from '../legacy-game-module.js';
import { gameById } from '../game-data.js';
export default createLegacyGameModule({ ...gameById('diagonal-detective'), moduleUrl: import.meta.url });

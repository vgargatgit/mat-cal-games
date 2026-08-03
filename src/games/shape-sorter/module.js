import { createLegacyGameModule } from '../legacy-game-module.js';
import { gameById } from '../game-data.js';
export default createLegacyGameModule({ ...gameById('shape-sorter'), moduleUrl: import.meta.url });

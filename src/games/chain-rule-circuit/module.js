import { createLegacyGameModule } from '../legacy-game-module.js';
import { gameById } from '../game-data.js';
export default createLegacyGameModule({ ...gameById('chain-rule-circuit'), moduleUrl: import.meta.url });

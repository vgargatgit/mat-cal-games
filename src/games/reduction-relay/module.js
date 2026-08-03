import { createLegacyGameModule } from '../legacy-game-module.js';
import { gameById } from '../game-data.js';
export default createLegacyGameModule({ ...gameById('reduction-relay'), moduleUrl: import.meta.url });

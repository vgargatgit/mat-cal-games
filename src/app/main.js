import { ArcadeShell } from './shell/arcade-shell.js';

const root = document.querySelector('#arcade-root');
const shell = new ArcadeShell(root);
shell.start();

window.addEventListener('pagehide', () => shell.destroy(), { once: true });

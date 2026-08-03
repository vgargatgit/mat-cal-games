import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = process.argv[2] || 'http://127.0.0.1:9227';
const baseUrl = process.argv[3] || 'http://127.0.0.1:8080/';
const tabs = await (await fetch(`${endpoint}/json`)).json();
const tab = tabs.find((entry) => entry.type === 'page');
if (!tab) throw new Error('No Chrome page is available.');

const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
const exceptions = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
};

const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => (await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = async (name, expression) => {
  const result = await evaluate(expression);
  if (!result) throw new Error(`${name} failed`);
  console.log(`PASS ${name}`);
};
const screenshot = async (name) => {
  const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(new URL(`../docs/screenshots/${name}.png`, import.meta.url), Buffer.from(data, 'base64'));
};

await mkdir(new URL('../docs/screenshots/', import.meta.url), { recursive: true });
await call('Runtime.enable');
await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await call('Page.navigate', { url: baseUrl });
await wait(900);
await evaluate(`localStorage.removeItem('matrix-calculus-arcade.progress.v1'); location.hash='#/home'; location.reload()`);
await wait(700);
await check('landing title renders', `document.querySelector('h1')?.textContent==='Matrix CalculusArcade'`);
await check('landing has all primary actions', `['Start journey','New game','Free play','Progress','Settings','Credits'].every(label=>document.body.textContent.includes(label))`);
await check('page has no horizontal overflow', `document.documentElement.scrollWidth<=document.documentElement.clientWidth`);
await screenshot('home-desktop');

await evaluate(`location.hash='#/map'`); await wait(350);
await check('world map has eight game nodes', `document.querySelectorAll('.map-node').length===8`);
await check('only the first journey game is playable', `[...document.querySelectorAll('.map-node > button')].filter(button=>!button.disabled).length===1`);
await screenshot('world-map-desktop');

await evaluate(`document.querySelector('.map-node > button').click()`); await wait(1600);
await check('shared HUD renders', `['Home','Restart','Hint','Mute'].every(label=>document.querySelector('.hud')?.textContent.includes(label))`);
await check('first game lazy-loads', `document.querySelector('.game-frame')?.contentDocument?.title==='Shape Sorter'`);
await check('duplicate game header is suppressed', `getComputedStyle(document.querySelector('.game-frame').contentDocument.querySelector('.topbar')).display==='none'`);
await screenshot('game-hud-desktop');

await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate(`location.hash='#/home'`); await wait(450);
await check('mobile landing has no horizontal overflow', `document.documentElement.scrollWidth<=document.documentElement.clientWidth`);
await screenshot('home-mobile');

await evaluate(`location.hash='#/map/free'`); await wait(450);
await check('free play opens every game', `[...document.querySelectorAll('.map-node > button')].every(button=>!button.disabled)`);
await check('free play does not mutate unlock progress', `JSON.parse(localStorage.getItem('matrix-calculus-arcade.progress.v1')).unlockedLevel===0`);

await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await evaluate(`(()=>{const state=JSON.parse(localStorage.getItem('matrix-calculus-arcade.progress.v1'));state.unlockedLevel=7;state.completedGames=${JSON.stringify(['shape-sorter','partial-derivative-freeze','build-jacobian','diagonal-detective','broadcast-factory','reduction-relay','chain-rule-circuit','jacobian-tetris'])};state.completedConcepts=${JSON.stringify(['derivative shapes','partial derivatives','Jacobians','broadcasting','reductions','chain rule'])};state.stars=Object.fromEntries(state.completedGames.map(id=>[id,3]));state.achievements=Object.fromEntries(['Shape Master','Broadcast Hero','Reduction Wizard','Jacobian Genius','Chain Rule Master','Perfect Game','Speed Runner','No Hints Used'].map(name=>[name,new Date().toISOString()]));localStorage.setItem('matrix-calculus-arcade.progress.v1',JSON.stringify(state));location.hash='#/mastery';location.reload()})()`);
await wait(700);
await check('mastery synthesis renders after all games', `document.querySelector('h1')?.textContent==='Matrix Calculus Mastery'&&document.body.textContent.includes('Derivative shapes')&&document.body.textContent.includes('Chain rule')`);
await screenshot('mastery-desktop');

if (exceptions.length) throw new Error(`Browser exceptions:\n${exceptions.join('\n')}`);
console.log('Browser smoke checks passed and screenshots captured.');
socket.close();

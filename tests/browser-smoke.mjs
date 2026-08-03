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
await call('Network.enable');
await call('Network.setCacheDisabled', { cacheDisabled: true });
await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await call('Page.navigate', { url: baseUrl });
await wait(900);
await evaluate(`Object.keys(localStorage).filter(key=>key.startsWith('arcade.training.')||key.startsWith('arcade.legacy.')).forEach(key=>localStorage.removeItem(key));localStorage.removeItem('matrix-calculus-arcade.progress.v1');localStorage.removeItem('matrix-calculus-arcade.tutorials.v1'); location.hash='#/home'; location.reload()`);
await wait(700);
await check('landing title renders', `document.querySelector('h1')?.textContent==='Matrix CalculusArcade'`);
await check('landing has all primary actions', `['Start journey','New game','Free play','Progress','Settings','Credits'].every(label=>document.body.textContent.includes(label))`);
await check('page has no horizontal overflow', `document.documentElement.scrollWidth<=document.documentElement.clientWidth`);
await screenshot('home-desktop');

await evaluate(`location.hash='#/map'`); await wait(350);
await check('world map has eleven game nodes', `document.querySelectorAll('.map-node').length===11`);
await check('Chapter III is presented as a graduation arc', `document.querySelector('.chapter-divider')?.textContent.includes('Learning to Train a Network')`);
await check('only the first journey game is playable', `[...document.querySelectorAll('.map-node > button')].filter(button=>!button.disabled).length===1`);
await screenshot('world-map-desktop');

await evaluate(`document.querySelector('.map-node > button').click()`); await wait(1600);
await check('shared HUD renders', `['Home','Restart','Rules','Hint','Mute'].every(label=>document.querySelector('.hud')?.textContent.includes(label))`);
await check('first game lazy-loads', `document.querySelector('.game-frame')?.contentDocument?.title==='Shape Sorter'`);
await check('duplicate game header is suppressed', `getComputedStyle(document.querySelector('.game-frame').contentDocument.querySelector('.topbar')).display==='none'`);
await check('Shape Sorter receives the shared first-run tutorial', `document.querySelector('dialog[open] h2')?.textContent==='How to play Shape Sorter'&&document.body.textContent.includes('Sort the derivative by shape')&&document.querySelector('.game-frame').dataset.paused==='true'`);
await screenshot('shape-sorter-tutorial-desktop');
await evaluate(`document.querySelector('dialog[open] .icon-button').click()`); await wait(80);
await evaluate(`(()=>{const frame=document.querySelector('.game-frame');frame.contentDocument.body.style.setProperty('min-height','1800px','important');frame.contentWindow.scrollTo(0,400)})()`); await wait(80);
await check('legacy game scrolls immediately after its tutorial closes', `(()=>{const frame=document.querySelector('.game-frame');return !frame.dataset.paused&&frame.contentWindow.scrollY>0})()`);
await evaluate(`(()=>{const frame=document.querySelector('.game-frame');frame.contentDocument.body.style.removeProperty('min-height');frame.contentWindow.scrollTo(0,0)})()`);
await screenshot('game-hud-desktop');

await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await wait(120);
await check('mobile HUD fits all five shared controls', `document.documentElement.scrollWidth<=document.documentElement.clientWidth&&document.querySelectorAll('.hud__actions .button').length===5`);
await screenshot('game-hud-mobile');
await evaluate(`location.hash='#/home'`); await wait(450);
await check('mobile landing has no horizontal overflow', `document.documentElement.scrollWidth<=document.documentElement.clientWidth`);
await screenshot('home-mobile');

await evaluate(`location.hash='#/map/free'`); await wait(450);
await check('free play opens every game', `[...document.querySelectorAll('.map-node > button')].every(button=>!button.disabled)`);
await check('free play does not mutate unlock progress', `JSON.parse(localStorage.getItem('matrix-calculus-arcade.progress.v1')).unlockedLevel===0`);

await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await evaluate(`window.scrollTo({top:document.querySelector('.chapter-divider').offsetTop-150,left:0,behavior:'instant'})`); await wait(250);
await screenshot('chapter-iii-map-desktop');

await evaluate(`document.querySelectorAll('.map-node > button')[8].click()`); await wait(450);
await check('ReLU Gatekeeper loads as a native arcade game', `document.querySelector('.gatekeeper .relu-gate')&&document.querySelector('.game-frame')===null`);
await check('ReLU tutorial opens on the first visit and pauses play', `document.querySelector('dialog[open] .tutorial')&&document.querySelector('dialog h2')?.textContent==='How to play ReLU Gatekeeper'&&document.body.textContent.includes('Guard the backward gradient')&&document.querySelector('.gatekeeper').inert`);
await screenshot('relu-gatekeeper-tutorial-desktop');
await evaluate(`document.querySelector('.modal__actions .button--primary').click()`); await wait(80);
await check('ReLU tutorial states both derivative rules', `document.querySelectorAll('.tutorial-rule').length===2&&document.body.textContent.includes('z > 0')&&document.body.textContent.includes('z ≤ 0')`);
await evaluate(`for(let step=0;step<3;step+=1)document.querySelector('.modal__actions .button--primary').click()`); await wait(80);
await check('ReLU tutorial can be replayed and resumes play after completion', `[...document.querySelectorAll('.hud .button')].some(button=>button.textContent.includes('Rules'))&&!document.querySelector('dialog[open]')&&!document.querySelector('.gatekeeper').inert&&JSON.parse(localStorage.getItem('matrix-calculus-arcade.tutorials.v1')).seen.includes('relu-gatekeeper')`);
await evaluate(`document.querySelectorAll('.choice-grid .button')[1].click()`); await wait(150);
await check('ReLU decision gives concise local-Jacobian feedback', `document.querySelector('.training-feedback--correct')?.textContent.includes('ReLU′')`);
await screenshot('relu-gatekeeper-desktop');

await evaluate(`location.hash='#/game/gradient-descent-navigator'`); await wait(450);
await check('Gradient Descent Navigator renders linked live visualizations', `document.querySelector('.contour-map')&&document.querySelector('.loss-sparkline')&&document.querySelector('#eta-slider')`);
await evaluate(`document.querySelector('dialog[open] .icon-button')?.click()`); await wait(50);
await evaluate(`document.querySelector('#eta-slider').value='.25';document.querySelector('#eta-slider').dispatchEvent(new Event('input',{bubbles:true}));[...document.querySelectorAll('.navigator-controls button')].find(button=>button.textContent.includes('Take one')).click()`); await wait(700);
await check('optimizer step updates the parameter trace', `document.querySelector('[data-trace]').getAttribute('points').trim().split(' ').length>=2`);
await screenshot('gradient-descent-desktop');

await evaluate(`location.hash='#/game/backpropagation-boss'`); await wait(450);
await check('Boss Battle renders the tiny network and Jacobian tray', `document.querySelectorAll('.network-layer').length===5&&document.querySelectorAll('.transform-tile').length>=7`);
await evaluate(`document.querySelector('dialog[open] .icon-button')?.click()`); await wait(50);
await evaluate(`document.querySelector('[data-transform="loss-gradient"]').click();[...document.querySelectorAll('.boss-console .button')].find(button=>button.textContent.includes('Route gradient')).click()`); await wait(180);
await check('correct boss move lights an edge and explains why', `document.querySelector('.training-feedback--correct')?.textContent.includes('first incoming gradient')`);
await screenshot('backprop-boss-desktop');

await evaluate(`(()=>{const state=JSON.parse(localStorage.getItem('matrix-calculus-arcade.progress.v1'));state.unlockedLevel=10;state.completedGames=${JSON.stringify(['shape-sorter','partial-derivative-freeze','build-jacobian','diagonal-detective','broadcast-factory','reduction-relay','chain-rule-circuit','jacobian-tetris','relu-gatekeeper','gradient-descent-navigator','backpropagation-boss'])};state.completedConcepts=${JSON.stringify(['derivative shapes','partial derivatives','Jacobians','broadcasting','reductions','chain rule','ReLU derivatives','gradient descent','complete backpropagation'])};state.stars=Object.fromEntries(state.completedGames.map(id=>[id,3]));state.achievements=Object.fromEntries(['Shape Master','Broadcast Hero','Reduction Wizard','Jacobian Genius','Chain Rule Master','Gatekeeper','Descent Navigator','Backprop Boss','Backpropagation Rebuilt','Perfect Game','Speed Runner','No Hints Used'].map(name=>[name,new Date().toISOString()]));localStorage.setItem('matrix-calculus-arcade.progress.v1',JSON.stringify(state));location.hash='#/mastery';location.reload()})()`);
await wait(700);
await check('mastery synthesis renders after all games', `document.querySelector('h1')?.textContent==='Matrix Calculus Mastery'&&document.body.textContent.includes('Backward pass')&&document.body.textContent.includes('Weight update')`);
await screenshot('mastery-desktop');
await evaluate(`location.hash='#/inside-backprop'`); await wait(350);
await check('Inside Backpropagation sandbox unlocks after the boss', `document.querySelector('.backprop-sandbox')&&document.querySelectorAll('.sandbox-layer').length>=3`);
await check('sandbox starts with an uncomposed output gradient', `document.querySelector('.chain-rule-equation')?.textContent.trim()==='∇output L'`);
await evaluate(`document.querySelector('[data-action="backward"]').click()`); await wait(120);
await check('one backward step animates one local Jacobian', `document.querySelector('.chain-token--new')?.textContent==='J₃ᵀ'&&document.querySelectorAll('.sandbox-jacobian--complete').length===1`);
await evaluate(`document.querySelector('[data-action="backward"]').click();document.querySelector('[data-action="backward"]').click()`); await wait(120);
await check('backward product reaches the input in correct order', `document.querySelector('.chain-rule-equation')?.textContent.replaceAll('×','').replaceAll(/\\s/g,'')==='J₁ᵀJ₂ᵀJ₃ᵀ∇outputL'&&document.querySelector('[data-action="backward"]').disabled`);
await check('gradient history records every local multiplication', `document.querySelectorAll('.gradient-history li').length===4&&document.body.textContent.includes('Input gradient assembled')`);
await evaluate(`window.scrollTo({top:document.querySelector('.sandbox-network').offsetTop-90,left:0,behavior:'instant'})`); await wait(80);
await screenshot('inside-backprop-desktop');
await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate(`(()=>{const slider=document.querySelector('#sandbox-depth');slider.value='5';slider.dispatchEvent(new Event('input',{bubbles:true}));for(let index=0;index<5;index+=1)document.querySelector('[data-action="backward"]').click();document.documentElement.classList.add('reduce-motion');window.scrollTo({top:document.querySelector('.chain-rule-visualizer').offsetTop-70,left:0,behavior:'instant'})})()`); await wait(80);
await check('five-layer product remains within the mobile page', `document.documentElement.scrollWidth<=document.documentElement.clientWidth&&document.querySelectorAll('.chain-token[data-layer]').length===5`);
await check('reduced motion keeps the complete equation without movement', `parseFloat(getComputedStyle(document.querySelector('.chain-token--new')).animationDuration)<=.001&&document.querySelector('.chain-rule-equation').textContent.includes('J₅ᵀ')`);
await screenshot('inside-backprop-mobile');

await evaluate(`localStorage.removeItem('matrix-calculus-arcade.progress.v1')`);
await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await call('Page.navigate', { url: `${baseUrl}?debug=1#/map` }); await wait(650);
await check('debug mode is visibly identified', `document.querySelector('.debug-badge')?.textContent.includes('all levels open')&&document.querySelector('h1')?.textContent==='Debug Map'`);
await check('debug mode opens all eleven games without changing progress', `[...document.querySelectorAll('.map-node > button')].every(button=>!button.disabled)&&JSON.parse(localStorage.getItem('matrix-calculus-arcade.progress.v1')).unlockedLevel===0`);
await evaluate(`location.hash='#/inside-backprop'`); await wait(250);
await check('debug mode opens the post-boss laboratory', `document.querySelector('.backprop-sandbox')!==null`);

const tutorialGames = ['shape-sorter', 'partial-derivative-freeze', 'build-jacobian', 'diagonal-detective', 'broadcast-factory', 'reduction-relay', 'chain-rule-circuit', 'jacobian-tetris', 'relu-gatekeeper', 'gradient-descent-navigator', 'backpropagation-boss'];
for (const gameId of tutorialGames) {
  await evaluate(`location.hash='#/game/${gameId}'`); await wait(220);
  await evaluate(`if(!document.querySelector('dialog[open]'))[...document.querySelectorAll('.hud .button')].find(button=>button.textContent.includes('Rules')).click()`); await wait(40);
  await check(`${gameId} exposes its shared tutorial`, `document.querySelector('dialog[open] h2')?.textContent.startsWith('How to play ')&&document.querySelector('.tutorial__progress')?.textContent.includes('Step 1 of 4')`);
  await evaluate(`document.querySelector('dialog[open] .icon-button').click()`); await wait(30);
}

await evaluate(`location.hash='#/game/broadcast-factory'`); await wait(300);
await evaluate(`document.querySelector('.game-frame').contentDocument.querySelector('[data-action="continue-game"]').click()`); await wait(40);
await evaluate(`document.querySelector('.game-frame').contentDocument.querySelector('[data-action="select-level"][data-value="8"]').click()`); await wait(40);
await check('debug mode unlocks levels inside legacy games', `(()=>{const doc=document.querySelector('.game-frame').contentDocument;return new URL(doc.location.href).searchParams.get('debug')==='1'&&!doc.querySelector('[data-action="start-round"]').disabled&&!doc.body.textContent.includes('Preview only')})()`);
await evaluate(`(()=>{const doc=document.querySelector('.game-frame').contentDocument;doc.querySelector('[data-action="select-level"][data-value="1"]').click();doc.querySelector('[data-action="start-round"]').click()})()`); await wait(80);
await check('guided output dimensions are submitted values, not placeholders', `(()=>{const doc=document.querySelector('.game-frame').contentDocument;return doc.querySelector('#output-rows').value!==''&&doc.querySelector('#output-columns').value!==''})()`);
await evaluate(`(async()=>{const frame=document.querySelector('.game-frame');let doc=frame.contentDocument;const values=[...doc.querySelectorAll('[data-action="choose-operation"]')].map(button=>button.dataset.value);for(const value of values){doc.querySelector('[data-action="choose-operation"][data-value="'+value+'"]')?.click();await new Promise(resolve=>setTimeout(resolve,20));doc=frame.contentDocument;if(doc.querySelector('.feedback-panel.correct'))break}})()`); await wait(80);
await check('Broadcast success feedback no longer overlays the board', `(()=>{const panel=document.querySelector('.game-frame').contentDocument.querySelector('.feedback-panel.correct');return panel&&getComputedStyle(panel).position==='relative'&&panel.querySelector('[data-action="dismiss-feedback"]')})()`);
await evaluate(`document.querySelector('.game-frame').contentDocument.querySelector('[data-action="dismiss-feedback"]').click()`); await wait(40);
await check('Broadcast station feedback can be dismissed', `!document.querySelector('.game-frame').contentDocument.querySelector('.feedback-panel')`);

if (exceptions.length) throw new Error(`Browser exceptions:\n${exceptions.join('\n')}`);
console.log('Browser smoke checks passed and screenshots captured.');
socket.close();

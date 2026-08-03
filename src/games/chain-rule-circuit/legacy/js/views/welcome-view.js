import { el } from '../components/dom.js';
import { overallMastery } from '../state.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attributes = {}, text = '') {
  const node = document.createElementNS(NS, tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text) node.textContent = text;
  return node;
}

function demoNode(svg, { x, y, width = 106, height = 62, title, caption, role }) {
  const group = svgEl('g', { transform:`translate(${x} ${y})` });
  group.append(svgEl('rect', { width, height, rx:16, class:`demo-node-box demo-node-${role}` }));
  group.append(svgEl('text', { x:width / 2, y:27, class:'demo-node-title' }, title));
  group.append(svgEl('text', { x:width / 2, y:46, class:'demo-node-caption' }, caption));
  svg.append(group);
}

function gainTag(svg, x, y, text) {
  const width = Math.max(62, text.length * 7 + 16);
  const group = svgEl('g', { transform:`translate(${x - width / 2} ${y})` });
  group.append(svgEl('rect', { width, height:27, class:'demo-gain' }));
  group.append(svgEl('text', { x:width / 2, y:18, class:'demo-gain-text' }, text));
  svg.append(group);
}

function createDemoSvg() {
  const svg = svgEl('svg', { class:'demo-svg', viewBox:'0 0 470 330', role:'img', 'aria-label':'Input x branches through square and scale gates. The two routes meet at addition node y. Forward values travel right and backward gradients travel left.' });
  const defs = svgEl('defs');
  const forward = svgEl('marker', { id:'demo-forward', viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:6, markerHeight:6, orient:'auto' });
  forward.append(svgEl('path', { d:'M0 0L10 5L0 10Z', fill:'#f28c28' }));
  const backward = svgEl('marker', { id:'demo-backward', viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:6, markerHeight:6, orient:'auto' });
  backward.append(svgEl('path', { d:'M0 0L10 5L0 10Z', fill:'#2b7de9' }));
  defs.append(forward, backward);
  svg.append(defs);

  const paths = [
    'M105 165 C145 165 140 93 180 93',
    'M105 165 C145 165 140 237 180 237',
    'M286 93 C326 93 323 165 360 165',
    'M286 237 C326 237 323 165 360 165'
  ];
  paths.forEach(d => svg.append(svgEl('path', { d, class:'demo-wire-forward', 'marker-end':'url(#demo-forward)' })));
  [...paths].reverse().forEach(d => {
    const reversed = d
      .replace(/^M105 165 C145 165 140 93 180 93$/, 'M180 93 C140 93 145 165 105 165')
      .replace(/^M105 165 C145 165 140 237 180 237$/, 'M180 237 C140 237 145 165 105 165')
      .replace(/^M286 93 C326 93 323 165 360 165$/, 'M360 165 C323 165 326 93 286 93')
      .replace(/^M286 237 C326 237 323 165 360 165$/, 'M360 165 C323 165 326 237 286 237');
    svg.append(svgEl('path', { d:reversed, class:'demo-wire-backward', 'marker-end':'url(#demo-backward)' }));
  });

  demoNode(svg, { x:18, y:134, width:87, title:'x', caption:'input', role:'input' });
  demoNode(svg, { x:180, y:62, title:'u=x²', caption:'square', role:'operation' });
  demoNode(svg, { x:180, y:206, title:'v=3x', caption:'scale', role:'operation' });
  demoNode(svg, { x:360, y:134, width:92, title:'y=u+v', caption:'output', role:'output' });
  gainTag(svg, 143, 92, 'du/dx');
  gainTag(svg, 143, 210, 'dv/dx');
  gainTag(svg, 326, 92, '∂y/∂u');
  gainTag(svg, 326, 210, '∂y/∂v');
  svg.append(svgEl('circle', { cx:345, cy:165, r:18, class:'demo-junction' }));
  svg.append(svgEl('text', { x:345, y:172, class:'demo-junction-text' }, '+'));
  return svg;
}

function quantityCard(kind, symbol, title, text) {
  return el('article', { className:`card quantity-card ${kind}` },
    el('span', { className:'quantity-icon', text:symbol, 'aria-hidden':'true' }),
    el('div', {}, el('h3', { text:title }), el('p', { text }))
  );
}

export function createWelcomeView({ game, onStart, onContinue, onTutorial }) {
  const shell = el('div', { className:'shell' });
  const copy = el('div', { className:'welcome-copy' },
    el('span', { className:'game-label', text:'Electrical Circuit Laboratory' }),
    el('h1', {}, 'Chain Rule', el('span', { text:'Circuit' })),
    el('p', { className:'lead', text:'Break a complex expression into inspectable operations. Label each wire with its local derivative, route a gradient backward, and combine every dependency path correctly.' }),
    el('div', { className:'skill-strip', 'aria-label':'Core game skills' },
      el('span', { className:'skill-chip', text:'Decompose expressions' }),
      el('span', { className:'skill-chip', text:'Label local gains' }),
      el('span', { className:'skill-chip', text:'Multiply one route' }),
      el('span', { className:'skill-chip', text:'Add returning routes' })
    ),
    el('div', { className:'button-row hero-actions' },
      el('button', { className:'btn accent', onClick:() => onStart(1) }, el('span', { text:'Start Level 1' }), el('span', { text:'→', 'aria-hidden':'true' })),
      game.currentRound ? el('button', { className:'btn blue', onClick:onContinue, text:`Continue Level ${game.progress.currentLevel}` }) : null,
      el('button', { className:'btn secondary', onClick:onTutorial }, el('span', { text:'▶', 'aria-hidden':'true' }), 'Run the tutorial')
    )
  );

  const demo = el('section', { className:'circuit-demo', 'aria-label':'Chain rule circuit preview' },
    el('div', { className:'demo-heading' },
      el('div', {}, el('h2', { text:'Live circuit preview' }), el('p', { text:'One input · two routes · one accumulation junction' })),
      el('span', { className:'badge info', text:'Numerator layout' })
    ),
    el('div', { className:'demo-board' }, createDemoSvg()),
    el('div', { className:'demo-rule-strip' },
      el('div', { className:'demo-rule' }, el('strong', { text:'Multiply within a route' }), el('small', { text:'Each change passes through the next local gain.' })),
      el('span', { className:'demo-rule-symbol', text:'+' }),
      el('div', { className:'demo-rule' }, el('strong', { text:'Add across routes' }), el('small', { text:'Separate completed contributions meet at a junction.' }))
    )
  );

  shell.append(el('section', { className:'welcome-hero' }, copy, demo));

  const mastery = overallMastery(game);
  shell.append(el('section', { className:'hero-stats', 'aria-label':'Progress summary' },
    el('div', { className:'metric' }, el('span', { text:'Overall mastery' }), el('strong', { text:`${mastery}%` }), el('div', { className:'progress-track' }, el('div', { className:'progress-fill', style:`width:${mastery}%` }))),
    el('div', { className:'metric' }, el('span', { text:'Progressive levels' }), el('strong', { text:'22' })),
    el('div', { className:'metric' }, el('span', { text:'Best circuit streak' }), el('strong', { text:String(game.progress.bestStreak) })),
    el('div', { className:'metric' }, el('span', { text:'Signal points' }), el('strong', { text:String(game.progress.score) }))
  ));

  shell.append(el('section', { className:'quantity-legend', 'aria-label':'Quantities kept separate in the game' },
    quantityCard('forward', '→', 'Forward value', 'The number or vector produced by a node during the forward computation.'),
    quantityCard('local', '∂', 'Local derivative', 'The immediate sensitivity attached to one dependency wire—not the total gradient.'),
    quantityCard('backward', '←', 'Backward gradient', 'The returning sensitivity. Contributions from every downstream use are preserved and added.')
  ));
  return shell;
}

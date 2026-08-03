import { describeGraph, outgoingEdges } from '../math/computation-graph.js';

const NS = 'http://www.w3.org/2000/svg';
const WIDTH = 860;
const HEIGHT = 390;
const NODE_WIDTH = 168;
const NODE_HEIGHT = 118;

function svgEl(tag, attributes = {}) {
  const element = document.createElementNS(NS, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function textNode(tag, text, attributes = {}) {
  const element = svgEl(tag, attributes);
  element.textContent = text;
  return element;
}

function normalizedPositions(nodes) {
  const originals = nodes.map((node, index) => node.position ?? { x:index * 180, y:150 });
  const xs = originals.map(position => position.x);
  const ys = originals.map(position => position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  return new Map(nodes.map((node, index) => {
    const original = originals[index];
    const x = maxX === minX ? WIDTH / 2 : 100 + ((original.x - minX) / spanX) * 660;
    const y = maxY === minY ? 195 : 95 + ((original.y - minY) / spanY) * 200;
    return [node.id, { x, y }];
  }));
}

function edgePath(start, end, reverse = false, laneOffset = 0) {
  const baseFrom = reverse ? end : start;
  const baseTo = reverse ? start : end;
  const from = { x:baseFrom.x, y:baseFrom.y + laneOffset };
  const to = { x:baseTo.x, y:baseTo.y + laneOffset };
  const direction = to.x >= from.x ? 1 : -1;
  const x1 = from.x + direction * NODE_WIDTH / 2;
  const x2 = to.x - direction * NODE_WIDTH / 2;
  const bend = Math.max(35, Math.abs(x2 - x1) * .45);
  return `M ${x1} ${from.y} C ${x1 + direction * bend} ${from.y}, ${x2 - direction * bend} ${to.y}, ${x2} ${to.y}`;
}

function edgeMidpoint(start, end) {
  return { x:(start.x + end.x) / 2, y:(start.y + end.y) / 2 };
}

function appendMarkerDefinitions(svg) {
  const defs = svgEl('defs');
  const forward = svgEl('marker', { id:'arrow-forward', viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:7, markerHeight:7, orient:'auto' });
  forward.append(svgEl('path', { d:'M 0 0 L 10 5 L 0 10 z', fill:'#f28c28' }));
  const backward = svgEl('marker', { id:'arrow-backward', viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:7, markerHeight:7, orient:'auto' });
  backward.append(svgEl('path', { d:'M 0 0 L 10 5 L 0 10 z', fill:'#2b7de9' }));
  defs.append(forward, backward);
  svg.append(defs);
}

function derivativeTag(svg, edge, midpoint, visible) {
  const expression = visible ? (edge.localDerivative?.expression ?? '?') : 'gain hidden';
  const notation = `∂${edge.to}/∂${edge.from}`;
  const width = Math.min(152, Math.max(82, Math.max(expression.length, notation.length) * 7.4 + 20));
  const group = svgEl('g', { transform:`translate(${midpoint.x - width / 2} ${midpoint.y - 43})` });
  group.append(svgEl('rect', { width, height:38, rx:11, class:'derivative-tag' }));
  group.append(textNode('text', visible ? notation : 'STAGE 3', { x:width / 2, y:12, class:'derivative-caption' }));
  group.append(textNode('text', expression, { x:width / 2, y:28, class:'derivative-text' }));
  svg.append(group);
}

function appendNode(svg, node, position, showGradients, gradientNumerator) {
  const left = position.x - NODE_WIDTH / 2;
  const top = position.y - NODE_HEIGHT / 2;
  const role = node.role === 'input' ? 'INPUT' : node.role === 'output' ? 'OUTPUT' : 'OPERATION';
  const roleClass = node.role === 'input' ? 'node-input' : node.role === 'output' ? 'node-output' : 'node-intermediate';
  const group = svgEl('g', {
    transform:`translate(${left} ${top})`,
    tabindex:'0',
    role:'group',
    'aria-label':`${role.toLowerCase()} ${node.id}. ${node.label}. Forward value ${node.forwardValue ?? 'not evaluated'}.${showGradients ? ` Backward gradient ∂${gradientNumerator}/∂${node.id}.` : ''}`
  });

  group.append(svgEl('rect', { x:4, y:5, width:NODE_WIDTH, height:NODE_HEIGHT, rx:17, class:'node-shadow' }));
  group.append(svgEl('rect', { width:NODE_WIDTH, height:NODE_HEIGHT, rx:17, class:`node-box ${roleClass}` }));
  group.append(svgEl('rect', { x:10, y:9, width:66, height:18, rx:9, class:'node-role-badge' }));
  group.append(textNode('text', role, { x:43, y:21, class:'node-role-text' }));
  group.append(textNode('text', node.id, { x:NODE_WIDTH / 2, y:50, class:'node-id' }));

  const label = node.label.length > 25 ? `${node.label.slice(0, 24)}…` : node.label;
  group.append(textNode('text', label, { x:NODE_WIDTH / 2, y:69, class:'node-label' }));
  group.append(svgEl('line', { x1:10, y1:78, x2:NODE_WIDTH - 10, y2:78, class:'node-divider' }));
  group.append(textNode('text', 'VALUE', { x:13, y:93, class:'node-value-label' }));
  group.append(textNode('text', String(node.forwardValue ?? 'symbolic'), { x:52, y:93, class:'node-value' }));
  group.append(textNode('text', 'GRAD', { x:13, y:108, class:'node-gradient-label' }));
  group.append(textNode('text', showGradients ? `∂${gradientNumerator}/∂${node.id}` : 'not routed', { x:52, y:108, class:'node-gradient' }));
  svg.append(group);
}

function appendAccumulator(svg, node, position) {
  const group = svgEl('g', { transform:`translate(${position.x + 55} ${position.y - 78})` });
  group.append(svgEl('circle', { r:19, class:'accumulator' }));
  group.append(textNode('text', '+', { x:0, y:6, class:'accumulator-text' }));
  group.append(textNode('text', 'ADD RETURNS', { x:0, y:-27, class:'accumulator-caption' }));
  group.setAttribute('role', 'img');
  group.setAttribute('aria-label', `Backward gradient contributions accumulate at ${node.id}.`);
  svg.append(group);
}

export function createCircuitGraph(graph, options = {}) {
  const board = document.createElement('section');
  board.className = 'circuit-board';
  board.setAttribute('aria-label', 'Computation graph workbench');

  const toolbar = document.createElement('div');
  toolbar.className = 'board-toolbar';
  const boardTitle = document.createElement('span');
  boardTitle.className = 'board-title';
  boardTitle.textContent = 'Circuit workbench';
  const legend = document.createElement('div');
  legend.className = 'circuit-legend';
  legend.append(
    Object.assign(document.createElement('span'), { className:'legend-key' }),
    Object.assign(document.createElement('span'), { className:'legend-key' }),
    Object.assign(document.createElement('span'), { className:'legend-key' })
  );
  legend.children[0].append(Object.assign(document.createElement('i'), { className:'legend-line forward' }), document.createTextNode('forward value →'));
  legend.children[1].append(Object.assign(document.createElement('i'), { className:'legend-pill', textContent:'∂' }), document.createTextNode('local derivative'));
  legend.children[2].append(Object.assign(document.createElement('i'), { className:'legend-line backward' }), document.createTextNode('backward gradient ←'));
  toolbar.append(boardTitle, legend);
  board.append(toolbar);

  const canvas = document.createElement('div');
  canvas.className = 'circuit-canvas';
  const svg = svgEl('svg', {
    class:'circuit-svg',
    viewBox:`0 0 ${WIDTH} ${HEIGHT}`,
    role:'img',
    'aria-labelledby':'circuit-title circuit-desc',
    preserveAspectRatio:'xMidYMid meet'
  });
  const title = textNode('title', 'Computation circuit', { id:'circuit-title' });
  const graphDescription = options.graphDescription ?? describeGraph(graph);
  const desc = textNode('desc', graphDescription, { id:'circuit-desc' });
  svg.append(title, desc);
  appendMarkerDefinitions(svg);

  const positions = normalizedPositions(graph.nodes);
  graph.edges.forEach(edge => {
    const start = positions.get(edge.from);
    const end = positions.get(edge.to);
    const key = `${edge.from}->${edge.to}`;
    const zero = String(edge.localDerivative?.expression ?? '') === '0' || edge.localDerivative?.value === 0;
    const wire = svgEl('path', {
      d:edgePath(start, end),
      class:`wire-forward ${zero ? 'zero-gain' : ''} ${options.selectedEdges?.includes(key) ? 'wire-selected' : ''}`,
      'data-edge':key,
      'marker-end':'url(#arrow-forward)',
      tabindex:'0',
      role:'button',
      'aria-label':`Forward dependency from ${edge.from} to ${edge.to}. Local derivative ${edge.localDerivative?.expression ?? 'unassigned'}.`
    });
    if (options.onEdgeSelect) {
      wire.addEventListener('click', () => options.onEdgeSelect(edge));
      wire.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          options.onEdgeSelect(edge);
        }
      });
    }
    svg.append(wire);

    if (options.showGradients) {
      svg.append(svgEl('path', {
        d:edgePath(start, end, true, 14),
        class:'wire-backward',
        'marker-end':'url(#arrow-backward)',
        'aria-hidden':'true'
      }));
    }

    const midpoint = edgeMidpoint(start, end);
    derivativeTag(svg, edge, midpoint, options.showDerivatives);
    if (zero && options.showDerivatives) {
      const closed = svgEl('g', { transform:`translate(${midpoint.x} ${midpoint.y + 11})` });
      closed.append(svgEl('circle', { r:14, class:'gate-closed' }));
      closed.append(textNode('text', '0', { x:0, y:4, class:'gate-closed-text' }));
      closed.setAttribute('role', 'img');
      closed.setAttribute('aria-label', 'Closed backward gate. Structural dependency remains, local derivative is zero.');
      svg.append(closed);
    }
  });

  const gradientNumerator = options.gradientNumerator ?? graph.nodes.find(node => node.role === 'output')?.id ?? 'y';
  graph.nodes.forEach(node => appendNode(svg, node, positions.get(node.id), options.showGradients, gradientNumerator));
  if (options.showGradients) {
    graph.nodes.filter(node => outgoingEdges(graph, node.id).length > 1).forEach(node => appendAccumulator(svg, node, positions.get(node.id)));
  }

  canvas.append(svg);
  board.append(canvas);
  const text = document.createElement('p');
  text.className = 'graph-description';
  const strong = document.createElement('strong');
  strong.textContent = 'Text view: ';
  text.append(strong, document.createTextNode(graphDescription));
  board.append(text);
  return board;
}

import { el } from './dom.js';
import { dependencyGraphDescription } from '../math/dependency-analysis.js';

export function createDependencyGraph(round) {
  const wrapper = el('section', { className: 'lab-card graph-card', 'aria-labelledby': 'graph-title' });
  wrapper.append(el('h2', { id: 'graph-title', text: 'Dependency wires' }));
  const graph = round.graph || deriveSimpleGraph(round);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 680 230');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', dependencyGraphDescription(round));
  svg.classList.add('dependency-svg');

  const positions = layout(graph.nodes);
  graph.edges.forEach((edge) => {
    const from = positions.get(edge.from); const to = positions.get(edge.to);
    if (!from || !to) return;
    const line = document.createElementNS(svg.namespaceURI, 'path');
    line.setAttribute('d', `M ${from.x + 52} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x - 52} ${to.y}`);
    line.setAttribute('class', edge.active === false ? 'graph-edge dimmed' : 'graph-edge active-path');
    svg.append(line);
    if (edge.label) {
      const label = document.createElementNS(svg.namespaceURI, 'text');
      label.setAttribute('x', String((from.x + to.x) / 2));
      label.setAttribute('y', String((from.y + to.y) / 2 - 8));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'edge-label');
      label.textContent = edge.label;
      svg.append(label);
    }
  });
  graph.nodes.forEach((name) => {
    const pos = positions.get(name);
    const group = document.createElementNS(svg.namespaceURI, 'g');
    group.setAttribute('class', `graph-node ${name === round.activeVariable ? 'active-node' : ''}`);
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', String(pos.x - 44)); rect.setAttribute('y', String(pos.y - 25)); rect.setAttribute('width', '88'); rect.setAttribute('height', '50'); rect.setAttribute('rx', '15');
    const text = document.createElementNS(svg.namespaceURI, 'text');
    text.setAttribute('x', String(pos.x)); text.setAttribute('y', String(pos.y + 6)); text.setAttribute('text-anchor', 'middle'); text.textContent = name;
    group.append(rect, text); svg.append(group);
  });
  wrapper.append(svg, el('p', { className: 'graph-description', text: dependencyGraphDescription(round) }));
  return wrapper;
}

function deriveSimpleGraph(round) {
  const terms = round.expectedAnswer.termDependencies || [];
  const nodes = [round.activeVariable, ...terms.map((_, index) => `term ${index + 1}`), round.outputName || 'f'];
  const edges = [];
  terms.forEach((term, index) => {
    if (term.dependsOnActiveVariable) edges.push({ from: round.activeVariable, to: `term ${index + 1}`, active: true });
    edges.push({ from: `term ${index + 1}`, to: round.outputName || 'f', active: term.dependsOnActiveVariable });
  });
  return { nodes, edges };
}

function layout(nodes) {
  const positions = new Map();
  const first = nodes[0]; const last = nodes[nodes.length - 1];
  positions.set(first, { x: 80, y: 115 }); positions.set(last, { x: 600, y: 115 });
  const middle = nodes.slice(1, -1);
  middle.forEach((name, index) => positions.set(name, { x: 335, y: 50 + index * (130 / Math.max(1, middle.length - 1)) }));
  return positions;
}

import { h } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function renderDependencyEditor(round, selections, onToggle, readOnly = false) {
  const rows = round.expectedShape.rows;
  const columns = round.expectedShape.columns;
  const matrix = h('div', {
    className: 'dependency-matrix',
    style: { gridTemplateColumns: `minmax(110px, auto) repeat(${columns}, minmax(85px, 1fr))` },
  });
  matrix.append(h('div', { className: 'grid-corner', text: 'wire map' }));
  round.inputs.forEach((input, column) => matrix.append(h('div', { className: 'grid-label', text: `${input} knob`, 'aria-label': `Input ${input}` })));
  round.outputs.forEach((output, row) => {
    matrix.append(h('div', { className: 'grid-label output', text: `${output.name} gauge`, 'aria-label': `Output ${output.name}` }));
    round.inputs.forEach((input, column) => {
      const connected = Boolean(selections[row][column]);
      matrix.append(h('button', {
        type: 'button', className: 'dependency-toggle', disabled: readOnly,
        'aria-pressed': connected ? 'true' : 'false',
        'aria-label': `${input} to ${output.name}: ${connected ? 'path exists' : 'no path'}`,
        text: connected ? 'PATH ✓' : 'NO PATH ×',
        onClick: () => onToggle?.(row, column, !connected),
      }));
    });
  });

  const svg = svgElement('svg', { class: 'dependency-svg', viewBox: '0 0 520 320', role: 'img', 'aria-label': dependencyDescription(round, selections) });
  const title = svgElement('title');
  title.textContent = dependencyDescription(round, selections);
  svg.append(title);
  round.inputs.forEach((input, column) => {
    const x = 80 + column * (360 / Math.max(1, columns - 1));
    const circle = svgElement('circle', { cx: x, cy: 48, r: 24, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 });
    const label = svgElement('text', { x, y: 53, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 14 });
    label.textContent = input;
    svg.append(circle, label);
  });
  round.outputs.forEach((output, row) => {
    const y = 125 + row * (155 / Math.max(1, rows - 1));
    const circle = svgElement('circle', { cx: 475, cy: y, r: 25, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 });
    const label = svgElement('text', { x: 475, y: y + 5, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 14 });
    label.textContent = output.name;
    svg.append(circle, label);
    round.inputs.forEach((input, column) => {
      if (!selections[row][column]) return;
      const x = 80 + column * (360 / Math.max(1, columns - 1));
      const line = svgElement('path', {
        d: `M ${x} 73 C ${x} ${y}, 380 ${y}, 449 ${y}`,
        fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5,
        'stroke-dasharray': column % 2 === 0 ? '0' : '7 4',
      });
      const lineTitle = svgElement('title');
      lineTitle.textContent = `${input} influences ${output.name}`;
      line.append(lineTitle);
      svg.insertBefore(line, svg.firstChild?.nextSibling || null);
    });
  });
  const alternative = h('p', { className: 'muted', text: dependencyDescription(round, selections) });
  return h('div', { className: 'dependency-layout' }, [matrix, h('div', {}, [svg, alternative])]);
}

export function dependencyDescription(round, selections) {
  const paths = [];
  round.outputs.forEach((output, row) => round.inputs.forEach((input, column) => {
    if (selections[row][column]) paths.push(`${input} influences ${output.name}`);
  }));
  return paths.length ? `Dependency paths: ${paths.join('; ')}.` : 'No dependency paths are currently selected.';
}

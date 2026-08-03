import { formatPlainMath } from '../math-renderer.js';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function addText(svg, x, y, text, className = 'svg-label', anchor = 'middle') {
  const node = svgElement('text', { x, y, 'text-anchor': anchor, class: className });
  node.textContent = text;
  svg.append(node);
  return node;
}

function format(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function createFactoryDiagram(round, { revealOutput = false, revealDependencies = false } = {}) {
  const vectors = round.operands.filter((item) => item.semanticType === 'column-vector');
  const scalars = round.operands.filter((item) => item.semanticType === 'scalar');
  const matrix = round.operands.find((item) => item.semanticType === 'matrix');
  const outputCount = round.outputShape.components;
  const inputLaneCount = Math.max(1, ...vectors.map((item) => item.values.length), matrix?.rows ?? 1);
  const laneCount = Math.max(outputCount, inputLaneCount);
  const width = 1100;
  const height = Math.max(300, 145 + laneCount * 55);
  const machineX = 650;
  const machineWidth = 220;
  const outputX = 920;
  const laneY = (index) => 112 + index * 55;
  const centerY = laneY(Math.floor((laneCount - 1) / 2));

  const svg = svgElement('svg', { viewBox: `0 0 ${width} ${height}`, class: 'factory-svg', role: 'img' });
  const title = svgElement('title');
  title.textContent = diagramDescription(round);
  svg.append(title);

  let vectorStartX = 25;
  if (matrix) {
    const matrixHeight = Math.min(210, Math.max(100, matrix.rows * 42));
    svg.append(svgElement('rect', { x: 20, y: 75, width: 145, height: matrixHeight, rx: 14, class: 'cargo matrix-cargo' }));
    addText(svg, 92, 105, `${formatPlainMath(matrix.name)}: ${matrix.rows}×${matrix.columns}`);
    matrix.values.slice(0, 4).forEach((row, rowIndex) => addText(svg, 92, 135 + rowIndex * 25, row.slice(0, 5).join('  '), 'matrix-value'));
    vectorStartX = 190;
  }

  const vectorPositions = [];
  vectors.forEach((vector, vectorIndex) => {
    const x = vectorStartX + vectorIndex * 145;
    vectorPositions.push(x);
    addText(svg, x + 55, 72, `${formatPlainMath(vector.name)} (${vector.values.length}×1)`, 'operand-heading');
    vector.values.forEach((value, lane) => {
      svg.append(svgElement('rect', { x, y: laneY(lane) - 20, width: 110, height: 40, rx: 10, class: `cargo vector-cargo vector-${vectorIndex}` }));
      addText(svg, x + 55, laneY(lane) + 5, formatPlainMath(`${vector.name}_${lane + 1}=${format(value)}`));
    });
  });

  const scalarPositions = [];
  scalars.forEach((scalar, scalarIndex) => {
    const cx = 560 - scalarIndex * 95;
    scalarPositions.push(cx);
    svg.append(svgElement('circle', { cx, cy: 43, r: 25, class: `cargo scalar-cargo scalar-${scalarIndex}` }));
    addText(svg, cx, 49, formatPlainMath(`${scalar.name}=${format(scalar.value)}`));
  });

  const machineHeight = Math.max(105, laneCount * 46);
  const machineY = 78;
  svg.append(svgElement('rect', { x: machineX, y: machineY, width: machineWidth, height: machineHeight, rx: 24, class: `machine machine-${round.operation.family}` }));
  addText(svg, machineX + machineWidth / 2, machineY + 39, round.operationLabel, 'machine-label');
  addText(svg, machineX + machineWidth / 2, machineY + 67, formatPlainMath(round.operation.component), 'machine-sub-label');

  const isReduction = round.operation.family === 'reduction';
  const isMatrix = round.operation.family === 'matrix';

  vectors.forEach((vector, vectorIndex) => {
    const startX = vectorPositions[vectorIndex] + 110;
    vector.values.forEach((_, inputIndex) => {
      if (isReduction) {
        svg.append(svgElement('path', { d: `M ${startX} ${laneY(inputIndex)} C ${startX + 120} ${laneY(inputIndex)}, ${machineX - 80} ${centerY}, ${machineX} ${centerY}`, class: 'wire reduction-wire' }));
      } else if (isMatrix && vectorIndex === vectors.length - 1) {
        for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
          svg.append(svgElement('path', { d: `M ${startX} ${laneY(inputIndex)} C ${startX + 130} ${laneY(inputIndex)}, ${machineX - 90} ${laneY(outputIndex)}, ${machineX} ${laneY(outputIndex)}`, class: 'wire dense-wire' }));
        }
      } else {
        const targetLane = Math.min(inputIndex, outputCount - 1);
        svg.append(svgElement('path', { d: `M ${startX} ${laneY(inputIndex)} L ${machineX} ${laneY(targetLane)}`, class: `wire vector-wire vector-wire-${vectorIndex}` }));
      }
    });
  });

  scalars.forEach((_, scalarIndex) => {
    const cx = scalarPositions[scalarIndex];
    const affectedOutputs = isReduction ? [0] : Array.from({ length: outputCount }, (_, index) => index);
    affectedOutputs.forEach((outputIndex) => {
      const targetY = isReduction ? centerY : laneY(outputIndex);
      svg.append(svgElement('path', { d: `M ${cx} 68 C ${cx + 30} 90, ${machineX - 65} ${targetY}, ${machineX} ${targetY}`, class: 'wire scalar-wire' }));
    });
  });

  if (matrix) {
    for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
      svg.append(svgElement('path', { d: `M 165 ${110 + outputIndex * 34} C 330 ${110 + outputIndex * 34}, 500 ${laneY(outputIndex)}, ${machineX} ${laneY(outputIndex)}`, class: 'wire matrix-wire' }));
    }
  }

  if (isReduction) {
    const outY = centerY;
    svg.append(svgElement('path', { d: `M ${machineX + machineWidth} ${outY} L ${outputX - 35} ${outY}`, class: 'wire output-wire' }));
    svg.append(svgElement('circle', { cx: outputX, cy: outY, r: 34, class: 'cargo output-cargo scalar-output' }));
    const value = Array.isArray(round.output) ? round.output[0] : round.output;
    addText(svg, outputX, outY + 5, revealOutput ? `s=${format(value)}` : 's=?');
  } else {
    for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
      const y = laneY(outputIndex);
      svg.append(svgElement('path', { d: `M ${machineX + machineWidth} ${y} L ${outputX - 20} ${y}`, class: 'wire output-wire' }));
      svg.append(svgElement('rect', { x: outputX - 20, y: y - 20, width: 155, height: 40, rx: 10, class: 'cargo output-cargo' }));
      const value = Array.isArray(round.output) ? round.output[outputIndex] : round.output;
      addText(svg, outputX + 57, y + 5, formatPlainMath(revealOutput ? `y_${outputIndex + 1}=${format(value)}` : `y_${outputIndex + 1}=?`));
    }
  }

  if (revealDependencies) svg.classList.add('dependencies-revealed');
  return svg;
}

export function diagramDescription(round) {
  const scalars = round.operands.filter((item) => item.semanticType === 'scalar');
  const vectors = round.operands.filter((item) => item.semanticType === 'column-vector');
  if (scalars.length && vectors.length && round.operation.family === 'broadcast') {
    return `${scalars.length === 1 ? 'One scalar' : 'Shared scalar parameters'} and vector ${vectors[0].name} enter the ${round.operationLabel} machine. Each scalar remains one input variable while its influence branches to every output lane. Matching vector inputs stay lane-aligned.`;
  }
  if (round.operation.family === 'elementwise') return `${vectors.length} vectors enter aligned lanes of the ${round.operationLabel} machine. Output lane i depends on matching input components at index i.`;
  if (round.operation.family === 'reduction') return `All vector lanes funnel through the ${round.operationLabel} machine into one scalar output.`;
  if (round.operation.family === 'matrix') return `The matrix mixer connects several input vector lanes to each output lane, showing dense feature mixing.`;
  if (round.operationType === 'per-feature-scale-shift') return `Three aligned vector trays represent x, gamma, and beta. Matching feature parameters act independently in each output lane.`;
  return `${round.operationLabel} factory diagram showing operand cargo, dependency wires, and output lanes.`;
}

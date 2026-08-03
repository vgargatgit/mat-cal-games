import { inlineMath } from '../math-renderer.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

export function createEvidenceBoard({ item, dependencies, selectedInput, selectedOutput, reveal = false, onSelectInput, onSelectOutput, onSetDependency }) {
  const board = document.createElement('section');
  board.className = 'evidence-board';
  board.setAttribute('aria-label', 'Dependency evidence board');
  board.innerHTML = `
    <svg class="wire-svg" aria-hidden="true"></svg>
    <div class="evidence-board-grid">
      <div class="node-column inputs"><h3>Input suspects</h3></div>
      <div class="intermediate-board"><h3 class="sr-only">Intermediate clues</h3></div>
      <div class="node-column outputs"><h3>Output cases</h3></div>
    </div>
    <p class="board-instructions">Select an input, then an output, to add or remove an evidence wire. Enter and Space work on every node.</p>
    <div class="selected-clue" aria-live="polite"></div>
    <div class="row explicit-wire-controls">
      <label class="form-field">Input<select data-role="wire-input">${item.inputs.map((input,index)=>`<option value="${index}">${escapeHtml(input.name)}</option>`).join('')}</select></label>
      <label class="form-field">Output<select data-role="wire-output">${item.outputs.map((output,index)=>`<option value="${index}">${escapeHtml(output.name)}</option>`).join('')}</select></label>
      <button class="btn small" data-action="add-wire">Add dependency</button>
      <button class="btn secondary small" data-action="remove-wire">Remove dependency</button>
    </div>`;

  const inputsColumn = board.querySelector('.inputs');
  item.inputs.forEach((input, index) => {
    const button = document.createElement('button');
    button.className = `evidence-node${selectedInput === index ? ' selected' : ''}`;
    button.dataset.inputIndex = String(index);
    button.setAttribute('aria-pressed', String(selectedInput === index));
    button.setAttribute('aria-label', `Select input ${input.name}`);
    button.innerHTML = `<span class="node-dot" aria-hidden="true"></span>${inlineMath(input.name)}`;
    button.addEventListener('click', () => onSelectInput(index));
    inputsColumn.append(button);
  });

  const intermediateBoard = board.querySelector('.intermediate-board');
  if (item.intermediates.length) {
    item.intermediates.forEach(node => {
      const clue = document.createElement('div');
      clue.className = 'intermediate-node';
      clue.dataset.intermediate = node.name;
      clue.innerHTML = `<strong>${inlineMath(node.name)}</strong><br>${inlineMath(`${node.name}=${node.expressionLatex}`)}`;
      intermediateBoard.append(clue);
    });
  } else {
    intermediateBoard.innerHTML += '<div class="intermediate-node">No named intermediate clues</div>';
  }

  const outputsColumn = board.querySelector('.outputs');
  item.outputs.forEach((output, index) => {
    const button = document.createElement('button');
    button.className = `evidence-node${selectedOutput === index ? ' selected' : ''}`;
    button.dataset.outputIndex = String(index);
    button.setAttribute('aria-pressed', String(selectedOutput === index));
    button.setAttribute('aria-label', `Select output ${output.name}: ${output.expressionLatex}`);
    button.innerHTML = `<span class="node-dot" aria-hidden="true"></span>${inlineMath(`${output.name}=${output.expressionLatex}`)}`;
    button.addEventListener('click', () => onSelectOutput(index));
    outputsColumn.append(button);
  });

  const clue = board.querySelector('.selected-clue');
  if (selectedInput !== null && selectedOutput !== null) {
    const key = `${selectedOutput}-${selectedInput}`;
    const connected = dependencies.includes(key);
    clue.innerHTML = `${inlineMath(item.inputs[selectedInput].name)} → ${inlineMath(item.outputs[selectedOutput].name)} is <strong>${connected ? 'on the evidence board' : 'not connected'}</strong>.`;
  } else {
    clue.textContent = 'Choose a suspect and an output case to investigate a possible path.';
  }

  board.querySelector('[data-action="add-wire"]').addEventListener('click', () => {
    const inputIndex = Number(board.querySelector('[data-role="wire-input"]').value);
    const outputIndex = Number(board.querySelector('[data-role="wire-output"]').value);
    onSetDependency(outputIndex, inputIndex, true);
  });
  board.querySelector('[data-action="remove-wire"]').addEventListener('click', () => {
    const inputIndex = Number(board.querySelector('[data-role="wire-input"]').value);
    const outputIndex = Number(board.querySelector('[data-role="wire-output"]').value);
    onSetDependency(outputIndex, inputIndex, false);
  });

  requestAnimationFrame(() => drawWires(board, item, dependencies, reveal));
  const resizeObserver = new ResizeObserver(() => drawWires(board, item, dependencies, reveal));
  resizeObserver.observe(board);
  board.addEventListener('DOMNodeRemoved', () => resizeObserver.disconnect(), { once:true });
  return board;
}

export function drawWires(board, item, dependencies, reveal = false) {
  const svg = board.querySelector('.wire-svg');
  if (!svg || !board.isConnected) return;
  svg.replaceChildren();
  const boardRect = board.getBoundingClientRect();
  dependencies.forEach(key => {
    const [outputIndex,inputIndex] = key.split('-').map(Number);
    const inputNode = board.querySelector(`[data-input-index="${inputIndex}"]`);
    const outputNode = board.querySelector(`[data-output-index="${outputIndex}"]`);
    if (!inputNode || !outputNode) return;
    const inputRect = inputNode.getBoundingClientRect();
    const outputRect = outputNode.getBoundingClientRect();
    const x1 = inputRect.right - boardRect.left;
    const y1 = inputRect.top + inputRect.height/2 - boardRect.top;
    const x2 = outputRect.left - boardRect.left;
    const y2 = outputRect.top + outputRect.height/2 - boardRect.top;
    const curve = Math.max(70,(x2-x1)*.42);
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',`M ${x1} ${y1} C ${x1+curve} ${y1}, ${x2-curve} ${y2}, ${x2} ${y2}`);
    const cell = item.dependencyCells[outputIndex]?.[inputIndex];
    const indirect = reveal && cell?.dependencyPaths.some(candidate => candidate.length > 2);
    const zeroReason = item.zeroReasons?.[key];
    path.setAttribute('class',`wire${indirect?' indirect':''}${zeroReason==='local-slope-zero'||zeroReason==='inactive-activation'?' local-zero':''}`);
    svg.append(path);
  });
}

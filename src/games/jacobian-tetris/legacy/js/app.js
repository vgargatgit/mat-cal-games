import { LEVELS, PIECES, getLevel } from './levels.js';
import { canonical, matricesEqual, structureMatches, validateMatrixMultiplication } from './math.js';
import { loadProgress, saveProgress, resetProgress } from './storage.js';

const $ = selector => document.querySelector(selector);
const main = $('#game-main');
const ui = {
  workOrder: $('#workOrder'), phaseStepper: $('#phaseStepper'), hintArea: $('#hintArea'), shapeBuilder: $('#shapeBuilder'),
  boardArea: $('#boardArea'), chainArea: $('#chainArea'), feedback: $('#feedback'), pieceQueue: $('#pieceQueue'), valueTray: $('#valueTray'),
  levelStatus: $('#levelStatus'), operationStatus: $('#operationStatus'), scoreStatus: $('#scoreStatus'), mistakeStatus: $('#mistakeStatus'),
  masteryBar: $('.mastery .meter i'), boardShapeBadge: $('#boardShapeBadge'), nextBtn: $('#nextBtn'), modal: $('#modal'), modalBody: $('#modalBody')
};

let progress = loadProgress();
let state = freshState(progress.currentLevel || 1);

function freshState(levelId, practice = false) {
  const level = getLevel(levelId);
  return {
    levelId: level.id, practice, phaseIndex: 0, rows: null, columns: null,
    dependencies: level.output.map(() => level.input.map(() => false)),
    selectedStructure: null,
    values: level.output.map(() => level.input.map(() => '')),
    selectedCell: null, selectedValue: null, chainOrder: [],
    mistakes: 0, hintsUsed: 0, history: [], completed: false, feedback: null
  };
}

function currentLevel() { return getLevel(state.levelId); }
function currentPhase() { return currentLevel().phases[state.phaseIndex]; }
function snapshot() {
  state.history.push(JSON.stringify({
    rows: state.rows, columns: state.columns, dependencies: state.dependencies, selectedStructure: state.selectedStructure,
    values: state.values, selectedCell: state.selectedCell, selectedValue: state.selectedValue, chainOrder: state.chainOrder,
    phaseIndex: state.phaseIndex, completed: state.completed
  }));
  if (state.history.length > 30) state.history.shift();
}
function restoreSnapshot(raw) { Object.assign(state, JSON.parse(raw)); }

function announce(message) { $('#live-region').textContent = message; }
function setFeedback(type, title, body) {
  state.feedback = { type, title, body };
  renderFeedback(); announce(`${title}. ${body}`);
}
function renderFeedback() {
  const f = state.feedback ?? { type: 'neutral', title: 'Assembly instructions', body: phaseInstruction(currentPhase()) };
  ui.feedback.className = `feedback ${f.type}`;
  ui.feedback.innerHTML = `<strong>${f.title}</strong><span>${f.body}</span>`;
}

function phaseInstruction(phase) {
  return ({
    shape: 'Set the board dimensions: output components create rows and input components create columns.',
    dependencies: 'This is not a typing step. Click every board cell where the row output depends on the column input, then check the phase.',
    structure: 'Derivative values are still locked. Choose the piece family that matches the confirmed dependency pattern, then check the phase.',
    values: 'Now type directly into every white Jacobian input. Structural-zero cells stay locked at 0.',
    chain: 'Arrange local Jacobians from the final output back toward the original input.'
  })[phase] ?? '';
}

function phaseStepTitle() {
  const level = currentLevel();
  return `Step ${state.phaseIndex + 1} of ${level.phases.length} · ${phaseLabel(currentPhase())}`;
}

function phaseCheckLabel() {
  const phase = currentPhase();
  if (phase === 'shape') {
    return state.rows && state.columns
      ? `Confirm ${state.rows} × ${state.columns} board and continue`
      : 'Check board shape';
  }
  return ({
    dependencies: 'Check dependencies and continue',
    structure: 'Check selected piece and continue',
    values: 'Check Jacobian values',
    chain: 'Check chain-rule order'
  })[phase] ?? 'Check current phase';
}

function boardPhaseGuide(phase) {
  const guides = {
    shape: ['Build the board first', 'Set the row and column counts above. Board cells are locked until the shape is checked.'],
    dependencies: ['Click cells — do not type yet', 'Each click answers “Does this output depend on this input?” Selected cells turn into YES dependencies.'],
    structure: ['Choose a derivative piece', 'The dependency map is locked. Select the matching piece in the Piece Queue; values unlock after this check.'],
    values: ['Type the Jacobian in the board', 'Every white cell is a real text input. Click or Tab into it, type the derivative, and use Enter to continue.'],
    chain: ['Connect the local Jacobians', 'Choose local maps in function-composition order so adjacent dimensions fit.']
  };
  const [title, body] = guides[phase] ?? ['', ''];
  return `<div class="phase-action board-phase-guide ${phase}"><strong>${title}</strong><span>${body}</span></div>`;
}

function render() {
  const level = currentLevel();
  document.body.classList.toggle('reduce-motion', progress.settings.reducedMotion);
  ui.levelStatus.textContent = `${level.id} / ${LEVELS.length}`;
  ui.operationStatus.textContent = level.operation;
  ui.scoreStatus.textContent = progress.score;
  ui.mistakeStatus.textContent = state.mistakes;
  const masteryAverage = Math.round(Object.values(progress.mastery).reduce((a,b)=>a+b,0) / Object.keys(progress.mastery).length);
  if (ui.masteryBar) ui.masteryBar.style.width = `${masteryAverage}%`;
  ui.boardShapeBadge.textContent = state.rows && state.columns ? `${state.rows} × ${state.columns}` : '? × ?';
  renderWorkOrder(); renderPhaseStepper(); renderShapeBuilder(); renderBoard(); renderChain(); renderPieces(); renderValueTray(); renderFeedback(); renderLevelDots();
  $('#checkBtn').textContent = phaseCheckLabel();
  $('#checkBtn').disabled = state.completed;
  ui.nextBtn.disabled = !state.completed;
}

function renderWorkOrder() {
  const level = currentLevel();
  ui.workOrder.innerHTML = `
    <p class="eyebrow">LEVEL ${level.id} · ${level.title.toUpperCase()}</p>
    <h3>${level.objective}</h3>
    <div class="object-card"><span>Input components</span><strong>${level.input.join(', ')}</strong><small>${level.input.length} component${level.input.length === 1 ? '' : 's'}</small></div>
    <div class="operation-card"><span>Operation</span><strong>${level.operation}</strong>${level.expressions.map((e,i)=>`<small>${level.output[i]} = ${e}</small>`).join('')}</div>
    <div class="object-card output"><span>Output components</span><strong>${level.output.join(', ')}</strong><small>${level.output.length} component${level.output.length === 1 ? '' : 's'}</small></div>
    <p class="learning-point"><strong>Learning target:</strong> ${level.learning}</p>`;
}

function renderPhaseStepper() {
  const level = currentLevel();
  ui.phaseStepper.innerHTML = level.phases.map((phase, i) => `
    <div class="phase-step ${i < state.phaseIndex ? 'done' : ''} ${i === state.phaseIndex ? 'active' : ''}">
      <span>${i < state.phaseIndex ? '✓' : i + 1}</span><strong>${phaseLabel(phase)}</strong>
    </div>`).join('');
}
function phaseLabel(phase) { return ({shape:'Board shape',dependencies:'Dependencies',structure:'Piece family',values:'Derivative values',chain:'Chain order'})[phase]; }

function renderShapeBuilder() {
  const phase = currentPhase();
  const editable = phase === 'shape';
  const level = currentLevel();
  const dimensions = editable
    ? `<div class="dimension-builder">
        <label>Output rows<input id="rowsInput" type="number" inputmode="numeric" min="1" max="5" placeholder="rows" value="${state.rows ?? ''}"></label>
        <span aria-hidden="true">×</span>
        <label>Input columns<input id="columnsInput" type="number" inputmode="numeric" min="1" max="5" placeholder="columns" value="${state.columns ?? ''}"></label>
      </div>
      <button id="useExpectedShapeBtn" class="shape-helper" type="button">Use component counts: ${level.output.length} × ${level.input.length}</button>`
    : `<div class="dimension-lock" aria-label="Board shape locked at ${state.rows} rows by ${state.columns} columns">
        <span>Board shape locked</span><strong>${state.rows} × ${state.columns}</strong>
      </div>`;

  ui.shapeBuilder.innerHTML = `
    <div class="axis-rule"><span class="row-rule">ROWS = OUTPUTS</span><span class="column-rule">COLUMNS = INPUTS</span></div>
    <p class="phase-action current-step"><strong>${phaseStepTitle()}</strong><span>${phaseInstruction(phase)}</span></p>
    ${dimensions}`;

  if (!editable) return;

  const commitDimension = (key, value) => {
    const parsed = Number(value);
    state[key] = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    ui.boardShapeBadge.textContent = state.rows && state.columns ? `${state.rows} × ${state.columns}` : '? × ?';
    renderBoard();
  };
  $('#rowsInput').addEventListener('change', e => { snapshot(); commitDimension('rows', e.target.value); });
  $('#columnsInput').addEventListener('change', e => { snapshot(); commitDimension('columns', e.target.value); });
  $('#useExpectedShapeBtn')?.addEventListener('click', () => {
    snapshot();
    state.rows = level.output.length;
    state.columns = level.input.length;
    render();
    ($('#boardCheckBtn') || $('#checkBtn')).focus();
  });
}

function renderBoard() {
  const level = currentLevel();
  if (!state.rows || !state.columns) {
    ui.boardArea.innerHTML = `<div class="empty-board"><div class="empty-machine">▦</div><strong>No board assembled yet</strong><span>Set rows and columns above.</span></div>`;
    return;
  }
  const rows = state.rows, columns = state.columns;
  const validDimensions = rows === level.output.length && columns === level.input.length;
  const colLabels = Array.from({length: columns}, (_, i) => level.input[i] ?? `x${i+1}`);
  const rowLabels = Array.from({length: rows}, (_, i) => level.output[i] ?? `y${i+1}`);
  let html = boardPhaseGuide(currentPhase());
  html += `<div class="matrix-scroll"><div class="column-caption">INPUT COMPONENTS → COLUMNS</div><div class="jacobian-grid ${validDimensions?'':'wrong-shape'}" style="--cols:${columns}">
    <div class="corner-cell">∂output / ∂input</div>${colLabels.map(x=>`<div class="column-label">${x}</div>`).join('')}`;
  for (let r=0;r<rows;r++) {
    html += `<div class="row-label"><span>${rowLabels[r]}</span></div>`;
    for (let c=0;c<columns;c++) html += renderCell(r,c);
  }
  html += `</div><div class="row-caption">↑ OUTPUT COMPONENTS = ROWS</div></div>`;
  if (!state.completed) html += `<button id="boardCheckBtn" class="btn btn-primary board-check" type="button">${phaseCheckLabel()}</button>`;
  ui.boardArea.innerHTML = html;
  $('#boardCheckBtn')?.addEventListener('click', validateCurrentPhase);
  ui.boardArea.querySelectorAll('.matrix-cell[data-row]').forEach(cell => cell.addEventListener('click', event => {
    if (event.target.matches('.cell-editor')) return;
    handleCell(Number(cell.dataset.row), Number(cell.dataset.column));
  }));
  ui.boardArea.querySelectorAll('.cell-editor').forEach(editor => {
    const r = Number(editor.dataset.row);
    const c = Number(editor.dataset.column);
    const selectEditor = () => {
      if (!state.selectedCell || state.selectedCell[0] !== r || state.selectedCell[1] !== c) snapshot();
      state.selectedCell = [r, c];
      ui.boardArea.querySelectorAll('.matrix-cell.selected').forEach(cell => cell.classList.remove('selected'));
      editor.closest('.matrix-cell')?.classList.add('selected');
    };
    editor.addEventListener('click', event => {
      event.stopPropagation();
      selectEditor();
    });
    editor.addEventListener('focus', selectEditor);
    editor.addEventListener('input', event => {
      state.values[r][c] = event.target.value;
      state.selectedValue = null;
      ui.valueTray.querySelectorAll('.value-token.selected').forEach(token => token.classList.remove('selected'));
    });
    editor.addEventListener('change', event => {
      const value = event.target.value.trim();
      state.values[r][c] = value;
      event.target.value = value;
    });
    editor.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = event.currentTarget.value.trim();
        state.values[r][c] = value;
        event.currentTarget.value = value;
        const next = findNextEditableCell(r, c);
        if (next) {
          const nextEditor = ui.boardArea.querySelector(`.cell-editor[data-row="${next[0]}"][data-column="${next[1]}"]`);
          nextEditor?.focus();
          nextEditor?.select();
        } else {
          ($('#boardCheckBtn') || $('#checkBtn')).focus();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.currentTarget.blur();
      }
    });
  });
}

function renderCell(r,c) {
  const phase = currentPhase();
  const level = currentLevel();
  const inExpectedRange = r < level.output.length && c < level.input.length;
  const dependency = state.dependencies[r]?.[c];
  const selected = state.selectedCell?.[0] === r && state.selectedCell?.[1] === c;
  let value = state.values[r]?.[c] ?? '';
  let className = 'matrix-cell';
  if (phase === 'dependencies') className += dependency ? ' dependency-on' : ' dependency-off';
  if (phase === 'structure' || phase === 'values' || phase === 'chain' || state.completed) {
    className += dependency ? ' possible-nonzero' : ' structural-zero';
    if (!dependency && inExpectedRange) value = '0';
  }
  if (selected) className += ' selected';
  const aria = `Row ${level.output[r] ?? r+1}, column ${level.input[c] ?? c+1}, ${dependency ? 'dependency selected' : 'no dependency'}${value ? `, value ${value}`:''}`;

  if (phase === 'values' && dependency && !state.completed) {
    return `<div class="${className.replace(' possible-nonzero', '')}" data-row="${r}" data-column="${c}" role="group" aria-label="${aria}">
      <input id="cell-${r}-${c}" class="cell-editor" data-row="${r}" data-column="${c}" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(value)}" aria-label="Derivative at row ${escapeHtml(level.output[r])}, column ${escapeHtml(level.input[c])}" placeholder="type">
    </div>`;
  }

  if (phase === 'dependencies') {
    const prompt = dependency
      ? '<span class="dependency-prompt yes"><strong>YES</strong><small>depends ✓</small></span>'
      : '<span class="dependency-prompt"><strong>CLICK</strong><small>depends?</small></span>';
    return `<button type="button" class="${className}" data-row="${r}" data-column="${c}" aria-pressed="${Boolean(dependency)}" aria-label="${aria}. Click to ${dependency ? 'remove' : 'mark'} dependency">${prompt}</button>`;
  }

  if (phase === 'shape') {
    return `<button type="button" class="${className} phase-locked" data-row="${r}" data-column="${c}" aria-label="${aria}. Locked until board shape is checked" disabled><span class="cell-prompt">LOCKED<small>shape first</small></span></button>`;
  }

  const cellContent = dependency && !value
    ? '<span class="cell-prompt dependency-ready">NONZERO?<small>piece first</small></span>'
    : `<span class="cell-icon">${!dependency && phase !== 'shape' ? '╳' : ''}</span><strong>${escapeHtml(value)}</strong>`;
  return `<button type="button" class="${className}" data-row="${r}" data-column="${c}" aria-label="${aria}" ${state.completed?'disabled':''}>${cellContent}</button>`;
}

function handleCell(r,c) {
  const phase = currentPhase();
  if (r >= currentLevel().output.length || c >= currentLevel().input.length) return;
  if (phase === 'dependencies') {
    snapshot();
    state.dependencies[r][c] = !state.dependencies[r][c];
    render();
    requestAnimationFrame(() => {
      ui.boardArea.querySelector(`.matrix-cell[data-row="${r}"][data-column="${c}"]`)?.focus();
    });
  } else if (phase === 'values') {
    if (!state.dependencies[r][c]) {
      setFeedback('neutral', 'Structural zero', 'This cell is fixed at 0 because the output does not depend on this input. Type only in the white input cells.');
      return;
    }
    state.selectedCell = [r,c];
    if (state.selectedValue !== null) {
      snapshot();
      placeSelectedValue();
      render();
      return;
    }
    const editor = ui.boardArea.querySelector(`.cell-editor[data-row="${r}"][data-column="${c}"]`);
    editor?.focus();
    editor?.select();
  }
}

function findNextEditableCell(row, column) {
  const level = currentLevel();
  const total = level.output.length * level.input.length;
  const start = row * level.input.length + column;
  for (let index = start + 1; index < total; index++) {
    const r = Math.floor(index / level.input.length);
    const c = index % level.input.length;
    if (state.dependencies[r][c]) return [r, c];
  }
  return null;
}

function renderPieces() {
  const level = currentLevel();
  const phase = currentPhase();
  if (phase !== 'structure') {
    const message = phase === 'values'
      ? `<p class="muted confirmed-piece"><strong>Piece confirmed:</strong> ${PIECES[level.structure].label}. Enter derivative values below.</p>`
      : phase === 'chain'
        ? '<p class="muted">Local-map controls are shown beside the board during the Chain Order step.</p>'
        : '<p class="muted"><strong>Not yet:</strong> Piece selection unlocks at Step 3, after the dependency map is checked.</p>';
    ui.pieceQueue.innerHTML = message;
    return;
  }
  const likely = [...new Set([level.structure, 'dense', 'row', 'column', 'diagonal', 'identity'])].slice(0,5);
  ui.pieceQueue.innerHTML = `<p class="muted piece-instruction"><strong>Step 3:</strong> select one piece below, then press <strong>Check current phase</strong>.</p>${likely.map(key => {
    const piece = PIECES[key];
    return `<button class="piece-card ${state.selectedStructure===key?'selected':''}" data-piece="${key}"><span>${piece.icon}</span><strong>${piece.label}</strong><small>${piece.description}</small></button>`;
  }).join('')}`;
  ui.pieceQueue.querySelectorAll('[data-piece]').forEach(btn => btn.addEventListener('click', () => { snapshot(); state.selectedStructure = btn.dataset.piece; render(); ($('#boardCheckBtn') || $('#checkBtn')).focus(); }));
}

function tokenValues(level) {
  const values = [...new Set(level.entries.flat())];
  return [...values, '0', '1'].filter((v,i,a)=>a.indexOf(v)===i);
}
function renderValueTray() {
  const phase = currentPhase();
  if (phase !== 'values') { ui.valueTray.innerHTML = ''; return; }
  const values = tokenValues(currentLevel());
  ui.valueTray.innerHTML = `<h3>Enter derivative values</h3><p class="muted"><strong>Keyboard entry:</strong> every white board cell is already an input field. Click or Tab into a field, type the derivative, and press Enter to move to the next field. Structural zeros stay locked at 0.<br><strong>Token entry:</strong> focus a field first, then choose a token below.</p><div class="token-grid">${values.map(v=>`<button type="button" class="value-token ${state.selectedValue===v?'selected':''}" data-value="${escapeHtml(v)}">${escapeHtml(v)}</button>`).join('')}</div>`;
  ui.valueTray.querySelectorAll('[data-value]').forEach(btn => btn.addEventListener('click', () => {
    snapshot();
    state.selectedValue = btn.dataset.value;
    if (state.selectedCell) {
      const [r, c] = state.selectedCell;
      state.values[r][c] = state.selectedValue;
      const editor = ui.boardArea.querySelector(`.cell-editor[data-row="${r}"][data-column="${c}"]`);
      if (editor) {
        editor.value = state.selectedValue;
        editor.focus();
        editor.select();
      }
      setFeedback('neutral', 'Derivative token placed', `${state.selectedValue} was placed in row ${currentLevel().output[r]}, column ${currentLevel().input[c]}.`);
    } else {
      setFeedback('neutral', 'Choose an input cell', 'Focus one of the white Jacobian input fields, then choose a derivative token.');
    }
    renderValueTray();
  }));
}
function placeSelectedValue() {
  const [r,c] = state.selectedCell;
  if (!state.dependencies[r][c] && canonical(state.selectedValue) !== '0') {
    setFeedback('warning','Structural zero locked','This output does not depend on that input, so only zero belongs here.');
    return;
  }
  state.values[r][c] = state.selectedValue;
  state.selectedCell = null;
}

function renderChain() {
  const level = currentLevel();
  if (currentPhase() !== 'chain') { ui.chainArea.innerHTML = ''; return; }
  const remaining = level.localJacobians.filter(item => !state.chainOrder.includes(item.name));
  const orderHtml = state.chainOrder.length ? state.chainOrder.map((name,i) => {
    const item = level.localJacobians.find(j=>j.name===name);
    return `<button class="chain-block placed" data-remove-chain="${name}"><strong>${name}</strong><span>${item.shape[0]} × ${item.shape[1]}</span><small>${i ? 'follows previous map' : 'starts at final output'}</small></button>${i < state.chainOrder.length-1 ? '<span class="chain-times">×</span>' : ''}`;
  }).join('') : '<div class="chain-placeholder">Place the first local map here</div>';
  ui.chainArea.innerHTML = `<div class="chain-workbench"><h3>Chain-rule connector</h3><div class="chain-order">${orderHtml}</div><div class="chain-palette">${remaining.map(item=>`<button class="chain-block" data-add-chain="${item.name}"><strong>${item.name}</strong><span>${item.shape[0]} × ${item.shape[1]}</span></button>`).join('')}</div><div class="shape-compatibility">${chainCompatibilityText()}</div></div>`;
  ui.chainArea.querySelectorAll('[data-add-chain]').forEach(btn=>btn.addEventListener('click',()=>{snapshot();state.chainOrder.push(btn.dataset.addChain);render();}));
  ui.chainArea.querySelectorAll('[data-remove-chain]').forEach(btn=>btn.addEventListener('click',()=>{snapshot();state.chainOrder=state.chainOrder.filter(n=>n!==btn.dataset.removeChain);render();}));
}
function chainCompatibilityText() {
  const level = currentLevel();
  if (state.chainOrder.length < 2) return 'Connect shapes so adjacent inner dimensions match.';
  const items = state.chainOrder.map(name=>level.localJacobians.find(j=>j.name===name));
  for (let i=0;i<items.length-1;i++) {
    if (!validateMatrixMultiplication(items[i].shape, items[i+1].shape)) return `<strong class="bad">Mismatch:</strong> ${items[i].shape[1]} ≠ ${items[i+1].shape[0]}`;
  }
  return `<strong class="good">Compatible:</strong> ${items.map(i=>`${i.shape[0]}×${i.shape[1]}`).join(' · ')}`;
}

function validateCurrentPhase() {
  const level = currentLevel();
  const phase = currentPhase();
  let ok = false, title = '', body = '';
  if (phase === 'shape') {
    ok = state.rows === level.output.length && state.columns === level.input.length;
    title = ok ? 'Board locked' : 'Board shape does not match the map';
    body = ok ? `${level.output.length} outputs create ${level.output.length} rows; ${level.input.length} inputs create ${level.input.length} columns.` : `You built ${state.rows ?? '?'} × ${state.columns ?? '?'}. This map needs ${level.output.length} × ${level.input.length}: rows are outputs, columns are inputs.`;
  } else if (phase === 'dependencies') {
    ok = structureMatches(state.dependencies, level.dependencies);
    title = ok ? 'Dependency map confirmed' : 'Some dependency arrows are misplaced';
    body = ok ? 'Every possible nonzero derivative cell is now marked.' : dependencyDiagnosis(level);
  } else if (phase === 'structure') {
    ok = state.selectedStructure === level.structure;
    title = ok ? 'Piece fits the dependency silhouette' : 'That piece makes a different mathematical claim';
    body = ok ? `${PIECES[level.structure].label} matches this map.` : structureDiagnosis(level);
  } else if (phase === 'values') {
    const candidate = state.values.map((row,r)=>row.map((v,c)=>state.dependencies[r][c] ? v : '0'));
    ok = matricesEqual(candidate, level.entries);
    title = ok ? 'Derivative values locked' : 'At least one derivative token is incorrect or missing';
    body = ok ? 'The symbolic entries agree with the operation.' : 'Re-read each row as one output expression and differentiate it with respect to each column input.';
  } else if (phase === 'chain') {
    ok = JSON.stringify(state.chainOrder) === JSON.stringify(level.correctOrder);
    title = ok ? 'Chain connected' : 'Chain order is reversed or incomplete';
    body = ok ? `The maps compose as ${level.correctOrder.join(' × ')}.` : `Start at the final output and move backward through the computation graph. Required order: ${level.correctOrder.join(' × ')}.`;
  }
  if (ok) completePhase(title, body); else registerMistake(title, body);
}

function dependencyDiagnosis(level) {
  const falsePositive = state.dependencies.some((row,r)=>row.some((v,c)=>v && !level.dependencies[r][c]));
  if (falsePositive) return 'A selected cell claims an output depends on an input that does not appear in its expression. Remove impossible dependencies.';
  return 'At least one real dependency is missing. Trace every input symbol appearing in each output expression.';
}
function structureDiagnosis(level) {
  const selected = state.selectedStructure ? PIECES[state.selectedStructure].label : 'No piece';
  const expected = PIECES[level.structure].label;
  if (level.structure === 'row') return `${selected} does not express one output spread across input columns. A scalar output needs one horizontal row.`;
  if (level.structure === 'column') return `${selected} does not express one scalar input reused by several outputs. One input means one column.`;
  if (level.structure === 'diagonal' || level.structure === 'identity') return `Matching output-input pairs occupy J[i,i], forming a diagonal pattern. Use ${expected}.`;
  return `${selected} does not match the confirmed dependency silhouette. Use ${expected}.`;
}

function completePhase(title, body) {
  const level = currentLevel();
  if (state.phaseIndex < level.phases.length - 1) {
    const completedPhase = level.phases[state.phaseIndex];
    state.phaseIndex++;
    state.selectedCell = null;
    state.selectedValue = null;
    progress.score += phasePoints(completedPhase);
    state.feedback = {
      type: 'success',
      title,
      body: `${body} Next: ${phaseInstruction(currentPhase())}`
    };
    render();
    announce(`${title}. ${state.feedback.body}`);
    focusCurrentPhaseControl();
  } else {
    state.completed = true;
    if (!progress.completed.includes(level.id) && !state.practice) progress.completed.push(level.id);
    progress.score += Math.max(0, 20 - state.hintsUsed * 3);
    progress.mastery[level.mastery] = Math.min(100, progress.mastery[level.mastery] + 20);
    progress.currentLevel = Math.min(LEVELS.length, Math.max(progress.currentLevel, level.id + 1));
    saveProgress(progress);
    state.feedback = { type: 'success', title: 'Work order certified', body: `${level.learning} Continue when ready.` };
    render();
    announce(`${state.feedback.title}. ${state.feedback.body}`);
  }
}

function focusCurrentPhaseControl() {
  const phase = currentPhase();
  if (phase === 'dependencies') {
    ui.boardArea.querySelector('.matrix-cell[data-row]:not([disabled])')?.focus();
  } else if (phase === 'structure') {
    ui.pieceQueue.querySelector('[data-piece]')?.focus();
  } else if (phase === 'values') {
    const editor = ui.boardArea.querySelector('.cell-editor');
    editor?.focus();
    editor?.select();
  } else if (phase === 'chain') {
    ui.chainArea.querySelector('[data-add-chain]')?.focus();
  }
}
function phasePoints(phase) { return ({shape:10,dependencies:10,structure:15,values:20,chain:15})[phase] ?? 10; }
function registerMistake(title, body) { state.mistakes++; setFeedback('error',title,body); render(); }

function showHint() {
  const level = currentLevel();
  const index = Math.min(state.hintsUsed, level.hints.length-1);
  state.hintsUsed++;
  ui.hintArea.innerHTML += `<div class="hint-card"><span>Hint ${state.hintsUsed}</span><p>${level.hints[index]}</p></div>`;
  announce(level.hints[index]);
}

function clearCurrentPhase() {
  snapshot();
  const phase = currentPhase();
  if (phase === 'shape') { state.rows = null; state.columns = null; }
  if (phase === 'dependencies') state.dependencies = currentLevel().output.map(()=>currentLevel().input.map(()=>false));
  if (phase === 'structure') state.selectedStructure = null;
  if (phase === 'values') state.values = currentLevel().output.map(()=>currentLevel().input.map(()=>''));
  if (phase === 'chain') state.chainOrder = [];
  state.feedback = null;
  render();
  focusCurrentPhaseControl();
}

function showSolution() {
  const level = currentLevel();
  ui.modalBody.innerHTML = `<p class="eyebrow">SOLUTION · LEVEL ${level.id}</p><h2>${level.title}</h2><p>${level.learning}</p>${matrixHtml(level.entries, level.output, level.input)}${level.correctOrder?`<h3>Chain order</h3><p class="formula">${level.correctOrder.join(' × ')}</p>`:''}`;
  ui.modal.showModal();
}
function matrixHtml(entries, rows, cols) {
  return `<div class="solution-matrix"><div></div>${cols.map(c=>`<strong>${c}</strong>`).join('')}${entries.map((row,r)=>`<strong>${rows[r]}</strong>${row.map(v=>`<span>${escapeHtml(v)}</span>`).join('')}`).join('')}</div>`;
}

function openHelp() {
  ui.modalBody.innerHTML = `<p class="eyebrow">JACOBIAN ASSEMBLY MANUAL</p><h2>Rows are outputs. Columns are inputs.</h2>
    <div class="help-grid"><section><h3>Cell meaning</h3><p>Cell (i,j) stores ∂yᵢ/∂xⱼ.</p></section><section><h3>Structural zero</h3><p>A cross-hatched cell means the output does not depend on that input.</p></section><section><h3>Forward map</h3><p>dy ≈ J dx</p></section><section><h3>Backward column gradients</h3><p>∇ₓL = Jᵀ∇ᵧL</p></section></div>`;
  ui.modal.showModal();
}

function runTests() {
  const tests = [];
  const test = (name, fn) => { try { const result = fn(); tests.push({name,ok:Boolean(result)}); } catch(e) { tests.push({name,ok:false,error:e.message}); } };
  test('R³ → R² gives 2 × 3', ()=>getLevel(4).output.length===2 && getLevel(4).input.length===3);
  test('Identity level is I₃', ()=>matricesEqual(getLevel(2).entries,[['1','0','0'],['0','1','0'],['0','0','1']]));
  test('Diagonal square derivatives', ()=>matricesEqual(getLevel(3).entries,[['2x₁','0','0'],['0','2x₂','0'],['0','0','2x₃']]));
  test('Reduction is 1 × 3', ()=>getLevel(5).entries.length===1 && getLevel(5).entries[0].length===3);
  test('Broadcast is 3 × 1', ()=>getLevel(6).entries.length===3 && getLevel(6).entries[0].length===1);
  test('Selection matrix', ()=>matricesEqual(getLevel(8).entries,[['0','0','1'],['1','0','0']]));
  test('(4×3)(3×2) accepted', ()=>validateMatrixMultiplication([4,3],[3,2]));
  test('(3×2)(4×3) rejected', ()=>!validateMatrixMultiplication([3,2],[4,3]));
  test('Chain order stored correctly', ()=>JSON.stringify(getLevel(10).correctOrder)===JSON.stringify(['∂y/∂u','∂u/∂x']));
  test('Backprop uses transpose gate', ()=>getLevel(11).correctOrder[0]==='Jᵀ');
  const passed = tests.filter(t=>t.ok).length;
  ui.modalBody.innerHTML = `<p class="eyebrow">DEVELOPER TEST PANEL</p><h2>${passed} / ${tests.length} tests passed</h2><div class="test-list">${tests.map(t=>`<div class="test ${t.ok?'pass':'fail'}"><span>${t.ok?'✓':'✕'}</span><strong>${t.name}</strong>${t.error?`<small>${t.error}</small>`:''}</div>`).join('')}</div>`;
  ui.modal.showModal();
}

function startLevel(id, practice=false) {
  state = freshState(Number(id), practice); progress.currentLevel = Number(id); saveProgress(progress); ui.hintArea.innerHTML=''; render();
  window.scrollTo({top:0,behavior:progress.settings.reducedMotion?'auto':'smooth'});
}
function nextLevel() { startLevel(Math.min(LEVELS.length, state.levelId + 1)); }
function previousLevel() { startLevel(Math.max(1, state.levelId - 1)); }
function startPractice() {
  const seed = Number(prompt('Puzzle seed (1–9999)', progress.practiceSeed) ?? progress.practiceSeed);
  progress.practiceSeed = Number.isFinite(seed) ? seed : 4821;
  saveProgress(progress);
  const templates = [2,3,4,5,6,7,8,9,10];
  startLevel(templates[progress.practiceSeed % templates.length], true);
  setFeedback('neutral','Seeded practice',`Puzzle code JT-${String(progress.practiceSeed).padStart(4,'0')}. The same seed selects the same template.`);
}

function renderLevelDots() {
  $('#levelDots').innerHTML = LEVELS.map(level=>`<button class="level-dot ${level.id===state.levelId?'current':''} ${progress.completed.includes(level.id)?'complete':''}" data-level="${level.id}" aria-label="Open level ${level.id}: ${level.title}">${level.id}</button>`).join('');
  document.querySelectorAll('[data-level]').forEach(btn=>btn.addEventListener('click',()=>startLevel(btn.dataset.level)));
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

$('#checkBtn').addEventListener('click', validateCurrentPhase);
$('#hintBtn').addEventListener('click', showHint);
$('#undoBtn').addEventListener('click', ()=>{ const raw=state.history.pop(); if(raw){restoreSnapshot(raw);state.feedback=null;render();} });
$('#clearBtn').addEventListener('click', clearCurrentPhase);
$('#solutionBtn').addEventListener('click', showSolution);
$('#nextBtn').addEventListener('click', nextLevel);
$('#nextLevelBtn').addEventListener('click', nextLevel);
$('#prevLevelBtn').addEventListener('click', previousLevel);
$('#practiceBtn').addEventListener('click', startPractice);
$('#testsBtn').addEventListener('click', runTests);
$('#helpBtn').addEventListener('click', openHelp);
$('#motionBtn').addEventListener('click', e=>{progress.settings.reducedMotion=!progress.settings.reducedMotion;e.currentTarget.setAttribute('aria-pressed',progress.settings.reducedMotion);saveProgress(progress);render();});
$('#soundBtn').addEventListener('click', e=>{progress.settings.sound=!progress.settings.sound;e.currentTarget.setAttribute('aria-pressed',progress.settings.sound);saveProgress(progress);render();});
$('#resetBtn').addEventListener('click', ()=>{if(confirm('Reset this level?')) startLevel(state.levelId,state.practice);});
$('#resetProgressBtn')?.addEventListener('click', ()=>{if(confirm('Reset all Jacobian Tetris progress?')){progress=resetProgress();startLevel(1);}});

document.addEventListener('keydown', e=>{
  if (e.target.matches('input,button,select,textarea')) return;
  if (e.key.toLowerCase()==='u') { const raw=state.history.pop(); if(raw){restoreSnapshot(raw);render();} }
  if (e.key==='Enter') validateCurrentPhase();
  if (e.key===' ' && currentPhase()==='dependencies' && state.selectedCell) handleCell(...state.selectedCell);
});

if (new URLSearchParams(location.search).get('debug') === 'true') {
  const debug = document.createElement('details'); debug.className='debug-panel'; debug.open=true;
  debug.innerHTML='<summary>Debug state</summary><pre id="debugState"></pre>'; document.body.append(debug);
  setInterval(()=>{ const el=$('#debugState'); if(el) el.textContent=JSON.stringify({state,expected:currentLevel()},null,2); },500);
}

render();

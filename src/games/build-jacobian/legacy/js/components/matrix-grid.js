import { h } from './dom.js';
import { equation } from './equation.js';
import { isZeroExpression } from '../math/jacobian.js';
import { toLatex, toPlain } from '../math/ast.js';

export function renderMatrixGrid({ round, engine, onCellSelect, onDrop, locateMode = false, readOnly = false, expected = false }) {
  const rows = round.expectedShape.rows;
  const columns = round.expectedShape.columns;
  const grid = h('div', {
    className: 'jacobian-grid',
    role: 'grid',
    'aria-label': `${rows} by ${columns} Jacobian. Rows are outputs; columns are inputs.`,
    style: { gridTemplateColumns: `minmax(120px, auto) repeat(${columns}, minmax(88px, 1fr))` },
  });
  grid.append(h('div', { className: 'grid-corner', text: 'outputs ↓ / inputs →' }));
  round.inputs.forEach((input, column) => {
    grid.append(h('div', { className: 'grid-label', role: 'columnheader', 'aria-label': `Column ${column + 1}, input ${input}` }, [
      h('span', { className: 'knob-icon', 'aria-hidden': 'true', text: '↻' }),
      equation(input.replace('_', '_{') + (input.includes('_') ? '}' : ''), { label: input }),
    ]));
  });

  for (let row = 0; row < rows; row += 1) {
    const output = round.outputs[row];
    grid.append(h('div', { className: 'grid-label output', role: 'rowheader', 'aria-label': `Row ${row + 1}, output ${output.name}` }, [
      h('span', { className: 'gauge-icon', 'aria-hidden': 'true', text: '◴' }),
      h('span', { text: output.name }),
    ]));
    for (let column = 0; column < columns; column += 1) {
      const active = engine.activeCells().some(cell => cell.row === row && cell.column === column);
      const selected = engine.state.selectedCell?.row === row && engine.state.selectedCell?.column === column;
      const submitted = expected ? round.expectedJacobian[row][column] : engine.state.submissions[row][column];
      const status = expected ? 'correct' : engine.state.cellStatus[row][column];
      const structuralZero = !round.dependencyMatrix[row][column];
      const evaluatedZero = Boolean(round.point && round.dependencyMatrix[row][column] && isZeroExpression(round.expectedJacobian[row][column]));
      const classNames = ['jacobian-cell', selected ? 'selected' : '', status || '', structuralZero ? 'structural-zero' : '', evaluatedZero ? 'evaluated-zero' : ''].filter(Boolean).join(' ');
      const currentText = submitted ? toLatex(submitted) : locateMode ? `J_{${row + 1}${column + 1}}` : '?';
      const ariaCurrent = submitted ? `contains ${toPlain(submitted)}` : 'currently empty';
      const cell = h('button', {
        type: 'button', className: classNames, role: 'gridcell',
        disabled: readOnly || !active,
        'aria-selected': selected ? 'true' : 'false',
        'aria-label': `Row ${row + 1}, output ${output.name}. Column ${column + 1}, input ${round.inputs[column]}. ${ariaCurrent}.`,
        onClick: () => onCellSelect?.(row, column),
        onDragover: event => { if (!readOnly && active) event.preventDefault(); },
        onDrop: event => {
          if (readOnly || !active) return;
          event.preventDefault();
          onDrop?.(event.dataTransfer.getData('text/plain'), row, column);
        },
      }, equation(currentText, { label: submitted ? toPlain(submitted) : `J ${row + 1} ${column + 1}` }));
      grid.append(cell);
    }
  }
  return h('div', { className: 'grid-wrap' }, grid);
}

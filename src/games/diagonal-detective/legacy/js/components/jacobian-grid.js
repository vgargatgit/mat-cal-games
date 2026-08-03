import { inlineMath } from '../math-renderer.js';

const MARKS = ['unknown','possible','structural-zero','evaluated-zero'];
const DISPLAY = { unknown:'?', possible:'●', 'structural-zero':'0', 'evaluated-zero':'0*' };

export function createJacobianGrid({ item, grid, reveal = false, onMark }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'jacobian-wrap';
  const table = document.createElement('table');
  table.className = 'jacobian-grid';
  table.setAttribute('aria-label', `${item.expectedShape.rows} by ${item.expectedShape.columns} structural Jacobian grid. Output rows and input columns.`);
  const head = document.createElement('thead');
  head.innerHTML = `<tr><th scope="col">Outputs ↓ / Inputs →</th>${item.inputs.map(input=>`<th scope="col">${inlineMath(input.name)}</th>`).join('')}</tr>`;
  table.append(head);
  const body = document.createElement('tbody');
  item.outputs.forEach((output,row) => {
    const tr = document.createElement('tr');
    const rowHeader = document.createElement('th');
    rowHeader.scope = 'row';
    rowHeader.innerHTML = inlineMath(output.name);
    tr.append(rowHeader);
    item.inputs.forEach((input,column) => {
      const key = `${row}-${column}`;
      const current = reveal ? (item.dependencyMatrix[row][column] ? ((item.zeroReasons?.[key]==='local-slope-zero'||item.zeroReasons?.[key]==='inactive-activation') ? 'evaluated-zero' : 'possible') : 'structural-zero') : (grid[key] ?? 'unknown');
      const td = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mark = current;
      button.dataset.cellKey = key;
      button.textContent = DISPLAY[current];
      const meaning = current === 'possible' ? 'possible nonzero' : current === 'structural-zero' ? 'structurally zero' : current === 'evaluated-zero' ? 'dependency exists but evaluated value is zero' : 'unknown';
      button.setAttribute('aria-label', `Row ${row+1}, output ${output.name}. Column ${column+1}, input ${input.name}. Marked ${meaning}.`);
      button.addEventListener('click', () => {
        const allowed = item.evaluationPoint ? MARKS : MARKS.slice(0,3);
        const next = allowed[(allowed.indexOf(current)+1)%allowed.length];
        onMark(key,next);
      });
      td.append(button); tr.append(td);
    });
    body.append(tr);
  });
  table.append(body); wrapper.append(table);
  const caption = document.createElement('p');
  caption.className = 'matrix-caption';
  caption.textContent = 'Rows are outputs. Columns are inputs. Click a cell to cycle its evidence marker.';
  wrapper.append(caption);
  return wrapper;
}

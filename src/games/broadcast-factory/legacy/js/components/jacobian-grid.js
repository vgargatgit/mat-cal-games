export function createNumericGrid(rows, columns, { values = null, readonly = false, name = 'jacobian' } = {}) {
  const grid = document.createElement('div');
  grid.className = 'jacobian-grid';
  grid.style.setProperty('--columns', String(columns));
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', `${rows} by ${columns} derivative grid`);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.inputMode = 'decimal';
      input.dataset.row = String(row);
      input.dataset.column = String(column);
      input.name = `${name}-${row}-${column}`;
      input.setAttribute('aria-label', `row ${row + 1}, column ${column + 1}`);
      if (values) input.value = String(values[row][column]);
      if (readonly) input.readOnly = true;
      grid.append(input);
    }
  }
  return grid;
}

export function readNumericGrid(grid, rows, columns) {
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    const input = grid.querySelector(`[data-row="${row}"][data-column="${column}"]`);
    return input?.value === '' ? Number.NaN : Number(input.value);
  }));
}

export function createDependencyGrid(matrix, { interactive = true, initial = null } = {}) {
  const rows = matrix.length;
  const columns = matrix[0].length;
  const grid = document.createElement('div');
  grid.className = 'dependency-grid';
  grid.style.setProperty('--columns', String(columns));
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', `${rows} output by ${columns} input dependency grid`);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dependency-cell';
      button.dataset.row = String(row);
      button.dataset.column = String(column);
      const startingActive = interactive ? Boolean(initial?.[row]?.[column]) : Boolean(matrix[row][column]);
      button.dataset.active = String(startingActive);
      button.textContent = startingActive ? '●' : '○';
      button.setAttribute('aria-pressed', String(startingActive));
      button.setAttribute('aria-label', `Output ${row + 1} ${matrix[row][column] ? 'depends' : 'does not depend'} on input ${column + 1}`);
      if (interactive) button.addEventListener('click', () => {
        const active = button.dataset.active !== 'true';
        button.dataset.active = String(active);
        button.setAttribute('aria-pressed', String(active));
        button.textContent = active ? '●' : '○';
      });
      else button.disabled = true;
      grid.append(button);
    }
  }
  return grid;
}

export function readDependencyGrid(grid, rows, columns) {
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => grid.querySelector(`[data-row="${row}"][data-column="${column}"]`)?.dataset.active === 'true'));
}

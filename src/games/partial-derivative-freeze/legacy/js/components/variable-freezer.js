import { el, button } from './dom.js';
import { latexIdentifier } from '../math/expression-model.js';
import { mathText } from '../math-renderer.js';

export function createVariableFreezer(round, initialValue = null) {
  const wrapper = el('section', { className: 'lab-card protocol-card', 'aria-labelledby': 'freezer-title' });
  wrapper.append(el('h2', { id: 'freezer-title', text: '2. Activate one variable and freeze independent inputs' }));
  const selected = new Map();
  const zones = el('div', { className: 'freezer-zones' });
  const activeZone = makeZone('active', 'ACTIVE', 'Allowed to change', '↔');
  const frozenZone = makeZone('frozen', 'FROZEN', 'Held constant for this derivative', '❄');
  const fixedZone = makeZone('fixed', 'ALWAYS FIXED', 'Numerical constants', '⬛');
  const dependentZone = makeZone('dependent', 'DEPENDENT', 'Changes through a declared wire', '🔗');
  zones.append(activeZone, frozenZone, fixedZone, dependentZone);

  const shelf = el('div', { className: 'variable-shelf', role: 'list', 'aria-label': 'Variable shelf' });
  round.variables.forEach((spec) => {
    const item = el('div', { className: 'variable-control', role: 'listitem', dataset: { name: spec.name } });
    const chip = el('button', { type: 'button', className: 'variable-chip', draggable: spec.role !== 'dependent' ? 'true' : 'false', 'aria-pressed': 'false', text: spec.name });
    chip.dataset.name = spec.name;
    chip.addEventListener('dragstart', (event) => event.dataTransfer?.setData('text/plain', spec.name));
    const label = el('span', { className: 'math chip-math', text: mathText(latexIdentifier(spec.name)) });
    chip.textContent = '';
    chip.append(label);
    const controls = el('div', { className: 'chip-actions' });
    if (spec.role === 'dependent') {
      selected.set(spec.name, 'dependent');
      controls.append(el('span', { className: 'status-tag dependent', text: 'Dependency declared' }));
      dependentZone.querySelector('.zone-content').append(chip);
    } else {
      controls.append(
        button('Mark active', () => place(spec.name, 'active'), { className: 'mini-button' }),
        button('Freeze', () => place(spec.name, 'frozen'), { className: 'mini-button' })
      );
      item.append(chip, controls);
      shelf.append(item);
    }
  });

  collectConstants(round.expression).forEach((value) => {
    const block = el('span', { className: 'constant-block', text: String(value), title: 'Always constant' });
    fixedZone.querySelector('.zone-content').append(block);
  });

  [activeZone, frozenZone].forEach((zone) => {
    zone.addEventListener('dragover', (event) => event.preventDefault());
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      const name = event.dataTransfer?.getData('text/plain');
      if (name) place(name, zone.dataset.zone);
    });
  });

  function place(name, role) {
    if (role === 'active') {
      for (const [otherName, otherRole] of selected.entries()) {
        if (otherRole !== 'active' || otherName === name) continue;
        selected.delete(otherName);
        const previousChip = wrapper.querySelector(`.variable-chip[data-name="${CSS.escape(otherName)}"]`);
        const previousControl = wrapper.querySelector(`.variable-control[data-name="${CSS.escape(otherName)}"]`);
        if (previousChip && previousControl) previousControl.prepend(previousChip);
        previousChip?.classList.remove('is-active');
        previousChip?.removeAttribute('data-role');
      }
    }
    selected.set(name, role);
    const chip = wrapper.querySelector(`.variable-chip[data-name="${CSS.escape(name)}"]`);
    const target = role === 'active' ? activeZone : frozenZone;
    target.querySelector('.zone-content').append(chip);
    chip.dataset.role = role;
    chip.classList.toggle('is-active', role === 'active');
    chip.classList.toggle('is-frozen', role === 'frozen');
    chip.setAttribute('aria-label', `${name}: ${role === 'active' ? 'allowed to change' : 'held constant'}`);
  }

  wrapper.append(shelf, zones, el('p', { className: 'microcopy', text: 'Drag a symbol into a zone, or use its explicit buttons. A declared dependent variable cannot be frozen as independent.' }));
  if (initialValue?.activeVariable) place(initialValue.activeVariable, 'active');
  (initialValue?.frozenVariables || []).forEach((name) => place(name, 'frozen'));
  return {
    element: wrapper,
    getValue: () => ({
      activeVariable: [...selected.entries()].find(([, role]) => role === 'active')?.[0] || null,
      frozenVariables: [...selected.entries()].filter(([, role]) => role === 'frozen').map(([name]) => name)
    })
  };
}

function makeZone(zone, title, subtitle, icon) {
  const node = el('div', { className: `freezer-zone zone-${zone}`, dataset: { zone }, role: 'group', 'aria-label': `${title}: ${subtitle}` });
  node.append(el('div', { className: 'zone-heading' }, [el('span', { className: 'zone-icon', text: icon, 'aria-hidden': 'true' }), el('span', {}, [el('strong', { text: title }), el('small', { text: subtitle })])]));
  node.append(el('div', { className: 'zone-content' }));
  return node;
}

function collectConstants(expression, result = new Set()) {
  if (!expression) return result;
  if (expression.type === 'constant') result.add(expression.value);
  if (expression.type === 'sum') expression.terms.forEach((term) => collectConstants(term, result));
  if (expression.type === 'product') expression.factors.forEach((factor) => collectConstants(factor, result));
  if (expression.type === 'power') collectConstants(expression.base, result);
  if (expression.type === 'function') collectConstants(expression.argument, result);
  return result;
}

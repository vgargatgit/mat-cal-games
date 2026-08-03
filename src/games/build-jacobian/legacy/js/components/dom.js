export function h(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'className') element.className = value;
    else if (key === 'text') element.textContent = String(value);
    else if (key === 'htmlFor') element.htmlFor = value;
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in element && !key.startsWith('aria-') && key !== 'role') element[key] = value;
    else element.setAttribute(key, value === true ? '' : String(value));
  }
  append(element, children);
  return element;
}

export function append(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function button(label, options = {}) {
  return h('button', { type: 'button', className: `btn${options.primary ? ' primary' : ''}${options.small ? ' small' : ''}${options.className ? ` ${options.className}` : ''}`, ...options, text: label });
}

export function field(labelText, control, hint = null) {
  const id = control.id || `field-${Math.random().toString(36).slice(2)}`;
  control.id = id;
  const children = [h('label', { htmlFor: id, text: labelText }), control];
  if (hint) children.push(h('small', { className: 'muted', text: hint }));
  return h('div', { className: 'field' }, children);
}

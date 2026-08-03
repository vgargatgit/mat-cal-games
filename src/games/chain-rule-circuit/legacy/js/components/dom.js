const BOOLEAN_ATTRIBUTES = new Set(['disabled', 'checked', 'selected', 'required', 'multiple', 'hidden', 'readonly', 'autofocus']);

export function el(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'className') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (BOOLEAN_ATTRIBUTES.has(key) && typeof value === 'boolean') { if (value) element.setAttribute(key, ''); }
    else if (key === 'dataset') Object.entries(value).forEach(([name, item]) => { element.dataset[name] = item; });
    else element.setAttribute(key, String(value));
  });
  children.flat(Infinity).forEach(child => {
    if (child === null || child === undefined) return;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return element;
}

export function clear(element) { element.replaceChildren(); return element; }

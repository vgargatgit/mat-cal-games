export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.entries(value).forEach(([dataKey, dataValue]) => { node.dataset[dataKey] = String(dataValue); });
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, String(value));
  });
  const list = Array.isArray(children) ? children : [children];
  list.filter((child) => child !== null && child !== undefined).forEach((child) => node.append(child instanceof Node ? child : document.createTextNode(String(child))));
  return node;
}

export function button(label, onClick, options = {}) {
  return el('button', { type: 'button', className: options.className || 'button', onClick, ...options.attributes }, label);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

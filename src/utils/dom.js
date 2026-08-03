export function el(tag, options = {}, ...children) {
  const svgTags = new Set(['svg', 'defs', 'radialGradient', 'stop', 'rect', 'ellipse', 'polyline', 'line', 'marker', 'path', 'g', 'circle']);
  const isSvg = svgTags.has(tag);
  const node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'className') isSvg ? node.setAttribute('class', value) : node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value === true ? '' : value);
  });
  node.append(...children.filter((child) => child !== null && child !== undefined).map((child) => child instanceof Node ? child : document.createTextNode(String(child))));
  return node;
}

export function clear(node) { node.replaceChildren(); return node; }

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

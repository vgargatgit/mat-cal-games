let scheduled = false;

const SUBSCRIPT = Object.freeze({
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  i: 'ᵢ', j: 'ⱼ', n: 'ₙ', m: 'ₘ', k: 'ₖ', x: 'ₓ',
});

const SUPERSCRIPT = Object.freeze({
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  n: 'ⁿ', m: 'ᵐ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', x: 'ˣ',
});

function mapScript(value, table, fallbackPrefix) {
  const converted = [...value].map((character) => table[character] || '').join('');
  return converted.length === value.length ? converted : `${fallbackPrefix}(${value})`;
}

function readBracedGroup(source, startIndex) {
  let index = startIndex;
  while (/\s/.test(source[index] || '')) index += 1;
  if (source[index] !== '{') return null;
  let depth = 0;
  for (let cursor = index; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1;
    else if (source[cursor] === '}') {
      depth -= 1;
      if (depth === 0) return { value: source.slice(index + 1, cursor), end: cursor + 1 };
    }
  }
  return null;
}

function replaceFractions(source) {
  let output = '';
  let cursor = 0;
  while (cursor < source.length) {
    const fractionIndex = source.indexOf('\\frac', cursor);
    if (fractionIndex < 0) {
      output += source.slice(cursor);
      break;
    }
    output += source.slice(cursor, fractionIndex);
    const numerator = readBracedGroup(source, fractionIndex + 5);
    const denominator = numerator ? readBracedGroup(source, numerator.end) : null;
    if (!numerator || !denominator) {
      output += '\\frac';
      cursor = fractionIndex + 5;
      continue;
    }
    output += `(${replaceFractions(numerator.value)})/(${replaceFractions(denominator.value)})`;
    cursor = denominator.end;
  }
  return output;
}

/**
 * Convert the game's small, controlled LaTeX vocabulary to readable Unicode.
 * This is a display fallback, not a general-purpose LaTeX parser.
 */
export function latexToReadableText(latex) {
  let text = String(latex ?? '').trim();
  text = text.replace(/^\\\[|\\\]$/g, '').replace(/^\\\(|\\\)$/g, '');
  text = text
    .replace(/\\begin\{bmatrix\}/g, '[')
    .replace(/\\end\{bmatrix\}/g, ']')
    .replace(/\\\\/g, '; ')
    .replace(/&/g, '  ');
  text = replaceFractions(text);
  text = text
    .replace(/\\operatorname\{ReLU\}/g, 'ReLU')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/\\mathbf\{([^{}]+)\}/g, '$1')
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\partial/g, '∂')
    .replace(/\\Longrightarrow/g, '⇒')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\qquad|\\quad|\\,/g, ' ')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\exp/g, 'exp')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\in/g, '∈');
  text = text
    .replace(/_\{([^{}]+)\}/g, (_, value) => mapScript(value, SUBSCRIPT, '_'))
    .replace(/_([0-9a-zA-Z])/g, (_, value) => mapScript(value, SUBSCRIPT, '_'))
    .replace(/\^\{([^{}]+)\}/g, (_, value) => mapScript(value, SUPERSCRIPT, '^'))
    .replace(/\^([0-9a-zA-Z])/g, (_, value) => mapScript(value, SUPERSCRIPT, '^'));
  text = text
    .replace(/[{}]/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function prepareMathJaxNodes(root) {
  const nodes = [];
  const candidates = [];
  if (root instanceof Element && root.matches('.math-line[data-latex]')) candidates.push(root);
  if (root?.querySelectorAll) candidates.push(...root.querySelectorAll('.math-line[data-latex]'));
  for (const element of candidates) {
    if (element.dataset.mathRendered === 'true') continue;
    const display = element.dataset.display === 'true';
    element.textContent = mathText(element.dataset.latex, display);
    element.dataset.mathRendered = 'pending';
    nodes.push(element);
  }
  return nodes;
}

export function renderMath(root = document.body) {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(async () => {
    scheduled = false;
    if (!window.MathJax?.typesetPromise) return;
    const nodes = prepareMathJaxNodes(root);
    if (nodes.length === 0) return;
    try {
      await window.MathJax.typesetPromise(nodes);
      for (const node of nodes) node.dataset.mathRendered = 'true';
    } catch (error) {
      for (const node of nodes) {
        node.textContent = latexToReadableText(node.dataset.latex);
        node.dataset.mathRendered = 'false';
      }
      console.warn('Math rendering failed; readable Unicode fallback remains visible.', error);
    }
  });
}

export function mathText(latex, display = false) {
  return display ? `\\[${latex}\\]` : `\\(${latex}\\)`;
}

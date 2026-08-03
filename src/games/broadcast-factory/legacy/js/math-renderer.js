const SUBSCRIPTS = Object.freeze({ 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', i: 'ᵢ', j: 'ⱼ', m: 'ₘ', n: 'ₙ' });

function subscript(value) {
  return [...value].map((character) => SUBSCRIPTS[character] ?? character).join('');
}

export function formatPlainMath(source) {
  return String(source)
    .replace(/\bgamma\b/g, 'γ')
    .replace(/\bbeta\b/g, 'β')
    .replace(/_\{([^}]+)\}/g, (_, value) => subscript(value))
    .replace(/_([0-9ijmn])/g, (_, value) => subscript(value))
    .replace(/\^T\b/g, 'ᵀ')
    .replace(/\.\*|\*/g, '·')
    .replace(/\s*=\s*/g, ' = ')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s*-\s*/g, ' − ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fallbackMath(source) {
  const readable = String(source)
    .replace(/\\begin\{bmatrix\}/g, '[')
    .replace(/\\end\{bmatrix\}/g, ']')
    .replace(/\\\\/g, '; ')
    .replace(/\\(?:mathbf|boldsymbol)\{([^{}]+)\}/g, '$1')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/\\operatorname\{([^{}]+)\}/g, '$1')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replaceAll('\\partial', '∂')
    .replaceAll('\\odot', '⊙')
    .replaceAll('\\oslash', '⊘')
    .replaceAll('\\quad', '   ')
    .replaceAll('\\times', '×')
    .replaceAll('\\in', ' ∈ ')
    .replaceAll('\\sum', 'Σ')
    .replaceAll('\\gamma', 'γ')
    .replaceAll('\\beta', 'β')
    .replace(/[{}]/g, '')
    .replace(/\\/g, '');
  return formatPlainMath(readable);
}

export function renderMath(element, source, { display = false, label = null } = {}) {
  element.setAttribute('role', 'math');
  element.setAttribute('aria-label', label ?? fallbackMath(source));

  const fallback = document.createElement('span');
  fallback.className = 'math-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  fallback.textContent = fallbackMath(source);

  const target = document.createElement('span');
  target.className = 'math-render-target math-render-pending';
  target.setAttribute('aria-hidden', 'true');
  target.textContent = display ? `\\[${source}\\]` : `\\(${source}\\)`;
  element.replaceChildren(fallback, target);
}

export function renderAllMath(root = document) {
  root.querySelectorAll('[data-math]').forEach((element) => renderMath(element, element.dataset.math, { display: element.dataset.display === 'true', label: element.dataset.label }));
  const targets = [...root.querySelectorAll('.math-render-target')];
  const typeset = async () => {
    if (!window.MathJax?.typesetPromise || !targets.length) return;
    try {
      await window.MathJax.typesetPromise(targets);
      targets.forEach((target) => {
        if (!target.isConnected) return;
        const svg = target.querySelector('svg');
        const viewBox = svg?.viewBox?.baseVal;
        const hasGlyphs = Boolean(svg?.querySelector('path, use'));
        if (svg && hasGlyphs && viewBox?.width > 0 && viewBox?.height > 0) {
          target.previousElementSibling.hidden = true;
          target.classList.remove('math-render-pending');
        } else target.remove();
      });
    } catch {
      targets.forEach((target) => target.remove());
    }
  };
  if (window.MathJax?.startup?.promise) window.MathJax.startup.promise.then(typeset);
  else typeset();
}

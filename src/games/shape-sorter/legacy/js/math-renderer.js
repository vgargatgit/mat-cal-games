let loaderPromise = null;

function configureMathJax() {
  window.MathJax = {
    svg: { fontCache: 'global' },
    options: { enableMenu: false },
    startup: { typeset: false }
  };
}

function loadMathJax() {
  if (window.MathJax?.tex2svgPromise) return Promise.resolve(window.MathJax);
  if (loaderPromise) return loaderPromise;
  configureMathJax();
  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => reject(new Error('MathJax load timed out')), 8000);
    script.addEventListener('load', () => {
      window.clearTimeout(timer);
      resolve(window.MathJax);
    }, { once: true });
    script.addEventListener('error', () => {
      window.clearTimeout(timer);
      reject(new Error('MathJax could not be loaded'));
    }, { once: true });
    document.head.append(script);
  }).catch((error) => {
    console.info('Using readable built-in math fallback.', error.message);
    return null;
  });
  return loaderPromise;
}

export async function renderMath(root = document.body) {
  const mathJax = await loadMathJax();
  if (!mathJax?.tex2svgPromise) return;
  const nodes = [...root.querySelectorAll('.math-node:not([data-rendered])')];
  for (const node of nodes) {
    try {
      const display = node.dataset.mathDisplay === 'block';
      const rendered = await mathJax.tex2svgPromise(node.dataset.tex, { display });
      node.replaceChildren(rendered);
      node.dataset.rendered = 'true';
    } catch (error) {
      console.warn('Could not render equation; fallback text remains.', error);
    }
  }
}

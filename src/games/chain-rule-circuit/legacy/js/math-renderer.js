export async function typesetMath(root = document.body) {
  if (!window.MathJax?.typesetPromise) return;
  try { await window.MathJax.typesetPromise([root]); } catch (error) { console.warn('Equation rendering failed.', error); }
}

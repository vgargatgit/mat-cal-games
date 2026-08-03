export async function typesetMath(root = document) {
  try {
    if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([root]);
  } catch (error) {
    console.warn('Math rendering fallback active.', error);
  }
}

export function inlineMath(latex, ariaLabel = '') {
  const safe = String(latex).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  return `<span class="math" role="math"${ariaLabel ? ` aria-label="${ariaLabel}"` : ''}>\\(${safe}\\)</span>`;
}

export function displayMath(latex, ariaLabel = '') {
  const safe = String(latex).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  return `<div class="equation" role="math"${ariaLabel ? ` aria-label="${ariaLabel}"` : ''}>\\[${safe}\\]</div>`;
}

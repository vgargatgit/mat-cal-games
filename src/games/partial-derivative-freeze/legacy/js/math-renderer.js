export async function renderMath(root = document.body) {
  if (!root) return;
  try {
    const mathJax = await waitForMathJax();
    if (!mathJax) return;
    if (mathJax.startup?.promise) await mathJax.startup.promise;
    if (mathJax.typesetPromise) await mathJax.typesetPromise([root]);
  } catch (error) {
    console.warn('Math rendering fell back to source notation.', error);
  }
}

async function waitForMathJax(timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (window.MathJax?.typesetPromise || window.MathJax?.startup?.promise) return window.MathJax;
    await new Promise((resolve) => window.setTimeout(resolve, 25));
  }
  return null;
}

export function mathText(latex, display = false) {
  return display ? `\\[${latex}\\]` : `\\(${latex}\\)`;
}

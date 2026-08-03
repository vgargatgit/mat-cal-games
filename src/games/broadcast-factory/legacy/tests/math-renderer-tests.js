import { fallbackMath, formatPlainMath } from '../js/math-renderer.js';

export async function registerMathRendererTests(t) {
  await t.test('math fallback keeps fractions readable without MathJax', () => {
    const actual = fallbackMath('\\frac{\\partial\\mathbf{f}}{\\partial\\mathbf{x}}\\in\\mathbb{R}^{m\\times n}');
    t.equal(actual, '(∂f) / (∂x) ∈ ℝ^(m× n)');
  });

  await t.test('math fallback converts matrices without raw TeX delimiters', () => {
    const actual = fallbackMath('\\mathbf{x}=\\begin{bmatrix}1\\\\2\\\\3\\end{bmatrix}');
    t.equal(actual, 'x = [1; 2; 3]');
    t.assert(!actual.includes('\\'), 'Fallback must not expose raw TeX commands');
  });

  await t.test('plain math uses reader-visible subscripts and operators', () => {
    t.equal(formatPlainMath('y_i=x_i+z'), 'yᵢ = xᵢ + z');
    t.equal(formatPlainMath('y_2=x_2.*v_2'), 'y₂ = x₂·v₂');
  });
}

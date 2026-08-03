export const CONCEPTS=[
{title:'Sum reduction',formula:'s=\\sum_i x_i',gradient:'\\frac{\\partial s}{\\partial\\mathbf{x}}=\\mathbf{1}^T',note:'Many components become one scalar; every lane has local slope one.'},
{title:'Mean reduction',formula:'m=\\frac1n\\sum_i x_i',gradient:'\\frac{\\partial m}{\\partial\\mathbf{x}}=\\frac1n\\mathbf{1}^T',note:'A mean is a sum followed by one scaling operation.'},
{title:'Weighted sum',formula:'s=\\mathbf{w}^T\\mathbf{x}',gradient:'\\frac{\\partial s}{\\partial\\mathbf{x}}=\\mathbf{w}^T',note:'Each lane receives its matching weight.'},
{title:'Dot product',formula:'\\mathbf{x}^T\\mathbf{y}=\\sum_i x_i y_i',gradient:'\\frac{\\partial s}{\\partial\\mathbf{x}}=\\mathbf{y}^T',note:'First multiply matching lanes; then reduce.'},
{title:'Sum of squares',formula:'s=\\sum_i x_i^2',gradient:'\\frac{\\partial s}{\\partial\\mathbf{x}}=2\\mathbf{x}^T',note:'The square stage contributes 2xᵢ before the sum.'},
{title:'Incoming gradient',formula:'g=\\frac{\\partial L}{\\partial s}',gradient:'\\frac{\\partial L}{\\partial\\mathbf{x}}=g\\frac{\\partial s}{\\partial\\mathbf{x}}',note:'Chain-rule factors multiply along each path.'}
];
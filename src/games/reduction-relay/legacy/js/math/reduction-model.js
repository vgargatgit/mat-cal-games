export const STAGES = Object.freeze({
  ewAdd:{id:'ewAdd',label:'Element-wise Add',kind:'elementwise'},
  ewMultiply:{id:'ewMultiply',label:'Element-wise Multiply',kind:'elementwise'},
  square:{id:'square',label:'Square',kind:'elementwise'},
  scale:{id:'scale',label:'Scale',kind:'elementwise'},
  sum:{id:'sum',label:'Sum',kind:'reduction'},
  mean:{id:'mean',label:'Mean',kind:'reduction'},
  weightedSum:{id:'weightedSum',label:'Weighted Sum',kind:'reduction'},
  max:{id:'max',label:'Maximum',kind:'reduction'},
  dot:{id:'dot',label:'Dot Product',kind:'composite'},
  noReduction:{id:'noReduction',label:'No Reduction',kind:'identity'}
});

const requireVector = values => {
  if (!Array.isArray(values) || values.length === 0 || values.some(v => !Number.isFinite(v))) {
    throw new Error('Input must be a nonempty vector of finite numbers');
  }
};

/** Pure numerical semantics for a reduction. */
export function computeReductionOutput(operation, inputValues, context={}) {
  requireVector(inputValues);
  const sum = inputValues.reduce((a,b)=>a+b,0);
  switch (operation) {
    case 'sum': case 'sumLoss': return sum;
    case 'mean': case 'meanLoss': return sum/inputValues.length;
    case 'weightedSum': {
      const w=context.weights; requireVector(w);
      if(w.length!==inputValues.length) throw new Error('Weights must match input length');
      return inputValues.reduce((a,x,i)=>a+x*w[i],0);
    }
    case 'sumSquares': case 'sse': return inputValues.reduce((a,x)=>a+x*x,0);
    case 'meanSquares': case 'mse': return inputValues.reduce((a,x)=>a+x*x,0)/inputValues.length;
    case 'weightedSumSquares': {
      const w=context.weights; requireVector(w);
      if(w.length!==inputValues.length) throw new Error('Weights must match input length');
      return inputValues.reduce((a,x,i)=>a+w[i]*x*x,0);
    }
    case 'max': return Math.max(...inputValues);
    default: throw new Error(`Unsupported reduction: ${operation}`);
  }
}

/** Numerator-layout local derivative values; the caller supplies row orientation. */
export function reductionGradient(operation,inputLength,context={}) {
  if(!Number.isInteger(inputLength)||inputLength<1) throw new Error('Input length must be positive');
  const x=context.values;
  switch(operation){
    case 'sum': case 'sumLoss': return Array(inputLength).fill(1);
    case 'mean': case 'meanLoss': return Array(inputLength).fill(1/inputLength);
    case 'weightedSum':
      if(!Array.isArray(context.weights)||context.weights.length!==inputLength) throw new Error('Weights must match input length');
      return [...context.weights];
    case 'sumSquares': case 'sse':
      if(!Array.isArray(x)||x.length!==inputLength) throw new Error('Values must match input length');
      return x.map(v=>2*v);
    case 'meanSquares': case 'mse':
      if(!Array.isArray(x)||x.length!==inputLength) throw new Error('Values must match input length');
      return x.map(v=>2*v/inputLength);
    case 'weightedSumSquares':
      if(!Array.isArray(x)||x.length!==inputLength||!Array.isArray(context.weights)||context.weights.length!==inputLength) throw new Error('Values and weights must match input length');
      return x.map((v,i)=>2*context.weights[i]*v);
    case 'max': {
      if(!Array.isArray(x)||x.length!==inputLength) throw new Error('Values must match input length');
      const maximum=Math.max(...x),indices=x.map((v,i)=>v===maximum?i:-1).filter(i=>i>=0);
      if(indices.length!==1) throw new Error('Maximum derivative is not unique at a tie');
      return x.map((_,i)=>i===indices[0]?1:0);
    }
    default: throw new Error(`Unsupported reduction: ${operation}`);
  }
}

export function expandDotProduct(leftVector,rightVector){
  requireVector(leftVector); requireVector(rightVector);
  if(leftVector.length!==rightVector.length) throw new Error('Dot product requires matching lengths');
  const products=leftVector.map((v,i)=>v*rightVector[i]);
  return {products,sum:products.reduce((a,b)=>a+b,0),stages:['ewMultiply','sum']};
}

/** Sum a rectangular matrix across rows, columns, or all entries. */
export function computeAxisReduction(matrix,axis){
 if(!Array.isArray(matrix)||!matrix.length||!matrix.every(row=>Array.isArray(row)&&row.length===matrix[0].length&&row.length>0&&row.every(Number.isFinite)))throw new Error('Axis reduction requires a nonempty rectangular numeric matrix');
 if(axis==='rows')return matrix.map(row=>row.reduce((a,b)=>a+b,0));
 if(axis==='columns')return matrix[0].map((_,column)=>matrix.reduce((sum,row)=>sum+row[column],0));
 if(axis==='all')return matrix.flat().reduce((a,b)=>a+b,0);
 throw new Error(`Unsupported reduction axis: ${axis}`);
}

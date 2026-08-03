export const scalarShape=()=>({rows:1,columns:1,semanticType:'scalar'});
export const vectorShape=n=>({rows:n,columns:1,semanticType:'column-vector'});
export const rowShape=n=>({rows:1,columns:n,semanticType:'row-vector'});
export const matrixShape=(r,c)=>({rows:r,columns:c,semanticType:'matrix'});
export const shapeLabel=s=>s.semanticType==='scalar'?'scalar':`${s.rows}×${s.columns}`;
export function derivativeShape(output,input,convention='numerator'){
 if(convention!=='numerator') throw new Error('Only numerator layout is supported');
 if(output.semanticType==='scalar'&&input.semanticType==='column-vector') return rowShape(input.rows);
 if(output.semanticType==='column-vector'&&input.semanticType==='scalar') return vectorShape(output.rows);
 if(output.semanticType==='column-vector'&&input.semanticType==='column-vector') return matrixShape(output.rows,input.rows);
 return scalarShape();
}
export function sameShape(a,b){return a.rows===b.rows&&a.columns===b.columns&&a.semanticType===b.semanticType}
export function computeOutputShape(operation,inputShapes){
 if(!Array.isArray(inputShapes)||!inputShapes.length)throw new Error('Missing input shapes');const a=inputShapes[0];
 if(['sum','mean','weightedSum','max'].includes(operation)){if(a.semanticType!=='column-vector')throw new Error('Reduction requires a column vector');return scalarShape()}
 if(['ewAdd','ewMultiply'].includes(operation)){const b=inputShapes[1];if(!b||!sameShape(a,b)||a.semanticType!=='column-vector')throw new Error('Element-wise operation requires equal column-vector shapes');return {...a}}
 if(['square','scale','noReduction'].includes(operation))return {...a};throw new Error(`Unsupported shape operation: ${operation}`)
}
export function validateGradientShape(output,input,convention='numerator',candidate){const expected=derivativeShape(output,input,convention);return {valid:sameShape(expected,candidate),expected}}

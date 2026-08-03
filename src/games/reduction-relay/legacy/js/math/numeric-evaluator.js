import {computeReductionOutput,expandDotProduct} from './reduction-model.js';
export function sumOfSquares(x){return x.reduce((a,v)=>a+v*v,0)}
export function weightedSumOfSquares(x,w){if(x.length!==w.length)throw new Error('Length mismatch');return x.reduce((a,v,i)=>a+w[i]*v*v,0)}
export function evaluateFamily(family,q){
 switch(family){
  case 'sum':case 'sum-loss':return computeReductionOutput('sum',q.x);
  case 'mean':case 'mean-loss':return computeReductionOutput('mean',q.x);
  case 'weighted-sum':return computeReductionOutput('weightedSum',q.x,{weights:q.w});
  case 'dot':return expandDotProduct(q.x,q.y).sum;
  case 'sum-squares':return sumOfSquares(q.x);
  case 'weighted-sum-squares':return weightedSumOfSquares(q.x,q.w);
  case 'mean-squares':case 'mse':return sumOfSquares(q.x)/q.x.length;
  case 'max':return computeReductionOutput('max',q.x);
  default:throw new Error(`Unknown family ${family}`)
 }
}
export function finiteDifference(fn,x,eps=1e-5){return x.map((_,j)=>{const p=[...x],m=[...x];p[j]+=eps;m[j]-=eps;return (fn(p)-fn(m))/(2*eps)})}

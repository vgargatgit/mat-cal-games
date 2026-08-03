import {SeededRandom} from './seeded-random.js';
import {computeAxisReduction} from '../math/reduction-model.js';

const taskFor=family=>({sum:'Compute the scalar sum s = Σᵢxᵢ.',mean:'Compute the scalar mean m = (1/n)Σᵢxᵢ.','weighted-sum':'Compute the weighted scalar s = Σᵢwᵢxᵢ.',dot:'Compute s = xᵀy by multiplying matching components and then summing.','sum-squares':'Compute s = Σᵢxᵢ².','weighted-sum-squares':'Compute s = Σᵢwᵢxᵢ².',mse:'Compute the mean squared value m = (1/n)Σᵢxᵢ².',max:'Find the unique maximum and route its local gradient.','sum-loss':'Compute the sum of the per-example losses.','mean-loss':'Compute the mean of the per-example losses.'}[family]||'Construct the stated scalar reduction.');
const repairTypes=['missingReduction','identitySum','upstreamOmitted','missingMean','meanTwice','wrongLane','wrongOrder','wrongOperand','wrongOperand','diagonalFinal','squareOnes','wrongLane','oneLaneOnly','missingMean','squareOnes','upstreamOmitted','wrongOrientation','sumInsteadMean','missingReduction','meanTwice'];

export function generateQuestion(level,seed=Date.now(),roundType='practice'){
 const r=new SeededRandom(seed),n=r.int(2,5),nz=()=>{let v=0;while(v===0)v=r.int(-5,5);return v};
 const x=Array.from({length:n},nz),y=Array.from({length:n},nz),w=Array.from({length:n},nz);
 const family=level.id===18&&roundType==='mastery'?'max':level.family;
 if(family==='max'){x[0]=5;for(let i=1;i<x.length;i++)if(x[i]>=5)x[i]=4;}
 const stages=family==='dot'?['ewMultiply','sum']:family==='sum-squares'?['square','sum']:family==='weighted-sum-squares'?['square','weightedSum']:family==='mse'?['square','mean']:family==='mean'||family==='mean-loss'?['mean']:family==='weighted-sum'?['weightedSum']:family==='max'?['max']:['sum'];
 const axis=level.id===19?r.pick(['rows','columns','all']):null,matrix=axis?[x,y]:null;
 const target=family==='dot'?(level.id===9?'y':level.id===8?'x':r.next()>.5?'y':'x'):level.id===13||level.id===14?'losses':level.id===15?'e':'x';
 const prompt=target==='losses'?(family==='mean'?'Compute the scalar mean of the per-example losses.':'Compute the scalar sum of the per-example losses.'):target==='e'?'Compute the scalar reduction of the error vector e.':taskFor(family);
 return {id:`gen-${level.id}-${seed}-${roundType}`,seed,roundType,level:level.id,family,x,y,w,stages,target,upstream:level.id===3||level.id>=16?r.int(2,4):1,prompt,comparison:level.id===5?'sum-mean':null,repair:roundType==='repair'?{type:repairTypes[level.id-1]}:null,axisChallenge:axis?{matrix,axis,output:computeAxisReduction(matrix,axis)}:null};
}

import { createSeededRandom } from './seeded-random.js';
import { scalarShape } from '../math/shape-model.js';
import { LEVEL_BY_NUMBER } from '../data/levels.js';

const shape=scalarShape();
const node=(id,role,label,operation,position)=>({id,role,label,shape:{...shape},operation,position});
const edge=(from,to,expression,value=null)=>({from,to,localDerivative:{expression,value,shape:{...shape}}});

export const QUESTION_FAMILIES=['two-stage-composition','three-stage-composition','power-activation','incoming-gradient','two-branch-addition','shared-intermediate','product-rule','residual','vector-chain','scalar-loss-vector','elementwise-activation','elementwise-reduction','broadcast-reduction','affine-activation','relu','neuron-loss','shape-only','repair','path-selection','gradient-accumulation'];
const familyAliases={'two-stage-composition':'serial','three-stage-composition':'serial','power-activation':'serial','incoming-gradient':'serial','two-branch-addition':'branch','shared-intermediate':'branch','product-rule':'branch','residual':'residual','vector-chain':'shape','scalar-loss-vector':'shape','elementwise-activation':'shape','elementwise-reduction':'shape','broadcast-reduction':'shape','affine-activation':'shape','relu':'relu','neuron-loss':'relu','shape-only':'shape','repair':'branch','path-selection':'branch','gradient-accumulation':'branch'};
const families=['serial','branch','residual','relu','shape'];

function familyForLevel(level, random) {
  if (!Number.isInteger(level) || level >= 22) return random.pick(families);
  if (level <= 7) return 'serial';
  if (level <= 10) return 'branch';
  if (level === 11) return 'residual';
  if (level === 12 || level === 20) return 'branch';
  if (level >= 13 && level <= 17) return 'shape';
  if (level === 18 || level === 19) return 'relu';
  if (level === 21) return 'shape';
  return random.pick(families);
}

export function generateRound(seed=1,options={}){
  const random=createSeededRandom(seed);const requestedFamily=options.family??familyForLevel(options.level,random);const family=familyAliases[requestedFamily]??requestedFamily;const coefficient=random.integer(2,5);const power=random.integer(2,4);
  const generatedLevel=options.level??(family==='shape'?13:family==='branch'?8:family==='residual'?11:family==='relu'?18:5);const canonical=LEVEL_BY_NUMBER[generatedLevel];const common={id:`generated-${family}-${seed}`,seed,level:generatedLevel,title:canonical?.title??'Generated circuit',objective:canonical?.objective??'',difficulty:options.difficulty??'medium',mode:'generated',taskType:'chain',inputId:'x',outputId:'y',concepts:['chain-rule'],hints:['Trace all dependency routes first.','Label each immediate derivative.','Multiply within routes, then add routes.']};
  if(family==='branch')return{...common,scenarioTitle:'Generated parallel circuit',expression:`y=x^${power}+${coefficient}x`,assignments:[`u=x^${power}`,`v=${coefficient}x`,'y=u+v'],answer:`${power}x^${power-1}+${coefficient}`,accepted:[`${power}x^${power-1}+${coefficient}`],graph:{nodes:[node('x','input','x',null,{x:55,y:150}),node('u','intermediate',`u=x^${power}`,{type:'power',params:{exponent:power}},{x:300,y:70}),node('v','intermediate',`v=${coefficient}x`,{type:'multiply'},{x:300,y:230}),node('y','output','y=u+v',{type:'add'},{x:590,y:150})],edges:[edge('x','u',`${power}x^${power-1}`),edge('x','v',String(coefficient),coefficient),edge('u','y','1',1),edge('v','y','1',1)]},expectedPaths:[['x','u','y'],['x','v','y']],expectedProduct:[`${power}x^${power-1}`,String(coefficient)],concepts:['multiple-paths','gradient-accumulation'],explanation:'Two completed dependency routes accumulate at x.'};
  if(family==='residual')return{...generateRound(seed,{...options,family:'branch'}),id:`generated-residual-${seed}`,level:options.level??11,scenarioTitle:'Generated residual circuit',expression:`y=x^${power}+x`,assignments:[`u=x^${power}`,'y=u+x'],answer:`${power}x^${power-1}+1`,accepted:[`${power}x^${power-1}+1`],graph:{nodes:[node('x','input','x',null,{x:55,y:150}),node('u','intermediate',`u=x^${power}`,{type:'power',params:{exponent:power}},{x:310,y:75}),node('y','output','y=u+x',{type:'add'},{x:590,y:150})],edges:[edge('x','u',`${power}x^${power-1}`),edge('u','y','1',1),edge('x','y','1',1)]},expectedPaths:[['x','u','y'],['x','y']],expectedProduct:[`${power}x^${power-1}`,'1'],concepts:['residual','multiple-paths'],explanation:'The identity skip route contributes one.'};
  if(family==='relu')return{...common,level:options.level??18,scenarioTitle:'Generated ReLU gate',expression:'y=ReLU(x), x<0',assignments:['y=ReLU(x)'],answer:'0',accepted:['0'],graph:{nodes:[node('x','input','x<0',null,{x:80,y:150}),node('y','output','y=ReLU(x)',{type:'relu'},{x:580,y:150})],edges:[edge('x','y','0',0)]},expectedPaths:[['x','y']],expectedProduct:['0'],concepts:['relu'],explanation:'The structural dependency stays present while the local gate gain is zero.'};
  if(family==='shape'){const n=random.integer(2,4);const p=random.integer(2,4);const m=random.integer(2,4);return{...common,level:options.level??13,scenarioTitle:'Generated Jacobian shape circuit',taskType:'shape',expression:`x∈R^${n} → u∈R^${p} → y∈R^${m}`,assignments:[`∂y/∂u: ${m}×${p}`,`∂u/∂x: ${p}×${n}`],answer:`${m}x${n}`,accepted:[`${m}x${n}`,`${m}×${n}`],shapeBlocks:[{rows:m,columns:p,label:'∂y/∂u'},{rows:p,columns:n,label:'∂u/∂x'}],expectedShape:{rows:m,columns:n},expectedPaths:[],expectedProduct:[],concepts:['vector-chain'],explanation:`The matching inner dimension ${p} cancels, leaving ${m}×${n}.`};}
  return{...common,scenarioTitle:'Generated serial circuit',expression:`y=(x^${power})+${coefficient}`,assignments:[`u=x^${power}`,`y=u+${coefficient}`],answer:`${power}x^${power-1}`,accepted:[`${power}x^${power-1}`],graph:{nodes:[node('x','input','x',null,{x:70,y:150}),node('u','intermediate',`u=x^${power}`,{type:'power',params:{exponent:power}},{x:320,y:150}),node('y','output',`y=u+${coefficient}`,{type:'add'},{x:585,y:150})],edges:[edge('x','u',`${power}x^${power-1}`),edge('u','y','1',1)]},expectedPaths:[['x','u','y']],expectedProduct:['1',`${power}x^${power-1}`],explanation:'One serial route multiplies its two local sensitivities.'};
}

export function generateMany(count,seed=1){return Array.from({length:count},(_,index)=>generateRound(seed+index));}

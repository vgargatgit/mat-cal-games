import { MISCONCEPTIONS } from '../data/misconceptions.js';

export function normalizeMath(value) {
  return String(value ?? '').toLowerCase().replace(/\\operatorname\{relu\}/g,'relu').replace(/\\/g,'').replace(/[{}\s·,]/g,'').replace(/\^\{([^}]+)\}/g,'^$1').replace(/\*+/g,'*');
}

function expectedDependencySet(item) {
  const set=new Set();
  item.dependencyMatrix.forEach((row,r)=>row.forEach((depends,c)=>{if(depends)set.add(`${r}-${c}`);}));
  return set;
}

export function diagnoseMisconception(item, answer) {
  const expected=expectedDependencySet(item); const submitted=new Set(answer.dependencies??[]);
  const missing=[...expected].filter(key=>!submitted.has(key)); const extra=[...submitted].filter(key=>!expected.has(key));
  if(missing.length){const hasIndirect=missing.some(key=>item.dependencyCells.flat().find(cell=>`${cell.row}-${cell.column}`===key)?.dependencyPaths.some(path=>path.length>2));return hasIndirect?'missed-indirect-dependency':'missing-direct-dependency';}
  if(extra.length)return'false-dependency';
  const selected=new Set(answer.classifications??[]);
  if(selected.has('diagonal')&&!item.classification.diagonal)return'square-means-diagonal';
  if(selected.has('identity')&&!item.classification.identity)return'diagonal-means-identity';
  for(const[key,reason]of Object.entries(item.zeroReasons??{})){if(answer.zeroReasons?.[key]&&answer.zeroReasons[key]!==reason){if(reason==='local-slope-zero'||reason==='inactive-activation')return'evaluated-zero-as-structural';return'structural-as-local';}}
  return null;
}

export function validateAnswer(item, answer) {
  const expectedDependencies=expectedDependencySet(item); const submittedDependencies=new Set(answer.dependencies??[]);
  const dependencyCorrect=[...expectedDependencies].filter(key=>submittedDependencies.has(key)).length;
  const dependencyExtra=[...submittedDependencies].filter(key=>!expectedDependencies.has(key)).length;
  const dependencyMissing=expectedDependencies.size-dependencyCorrect;

  let gridCorrect=0; const gridTotal=item.expectedShape.rows*item.expectedShape.columns; const gridErrors=[];
  for(let r=0;r<item.expectedShape.rows;r+=1)for(let c=0;c<item.expectedShape.columns;c+=1){const key=`${r}-${c}`;const expected=item.dependencyMatrix[r][c]?'possible':'structural-zero';const actual=answer.grid?.[key]??'unknown';if(actual===expected||((item.zeroReasons?.[key]==='local-slope-zero'||item.zeroReasons?.[key]==='inactive-activation')&&actual==='evaluated-zero'))gridCorrect+=1;else gridErrors.push(key);}

  const shapeCorrect=Number(answer.shape?.rows)===item.expectedShape.rows&&Number(answer.shape?.columns)===item.expectedShape.columns;
  const expectedClassifications=item.classificationOptions.filter(key=>{
    if(key==='zeroRow')return item.classification.zeroRows.length>0;
    if(key==='zeroColumn')return item.classification.zeroColumns.length>0;
    return Boolean(item.classification[key]);
  });
  const selectedClassifications=answer.classifications??[];
  const missingClassifications=expectedClassifications.filter(key=>!selectedClassifications.includes(key));
  const extraClassifications=selectedClassifications.filter(key=>!expectedClassifications.includes(key));
  const classificationCorrect=missingClassifications.length===0&&extraClassifications.length===0;

  const derivativeResults=(item.derivativeTargets??[]).map(target=>{const key=`${target.row}-${target.column}`;const actual=normalizeMath(answer.derivatives?.[key]);const expected=target.expected.map(normalizeMath);return{key,correct:expected.includes(actual),actual,expected};});
  const derivativeCorrect=derivativeResults.filter(result=>result.correct).length;

  const zeroEntries=Object.entries(item.zeroReasons??{}); const zeroReasonCorrect=zeroEntries.filter(([key,value])=>answer.zeroReasons?.[key]===value).length;
  const misconception=diagnoseMisconception(item,answer);
  const allCorrect=shapeCorrect&&dependencyMissing===0&&dependencyExtra===0&&gridCorrect===gridTotal&&classificationCorrect&&derivativeCorrect===derivativeResults.length&&zeroReasonCorrect===zeroEntries.length;
  return {allCorrect,shapeCorrect,dependencyCorrect,dependencyTotal:expectedDependencies.size,dependencyMissing,dependencyExtra,gridCorrect,gridTotal,gridErrors,classificationCorrect,expectedClassifications,missingClassifications,extraClassifications,derivativeCorrect,derivativeTotal:derivativeResults.length,derivativeResults,zeroReasonCorrect,zeroReasonTotal:zeroEntries.length,misconception,misconceptionFeedback:misconception?MISCONCEPTIONS[misconception]:null};
}

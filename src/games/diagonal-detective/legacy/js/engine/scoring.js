export function calculateScore(result, context = {}) {
  const lines=[];
  const add=(label,earned,possible)=>lines.push({label,earned:Math.round(earned),possible});
  add('Jacobian shape',result.shapeCorrect?10:0,10);
  add('Dependency evidence',result.dependencyTotal?20*result.dependencyCorrect/result.dependencyTotal:20,20);
  add('Structural grid',result.gridTotal?20*result.gridCorrect/result.gridTotal:20,20);
  add('Structure classification',result.classificationCorrect?25:Math.max(0,25-8*(result.missingClassifications.length+result.extraClassifications.length)),25);
  add('Selected derivatives',result.derivativeTotal?20*result.derivativeCorrect/result.derivativeTotal:20,20);
  add('Zero reasons',result.zeroReasonTotal?25*result.zeroReasonCorrect/result.zeroReasonTotal:25,25);
  if(result.allCorrect&&context.firstAttempt)add('First-attempt bonus',20,20);
  if(result.allCorrect&&!context.hintsUsed)add('No-hint bonus',10,10);
  if(result.allCorrect&&context.streak)add('Streak bonus',Math.min(25,context.streak*5),25);
  return {total:lines.reduce((sum,line)=>sum+line.earned,0),possible:lines.reduce((sum,line)=>sum+line.possible,0),lines};
}

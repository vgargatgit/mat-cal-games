import { inlineMath } from '../math-renderer.js';

export function createFeedbackPanel(item, result, score) {
  const panel = document.createElement('section');
  panel.className = `card feedback-panel ${result.allCorrect?'good':'bad'}`;
  panel.innerHTML = `<span class="kicker">${result.allCorrect?'Case solved':'Evidence conflict'}</span><h2>${result.allCorrect?'Excellent investigation':'Re-check the first inconsistent clue'}</h2>`;
  const summary = document.createElement('p');
  summary.textContent = result.allCorrect ? item.explanation : (result.misconceptionFeedback ?? 'One or more entries conflict with the computation paths.');
  panel.append(summary);
  const breakdown = document.createElement('div');
  breakdown.className = 'score-breakdown';
  score.lines.forEach(line => {
    const itemLine = document.createElement('div');
    itemLine.className = 'score-line';
    itemLine.innerHTML = `${line.label}<strong>${line.earned}/${line.possible}</strong>`;
    breakdown.append(itemLine);
  });
  panel.append(breakdown);
  const detail = document.createElement('div');
  detail.className = 'callout';
  if (result.allCorrect) {
    detail.innerHTML = `<strong>Backpropagation clue:</strong> ${item.neuralConnection}`;
  } else {
    const issues=[];
    if(!result.shapeCorrect)issues.push(`Expected Jacobian shape ${item.expectedShape.rows}×${item.expectedShape.columns}.`);
    if(result.dependencyMissing)issues.push(`${result.dependencyMissing} required dependency wire(s) are missing.`);
    if(result.dependencyExtra)issues.push(`${result.dependencyExtra} extra wire(s) have no computation path.`);
    if(result.gridCorrect<result.gridTotal)issues.push(`${result.gridTotal-result.gridCorrect} structural grid cell(s) conflict with the wire evidence.`);
    if(!result.classificationCorrect)issues.push(`Classification mismatch. Missing: ${result.missingClassifications.join(', ')||'none'}; extra: ${result.extraClassifications.join(', ')||'none'}.`);
    if(result.derivativeCorrect<result.derivativeTotal)issues.push(`${result.derivativeTotal-result.derivativeCorrect} selected derivative(s) need correction.`);
    if(result.zeroReasonCorrect<result.zeroReasonTotal)issues.push(`${result.zeroReasonTotal-result.zeroReasonCorrect} zero-reason label(s) need correction.`);
    detail.innerHTML = `<strong>First evidence report:</strong><ul>${issues.map(issue=>`<li>${issue}</li>`).join('')}</ul>`;
  }
  panel.append(detail);
  if (result.allCorrect) {
    const paths = document.createElement('ul');
    paths.className='path-list';
    item.dependencyCells.flat().filter(cell=>cell.structurallyDepends).slice(0,5).forEach(cell=>{
      const li=document.createElement('li');
      li.innerHTML=`${inlineMath(cell.input)} → ${inlineMath(cell.output)}: ${cell.dependencyPaths.map(path=>path.join(' → ')).join('; ')}`;
      paths.append(li);
    });
    panel.append(paths);
  }
  return panel;
}

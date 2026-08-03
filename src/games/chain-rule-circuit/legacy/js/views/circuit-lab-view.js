import { el } from '../components/dom.js';
import { createCircuitGraph } from '../components/computation-graph.js';
import { LEVELS, LEVEL_BY_NUMBER } from '../data/levels.js';
import { CIRCUIT_GATES } from '../data/circuit-components.js';
import {
  edgeKey,
  expectedSerialFactors,
  pathKey,
  roundStageRange,
  stageReadiness
} from '../engine/stage-validator.js';

const STAGES = [
  { name:'Decompose', short:'Split' },
  { name:'Connect', short:'Wire' },
  { name:'Label', short:'Label' },
  { name:'Trace', short:'Paths' },
  { name:'Propagate', short:'Backprop' }
];

function levelSidebar(current, completed, onSelect) {
  const list = el('div', { className:'level-list' });
  LEVELS.forEach(level => {
    const isComplete = completed.includes(level.level);
    list.append(el('button', {
      className:level.level === current ? 'current' : '',
      onClick:() => onSelect(level.level),
      'aria-current':level.level === current ? 'step' : null,
      'aria-label':`Level ${level.level}: ${level.title}${isComplete ? ', complete' : ''}`
    },
    el('span', { className:'level-num', text:String(level.level) }),
    el('span', { className:'level-name', text:level.title }),
    isComplete ? el('span', { className:'level-complete', text:'✓', 'aria-hidden':'true' }) : null
    ));
  });

  return el('aside', { className:'level-sidebar', 'aria-label':'Level navigator' },
    el('div', { className:'level-sidebar-head' },
      el('div', {}, el('h2', { text:'22-level circuit board' }), el('p', { text:'Scalar paths → vector backpropagation' })),
      el('span', { className:'badge good', text:`${completed.length} complete` })
    ),
    list,
    el('div', { className:'level-sidebar-footer' },
      el('p', { className:'sidebar-note', text:'Every level includes guided, generated, repair, and mastery modes.' })
    )
  );
}

function stageTabs(round, partial, stage, onStage) {
  const currentStatus = stageReadiness(round, partial, stage);
  const { start, end } = roundStageRange(round);
  const focusedStyle = start !== 0 || end !== 4
    ? `grid-template-columns:repeat(${end - start + 1}, minmax(0, 1fr))`
    : null;
  return el('div', { className:'stage-tabs', role:'tablist', 'aria-label':'Round stages', style:focusedStyle },
    STAGES.map((item, index) => ({ item, index }))
      .filter(({ index }) => index >= start && index <= end)
      .map(({ item, index }) => {
        const readiness = stageReadiness(round, partial, index);
        const unlocked = index <= stage || (index === stage + 1 && currentStatus.complete);
        const done = index < stage && readiness.complete;
        return el('button', {
          className:`stage-tab ${index === stage ? 'active' : ''} ${done ? 'done' : ''}`,
          role:'tab',
          'aria-selected':String(index === stage),
          'aria-controls':'stage-control-panel',
          disabled:!unlocked,
          onClick:() => onStage(index),
          title:unlocked ? `Open ${item.name} stage` : `Complete ${STAGES[Math.max(0, index - 1)].name} first`
        },
        el('span', { className:'stage-tab-number', text:done ? '✓' : String(index + 1) }),
        el('span', { text:item.short })
        );
      })
  );
}

function stageProgress(round, partial, stage) {
  const status = stageReadiness(round, partial, stage);
  return el('div', { className:`stage-progress ${status.complete ? 'ready' : ''}` },
    el('div', { className:'stage-progress-row' },
      el('span', { text:status.complete ? 'Stage verified' : 'Stage diagnostic' }),
      el('strong', { text:`${Math.round(status.progress * 100)}%` })
    ),
    el('div', { className:'progress-track' }, el('div', { className:'progress-fill', style:`width:${Math.round(status.progress * 100)}%` })),
    el('p', { className:'sr-only', text:status.message }),
    el('div', { className:`callout compact ${status.complete ? '' : 'info'}`, text:status.message })
  );
}

function makeDistractor(assignment) {
  const replacements = [
    ['+1', '-1'],
    ['-1', '+1'],
    ['^2', '^3'],
    ['²', '³'],
    ['^3', '^2'],
    ['³', '²'],
    ['\\sin', '\\cos'],
    ['sin', 'cos'],
    ['ReLU', 'sigmoid'],
    ['Σᵢ', 'maxᵢ'],
    ['Σ', 'mean'],
    ['3x', 'x/3'],
    ['Ax', 'xA'],
    ['g(u)', 'g(x)'],
    ['u+v', 'u-v'],
    ['uv', 'u+v']
  ];
  for (const [from, to] of replacements) {
    if (assignment.includes(from)) return assignment.replace(from, to);
  }
  const [left] = assignment.split('=');
  return `${left}=0`;
}

function assignmentPanel(round, partial, onPatch) {
  const selected = new Set(partial.assignments ?? []);
  const choices = el('div', { className:'decomposition-list' });
  (round.assignments ?? []).forEach((assignment, index) => {
    const options = index % 2 === 0 ? [assignment, makeDistractor(assignment)] : [makeDistractor(assignment), assignment];
    choices.append(el('div', { className:'decomposition-row' },
      el('span', { className:'field-label', text:`Operation ${index + 1}` }),
      el('div', { className:'chip-grid' }, options.map(choice => el('label', { className:'choice-chip' },
        el('input', {
          type:'checkbox',
          checked:selected.has(choice) ? '' : null,
          onChange:event => {
            if (event.target.checked) selected.add(choice);
            else selected.delete(choice);
            onPatch({ assignments:[...selected] });
          }
        }),
        el('span', { text:choice })
      )))
    ));
  });

  return el('section', { className:'step-panel', id:'stage-control-panel' },
    el('div', {}, el('span', { className:'kicker', text:'Expression decomposer' }), el('h2', { text:'Choose one operation per node' })),
    el('p', { text:'Select every assignment that preserves the nested expression. Do not select a tile merely because it looks algebraically similar.' }),
    choices,
    el('div', { className:'callout' }, el('strong', { text:'Circuit rule: ' }), 'work from the inside out, and keep the original order of operations.')
  );
}

function connectionPanel(round, partial, onPatch) {
  if (!round.graph) {
    return el('section', { className:'step-panel', id:'stage-control-panel' },
      el('span', { className:'kicker', text:'Shape circuit' }),
      el('h2', { text:'Topology is supplied by the derivative blocks' }),
      el('p', { className:'callout info', text:'This round starts at the propagation bench because its goal is block order and shape compatibility.' })
    );
  }

  const connections = new Set(partial.connections ?? []);
  const from = el('select', { className:'control-select', 'aria-label':'Source node' },
    el('option', { value:'', text:'From node…' }),
    round.graph.nodes.map(node => el('option', { value:node.id, text:`${node.id} · ${node.label}` }))
  );
  const to = el('select', { className:'control-select', 'aria-label':'Destination node' },
    el('option', { value:'', text:'To node…' }),
    round.graph.nodes.map(node => el('option', { value:node.id, text:`${node.id} · ${node.label}` }))
  );

  const ledger = el('div', { className:'decomposition-list', 'aria-label':'Current dependency wires' });
  if (!connections.size) ledger.append(el('div', { className:'callout info', text:'No wires connected yet. Select a source and destination, then connect them.' }));
  connections.forEach(connection => {
    ledger.append(el('div', { className:'decomposition-tile' },
      el('span', {}, el('strong', { text:connection.replace('->', ' → ') }), el('small', { text:' forward dependency' })),
      el('button', { className:'btn ghost small', text:'Remove', onClick:() => {
        connections.delete(connection);
        onPatch({ connections:[...connections] });
      } })
    ));
  });

  return el('section', { className:'step-panel', id:'stage-control-panel' },
    el('div', {}, el('span', { className:'kicker', text:'Circuit builder' }), el('h2', { text:'Connect the forward dependency wires' })),
    el('p', { text:'The operation nodes are supplied. Your job is to wire the dependency direction correctly.' }),
    el('div', { className:'chip-grid', 'aria-label':'Available operation gates' },
      CIRCUIT_GATES.slice(0, 12).map(gate => el('span', { className:'token gate-token', text:gate.label }))
    ),
    el('div', { className:'connection-controls' },
      from,
      to,
      el('div', { className:'button-row' },
        el('button', { className:'btn blue small', text:'Connect nodes', onClick:() => {
          if (from.value && to.value && from.value !== to.value) {
            connections.add(`${from.value}->${to.value}`);
            onPatch({ connections:[...connections] });
          }
        } }),
        el('button', { className:'btn ghost small', text:'Reset wires', onClick:() => onPatch({ connections:[] }) })
      )
    ),
    ledger,
    el('div', { className:'callout info' }, el('strong', { text:'Direction check: ' }), 'forward wires point from inputs toward outputs. A cycle is never a valid feed-forward circuit.')
  );
}

function derivativePanel(round, partial, onPatch) {
  if (!round.graph) {
    return el('section', { className:'step-panel', id:'stage-control-panel' },
      el('span', { className:'kicker', text:'Derivative blocks' }),
      el('h2', { text:'Inspect the supplied Jacobian dimensions' }),
      el('p', { className:'callout info', text:'Each block describes an immediate output with respect to an immediate input.' })
    );
  }

  const assigned = { ...(partial.derivativeMap ?? {}) };
  const expectedExpressions = round.graph.edges.map(edge => edge.localDerivative.expression);
  const distractors = round.graph.nodes.map(node => node.label).slice(0, 3);
  const choices = [...new Set([...expectedExpressions, '1', '0', ...distractors])];
  const ledger = el('div', { className:'decomposition-list' });

  round.graph.edges.forEach(edge => {
    const shape = edge.localDerivative?.shape;
    const select = el('select', {
      className:'control-select',
      'aria-label':`Local derivative from ${edge.from} to ${edge.to}`,
      onChange:event => {
        assigned[edgeKey(edge)] = event.target.value;
        onPatch({ derivativeMap:assigned, derivatives:Object.values(assigned).filter(Boolean) });
      }
    },
    el('option', { value:'', text:'Choose local derivative…' }),
    choices.map(choice => el('option', { value:choice, text:choice, selected:assigned[edgeKey(edge)] === choice ? '' : null }))
    );

    ledger.append(el('div', { className:'decomposition-tile' },
      el('span', {},
        el('strong', { text:`${edge.from} → ${edge.to}` }),
        el('small', { text:`  ∂${edge.to}/∂${edge.from}` }),
        shape ? el('span', { className:'badge info', text:`${shape.rows}×${shape.columns}` }) : null
      ),
      select
    ));
  });

  return el('section', { className:'step-panel', id:'stage-control-panel' },
    el('div', {}, el('span', { className:'kicker', text:'Local derivative labeller' }), el('h2', { text:'Attach one immediate sensitivity per wire' })),
    el('p', { text:'The numerator is the destination node and the denominator is the source node. A forward value is never a substitute for the wire’s local derivative.' }),
    ledger,
    el('div', { className:'callout warning' }, el('strong', { text:'Keep separate: ' }), 'node value, local derivative, and accumulated backward gradient are three different fields.')
  );
}

function pathCandidates(round) {
  const expected = round.expectedPaths ?? [];
  const candidates = [...expected];
  if (expected[0]?.length > 2) candidates.push([expected[0][0], expected[0].at(-1)]);
  if (expected[0]?.length > 1) candidates.push([...expected[0]].reverse());
  const unique = new Map(candidates.map(path => [pathKey(path), path]));
  return [...unique.values()];
}

function pathPanel(round, partial, onPatch) {
  const selected = new Set((partial.paths ?? []).map(pathKey));
  const expectedKeys = new Set((round.expectedPaths ?? []).map(pathKey));
  const ledger = el('div', { className:'path-ledger' });
  pathCandidates(round).forEach((path, index) => {
    const key = pathKey(path);
    ledger.append(el('label', { className:`path-card ${selected.has(key) ? 'selected' : ''}` },
      el('input', {
        type:'checkbox',
        checked:selected.has(key) ? '' : null,
        onChange:event => {
          if (event.target.checked) selected.add(key);
          else selected.delete(key);
          onPatch({ paths:[...selected] });
        }
      }),
      el('span', {},
        el('strong', { text:`Candidate ${index + 1}: ` }),
        path.join(' → '),
        expectedKeys.has(key) ? el('small', { className:'sr-only', text:' valid dependency path' }) : null
      ),
      el('code', { text:`${Math.max(0, path.length - 1)} wires` })
    ));
  });

  const multiple = (round.expectedPaths?.length ?? 0) > 1;
  return el('section', { className:'step-panel', id:'stage-control-panel' },
    el('div', {}, el('span', { className:'kicker', text:'Path tracer' }), el('h2', { text:`Trace every route from ${round.inputId ?? 'x'} to ${round.outputId ?? 'y'}` })),
    el('p', { text:'A valid route follows forward dependency direction and includes every intermediate operation on that route.' }),
    ledger,
    el('div', { className:multiple ? 'callout warning' : 'callout info', text:multiple ? 'Keep the routes separate until each serial derivative product is complete.' : 'This circuit has one serial dependency route.' })
  );
}

function matrixGrid(matrix, label) {
  const grid = el('div', { className:'matrix-grid-small', style:`grid-template-columns:repeat(${matrix[0].length}, 2rem)`, 'aria-label':`${label} matrix` });
  matrix.flat().forEach(value => grid.append(el('span', { className:'matrix-cell-small', text:String(value) })));
  return grid;
}

function matrixStation(round) {
  return el('div', { className:'matrix-station' },
    el('strong', { text:'Ordered matrix product' }),
    el('p', { text:'Validate the order first. Then calculate one row-by-column entry at a time.' }),
    el('div', { className:'matrix-row' }, matrixGrid(round.matrices[0], 'A'), el('span', { className:'operator-slot', text:'×' }), matrixGrid(round.matrices[1], 'B'))
  );
}

function serialProductBuilder(round, partial, onPatch) {
  const factors = partial.factorOrder ?? [];
  const expected = expectedSerialFactors(round);
  const available = [...new Set([...expected, ...[...expected].reverse(), '1'])];
  const workspace = el('div', { className:`chain-builder ${factors.length ? '' : 'empty'}` });
  if (!factors.length) workspace.append(el('span', { text:'Select blocks in output-to-input order.' }));
  else factors.forEach((factor, index) => {
    workspace.append(el('button', {
      className:'derivative-block',
      title:`Remove ${factor}`,
      'aria-label':`Remove derivative block ${factor} from position ${index + 1}`,
      onClick:() => onPatch({ factorOrder:factors.filter((_, item) => item !== index), productBuilt:factors.length > 1 })
    }, factor));
    if (index < factors.length - 1) workspace.append(el('span', { className:'operator-slot', text:'×', 'aria-hidden':'true' }));
  });

  return el('div', { className:'stack' },
    el('div', {}, el('span', { className:'field-label', text:'Available local derivative blocks' }), el('div', { className:'chip-grid' }, available.map(factor => el('button', {
      className:'derivative-block',
      onClick:() => onPatch({ factorOrder:[...factors, factor], productBuilt:true }),
      'aria-label':`Append derivative block ${factor}`
    }, factor)))),
    el('div', {}, el('span', { className:'field-label', text:'Ordered multiplication workspace' }), workspace),
    factors.length ? el('button', { className:'btn ghost small', text:'Clear derivative chain', onClick:() => onPatch({ factorOrder:[], productBuilt:false }) }) : null
  );
}

function parallelProductBuilder(round, partial, onPatch) {
  const products = { ...(partial.pathProducts ?? {}) };
  const candidates = [...new Set([...(round.expectedProduct ?? []), '0', (round.expectedProduct ?? []).join(' × ')])];
  const builder = el('div', { className:'path-product-builder' });
  (round.expectedPaths ?? []).forEach((path, index) => {
    const key = pathKey(path);
    const select = el('select', {
      className:'control-select',
      'aria-label':`Derivative contribution for route ${index + 1}`,
      onChange:event => {
        products[key] = event.target.value;
        onPatch({ pathProducts:products, productBuilt:Object.values(products).filter(Boolean).length === round.expectedPaths.length });
      }
    },
    el('option', { value:'', text:'Choose completed route product…' }),
    candidates.map(candidate => el('option', { value:candidate, text:candidate, selected:products[key] === candidate ? '' : null }))
    );
    builder.append(el('div', { className:'path-product-row' },
      el('div', { className:'path-product-head' }, el('strong', { text:`Route ${index + 1}` }), el('code', { text:path.join(' → ') })),
      select
    ));
  });
  return builder;
}

function resultChecklist(result) {
  if (!result?.checks) return null;
  const labels = {
    decomposition:'Decomposition',
    graphConnections:'Forward wires',
    localDerivatives:'Local derivatives',
    pathDetection:'Dependency paths',
    pathMultiplication:'Path products',
    accumulation:'Gradient accumulation',
    incomingGradient:'Incoming gradient'
  };
  return el('ul', {}, Object.entries(result.checks).map(([key, value]) => el('li', { text:`${value ? '✓' : '○'} ${labels[key] ?? key}` })));
}

function resultFeedback(round, result) {
  if (!result) return null;
  return el('div', { className:`card feedback ${result.allCorrect ? 'good' : 'bad'}`, role:'status' },
    el('h3', { text:result.allCorrect ? 'Circuit complete' : 'First circuit fault located' }),
    el('p', { text:result.feedback }),
    resultChecklist(result),
    el('p', { text:result.allCorrect ? round.explanation : `Diagnostic category: ${result.misconception?.replaceAll('-', ' ') ?? 'incomplete reasoning'}. Repair that stage and retry.` }),
    result.score ? el('span', { className:'feedback-score', text:`${result.score.total} signal points` }) : null
  );
}

function propagationPanel(round, partial, onPatch, onSubmit, onHint, result) {
  const finalInput = el('input', {
    value:partial.finalAnswer ?? '',
    'aria-label':'Final derivative answer',
    placeholder:round.taskType === 'shape' ? 'rows × columns' : round.taskType === 'matrix' ? '14,2;15,3' : 'Enter final derivative',
    onInput:event => onPatch({ finalAnswer:event.target.value })
  });
  const explanation = el('textarea', {
    rows:'3',
    'aria-label':'Explain the backward circuit',
    placeholder:'Explain what multiplies along a route and what accumulates across routes…',
    onInput:event => onPatch({ explanation:event.target.value })
  });
  explanation.value = partial.explanation ?? '';

  const panel = el('section', { className:'step-panel', id:'stage-control-panel' },
    el('div', {}, el('span', { className:'kicker', text:'Backward propagation bench' }), el('h2', { text:'Compose the returning gradient' })),
    el('p', { text:'Build each route in numerator-layout order. The derivative nearest the final output belongs on the left.' })
  );

  if (round.incomingGradient) {
    panel.append(el('div', { className:'incoming-gradient' },
      el('span', { className:'gradient-token', text:'g', 'aria-hidden':'true' }),
      el('div', {},
        el('strong', { text:'Incoming gradient injector' }),
        el('p', { text:'The later loss sends g = ∂L/∂y into this local circuit.' }),
        el('button', {
          className:`btn small ${partial.injectedGradient ? 'green' : 'blue'}`,
          onClick:() => onPatch({ injectedGradient:!partial.injectedGradient }),
          'aria-pressed':String(Boolean(partial.injectedGradient)),
          text:partial.injectedGradient ? 'g injected ✓' : 'Inject g'
        })
      )
    ));
  }

  if (round.taskType === 'shape') {
    panel.append(
      el('span', { className:'field-label', text:'Snap the Jacobian blocks' }),
      el('div', { className:'shape-snap' }, round.shapeBlocks.map((block, index) => [
        index ? el('span', { className:'operator-slot', text:'×', 'aria-hidden':'true' }) : null,
        el('div', { className:'shape-block', text:`${block.label}\n${block.rows}×${block.columns}` })
      ]).flat())
    );
  } else if (round.taskType === 'matrix') {
    panel.append(matrixStation(round));
  } else if ((round.expectedPaths?.length ?? 0) > 1) {
    panel.append(el('span', { className:'field-label', text:'Complete each route product' }), parallelProductBuilder(round, partial, onPatch));
    const selected = round.expectedPaths.map(path => partial.pathProducts?.[pathKey(path)] || 'route not built');
    panel.append(el('div', { className:'junction' },
      el('div', { className:'path-card', text:selected[0] }),
      el('button', {
        className:`junction-icon ${partial.accumulated ? 'active' : ''}`,
        onClick:() => onPatch({ accumulated:!partial.accumulated }),
        'aria-pressed':String(Boolean(partial.accumulated)),
        'aria-label':'Add completed path contributions',
        text:'+'
      }),
      el('div', { className:'path-card', text:selected[1] ?? 'additional route' })
    ));
  } else {
    panel.append(serialProductBuilder(round, partial, onPatch));
  }

  panel.append(
    el('div', { className:'form-field' }, el('label', { text:round.taskType === 'shape' ? 'Final Jacobian shape' : round.taskType === 'matrix' ? 'Ordered matrix product' : 'Final derivative' }), finalInput),
    el('div', { className:'form-field' }, el('label', { text:'Explain the backward circuit' }), explanation),
    el('div', { className:'button-row' },
      el('button', { className:'btn accent', onClick:onSubmit, text:'Run circuit diagnostics' }),
      el('button', { className:'btn secondary', onClick:onHint, text:'Reveal one hint' })
    )
  );

  if (result) panel.append(resultFeedback(round, result));
  return panel;
}

function sessionCard(round, game) {
  const level = LEVEL_BY_NUMBER[round.level];
  return el('aside', { className:'session-card', 'aria-label':'Current round summary' },
    el('div', {}, el('span', { className:'kicker', text:'Control console' }), el('h3', { text:level?.objective ?? round.objective ?? 'Complete the circuit.' })),
    el('div', { className:'session-stats' },
      el('div', { className:'session-stat' }, el('strong', { text:String(game.progress.score) }), el('small', { text:'points' })),
      el('div', { className:'session-stat' }, el('strong', { text:String(game.progress.currentStreak) }), el('small', { text:'streak' })),
      el('div', { className:'session-stat' }, el('strong', { text:`${game.progress.completedLevels.length}/22` }), el('small', { text:'levels' }))
    ),
    el('div', { className:'callout compact info' }, el('strong', { text:'Circuit law: ' }), 'multiply along one route; add completed contributions where routes meet.')
  );
}

function shapeWorkbench(round) {
  const content = round.taskType === 'matrix'
    ? el('div', { className:'matrix-station' }, el('strong', { text:'Matrix calculation bay' }), el('p', { text:'The requested product is AB. Shape and semantic order are fixed before arithmetic begins.' }), matrixStation(round))
    : el('div', { className:'stack' },
      el('span', { className:'kicker', text:'Derivative block lane' }),
      el('h2', { text:'Check the interfaces before multiplying' }),
      el('p', { text:'Matching inner dimensions represent the shared intermediate variable. The exposed outer dimensions become the final derivative shape.' }),
      el('div', { className:'shape-snap' }, round.shapeBlocks?.map((block, index) => [
        index ? el('span', { className:'operator-slot', text:'×' }) : null,
        el('div', { className:'shape-block', text:`${block.label} · ${block.rows}×${block.columns}` })
      ]).flat()),
      el('div', { className:'callout info', text:'Dimensions are necessary, but in a derivative chain the intermediate variable labels must also match.' })
    );
  return el('section', { className:'card stack' }, content);
}

function missionCard(round, onMode) {
  const { start, end } = roundStageRange(round);
  const focusBadge = start !== 0 || end !== 4
    ? `${STAGES[start].name} focus`
    : null;
  return el('section', { className:'card mission-card' },
    el('div', { className:'mission-top' },
      el('div', { className:'mission-title-row' },
        el('span', { className:'mission-level-number', text:String(round.level), 'aria-label':`Level ${round.level}` }),
        el('div', {},
          el('span', { className:'kicker', text:`Level ${round.level} · ${round.mode}` }),
          el('h1', { text:round.title }),
          el('p', { className:'scenario-title', text:round.scenarioTitle ?? 'Circuit assignment' }),
          el('p', { className:'mission-objective', text:round.objective ?? '' })
        )
      ),
      el('div', { className:'mission-meta' },
        el('span', { className:'badge info', text:'Numerator layout' }),
        el('span', { className:'badge', text:focusBadge ?? (round.taskType === 'shape' ? 'Shape round' : round.taskType === 'matrix' ? 'Matrix round' : 'Graph round') })
      )
    ),
    el('div', { className:'assignment-expression equation', text:`\\[${round.expression}\\]` }),
    el('div', { className:'round-mode-strip', 'aria-label':'Round mode' },
      el('span', { text:'Mode' }),
      ['guided', 'generated', 'repair', 'mastery'].map(mode => el('button', {
        className:'btn small secondary',
        'aria-selected':String(round.mode === mode),
        onClick:() => onMode(mode),
        text:mode[0].toUpperCase() + mode.slice(1)
      }))
    )
  );
}

export function createCircuitLabView({
  round,
  game,
  partial,
  stage,
  onPatch,
  onStage,
  onSubmit,
  onHint,
  result,
  hint,
  onSelectLevel,
  onNext,
  onMode
}) {
  const layout = el('div', { className:'game-layout' });
  layout.append(levelSidebar(round.level, game.progress.completedLevels, onSelectLevel));

  const main = el('div', { className:'game-main' });
  main.append(missionCard(round, onMode));

  const workspace = el('div', { className:'lab-workspace' });
  const canvas = el('div', { className:'workspace-canvas stack' });
  if (round.graph) {
    const graph = {
      ...round.graph,
      edges:stage === 0
        ? []
        : stage === 1
          ? round.graph.edges.filter(edge => (partial.connections ?? []).includes(edgeKey(edge)))
          : round.graph.edges
    };
    const graphDescription = stage === 0
      ? `Nodes ${round.graph.nodes.map(node => node.id).join(', ')} are staged. No dependency wires have been connected yet.`
      : stage === 1
        ? `The visible wires are the learner's current forward connections. ${partial.connections?.length ?? 0} of ${round.graph.edges.length} expected wires are present.`
        : undefined;
    canvas.append(createCircuitGraph(graph, {
      showDerivatives:stage >= 2,
      showGradients:stage >= 4,
      graphDescription,
      gradientNumerator:round.incomingGradient ? 'L' : (round.outputId ?? round.graph.nodes.find(node => node.role === 'output')?.id ?? 'y')
    }));
  } else {
    canvas.append(shapeWorkbench(round));
  }
  if (hint) canvas.append(el('aside', { className:'card hint-card', role:'note' }, el('strong', { text:'Diagnostic hint: ' }), hint));
  if (result?.allCorrect) canvas.append(el('button', { className:'btn green', onClick:onNext, text:round.level === 22 ? 'Replay certification' : 'Next circuit →' }));

  const consoleArea = el('div', { className:'control-console' }, sessionCard(round, game));
  const currentPanel = stage === 0
    ? assignmentPanel(round, partial, onPatch)
    : stage === 1
      ? connectionPanel(round, partial, onPatch)
      : stage === 2
        ? derivativePanel(round, partial, onPatch)
        : stage === 3
          ? pathPanel(round, partial, onPatch)
          : propagationPanel(round, partial, onPatch, onSubmit, onHint, result);

  const status = stageReadiness(round, partial, stage);
  const { start, end } = roundStageRange(round);
  const focused = start !== 0 || end !== 4;
  const focusPosition = stage - start + 1;
  const focusLength = end - start + 1;
  const consoleCard = el('section', { className:'card console-card' },
    el('div', { className:'console-card-head' }, el('span', { className:'kicker', text:focused ? `Guided focus ${focusPosition} of ${focusLength} · Stage ${stage + 1}` : `Stage ${stage + 1} of 5` }), el('h2', { text:STAGES[stage].name })),
    stageTabs(round, partial, stage, onStage),
    stageProgress(round, partial, stage),
    currentPanel
  );
  if (result && stage < 4) consoleCard.append(resultFeedback(round, result));
  if (stage < end) {
    consoleCard.append(el('div', { className:'console-navigation' },
      el('button', { className:'btn secondary', disabled:stage === start, onClick:() => onStage(stage - 1), text:'← Previous' }),
      el('button', { className:'btn accent', disabled:!status.complete, onClick:() => onStage(stage + 1), text:status.complete ? 'Next stage →' : 'Complete stage' })
    ));
  } else if (end < 4) {
    consoleCard.append(el('div', { className:'console-navigation' },
      el('button', { className:'btn accent', disabled:!status.complete || result?.allCorrect, onClick:onSubmit, text:result?.allCorrect ? 'Focused stage complete ✓' : status.complete ? 'Complete focused stage' : 'Complete stage' })
    ));
  }
  consoleArea.append(consoleCard);

  workspace.append(canvas, consoleArea);
  main.append(workspace);
  layout.append(main);
  return layout;
}

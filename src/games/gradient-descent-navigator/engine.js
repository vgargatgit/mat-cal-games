export const LANDSCAPES = [
  { id: 'bowl', title: 'Simple Bowl', story: 'The rover wakes in a smooth basin.', lesson: 'The gradient arrow points uphill. Move in the negative-gradient direction.', start: [3, -2], learningRate: .35, target: .04, contours: [1, 1], loss: ([x, y]) => .5 * (x * x + y * y), gradient: ([x, y]) => [x, y] },
  { id: 'valley', title: 'Narrow Valley', story: 'One direction is much steeper than the other.', lesson: 'One learning rate scales every coordinate, even when the landscape has different curvature.', start: [-3, 1.8], learningRate: .12, target: .35, contours: [1, 3], loss: ([x, y]) => .5 * (x * x + 8 * y * y), gradient: ([x, y]) => [x, 8 * y] },
  { id: 'cliff', title: 'Steep Cliff', story: 'A sharp wall amplifies one gradient component.', lesson: 'Steep curvature makes large steps risky.', start: [1.8, 1.2], learningRate: .16, target: .08, contours: [2.5, 1], loss: ([x, y]) => .5 * (5 * x * x + y * y), gradient: ([x, y]) => [5 * x, y] },
  { id: 'plateau', title: 'Plateau', story: 'Near the center, the terrain becomes almost flat.', lesson: 'A tiny gradient can mean slow progress; it does not prove the minimum has been reached.', start: [2, -1.5], learningRate: .32, target: .025, contours: [1, 1], loss: ([x, y]) => .02 * ((x * x + y * y) ** 2), gradient: ([x, y]) => { const scale = .08 * (x * x + y * y); return [scale * x, scale * y]; } },
  { id: 'ravine', title: 'Twisting Ravine', story: 'Fog hides whether this low pocket is the best point on the whole mountain.', lesson: 'A gradient describes nearby slope, not the entire landscape. A low pocket may be a local minimum; a careful η still prevents ricocheting across narrow walls.', start: [-3, 2.5], learningRate: .07, target: .35, contours: [1, 4], loss: ([x, y]) => { const d = y - .5 * x; return .5 * x * x + 6 * d * d; }, gradient: ([x, y]) => { const d = y - .5 * x; return [x - 6 * d, 12 * d]; } },
  { id: 'overshoot', title: 'Overshooting Challenge', story: 'The optimizer is powerful enough to leap across the basin.', lesson: 'Too large a learning rate oscillates or diverges; too small wastes steps.', start: [2.5, -1.5], learningRate: .18, initialRate: .82, target: .08, contours: [2, 1], loss: ([x, y]) => .5 * (4 * x * x + y * y), gradient: ([x, y]) => [4 * x, y] },
];

export function gradientStep(landscape, point, learningRate, direction = 'downhill') {
  const sign = direction === 'downhill' ? -1 : 1;
  const gradient = landscape.gradient(point);
  return point.map((value, index) => value + sign * learningRate * gradient[index]);
}

export function runDescent(landscape, point, learningRate, steps = 1, direction = 'downhill') {
  const path = [point.slice()];
  for (let index = 0; index < steps; index += 1) path.push(gradientStep(landscape, path.at(-1), learningRate, direction));
  return path;
}

export function converged(landscape, point) { return landscape.loss(point) <= landscape.target; }
export function finitePoint(point) { return point.every((value) => Number.isFinite(value) && Math.abs(value) < 1e4); }

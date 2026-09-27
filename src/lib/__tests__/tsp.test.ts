import { heldKarp, nearestNeighborTwoOpt, pathCost, solvePath, type PathProblem } from '../tsp';

function randomMatrix(n: number, seed: number, symmetric = false): number[][] {
  let x = seed;
  const rand = () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      m[i][j] = symmetric && j < i ? m[j][i] : Math.round(rand() * 100) + 1;
    }
  }
  return m;
}

function bruteForce(cost: number[][], { start, visit, end }: PathProblem): number {
  let best = Infinity;
  const permute = (arr: number[], prefix: number[]) => {
    if (arr.length === 0) {
      best = Math.min(best, pathCost([start, ...prefix], cost, end));
      return;
    }
    arr.forEach((v, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...prefix, v]));
  };
  permute(visit, []);
  return best;
}

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

const isValidOrder = (order: number[], { start, visit }: PathProblem) =>
  order[0] === start && order.length === visit.length + 1 && [...order.slice(1)].sort().join() === [...visit].sort().join();

describe('heldKarp', () => {
  const cases: [string, number, (n: number) => PathProblem][] = [
    ['열린 경로', 6, (n) => ({ start: 0, visit: range(1, n), end: null })],
    ['출발지 복귀', 7, (n) => ({ start: 0, visit: range(1, n), end: 0 })],
    ['도착 거점에서 시작, 복귀 거점에서 끝', 8, (n) => ({ start: 1, visit: range(2, n - 1), end: n - 1 })],
    ['방문지 1곳', 3, () => ({ start: 0, visit: [2], end: 1 })],
  ];
  it.each(cases)('%s: 완전탐색과 같은 최적값', (_, n, make) => {
    for (let seed = 1; seed <= 5; seed++) {
      const cost = randomMatrix(n, seed * 31 + n);
      const problem = make(n);
      const sol = heldKarp(cost, problem);
      expect(isValidOrder(sol.order, problem)).toBe(true);
      expect(sol.cost).toBeCloseTo(bruteForce(cost, problem));
      expect(pathCost(sol.order, cost, problem.end)).toBeCloseTo(sol.cost);
    }
  });

  it('방문지가 없으면 start → end 비용', () => {
    const cost = randomMatrix(3, 1);
    expect(heldKarp(cost, { start: 0, visit: [], end: 2 })).toMatchObject({ order: [0], cost: cost[0][2] });
  });
});

describe('nearestNeighborTwoOpt', () => {
  it('유효한 순서를 반환하고 end까지 비용을 계산한다', () => {
    const cost = randomMatrix(15, 7, true);
    for (const end of [null, 0, 14]) {
      const problem = { start: 0, visit: range(1, 14), end };
      const sol = nearestNeighborTwoOpt(cost, problem);
      expect(isValidOrder(sol.order, problem)).toBe(true);
      expect(pathCost(sol.order, cost, end)).toBeCloseTo(sol.cost);
    }
  });

  it('작은 문제에서 최적해에 근접한다', () => {
    const cost = randomMatrix(8, 99, true);
    const problem = { start: 0, visit: range(1, 8), end: null };
    expect(nearestNeighborTwoOpt(cost, problem).cost).toBeLessThanOrEqual(heldKarp(cost, problem).cost * 1.3);
  });
});

describe('solvePath', () => {
  it('방문지 10곳 이하는 Held-Karp, 초과는 근사 알고리즘', () => {
    expect(solvePath(randomMatrix(11, 3), { start: 0, visit: range(1, 11), end: null }).method).toBe('held-karp');
    expect(solvePath(randomMatrix(12, 3), { start: 0, visit: range(1, 12), end: null }).method).toBe(
      'nearest-neighbor+2-opt',
    );
  });
});

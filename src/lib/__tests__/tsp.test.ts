import { heldKarp, nearestNeighborTwoOpt, pathCost, solveTsp } from '../tsp';

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

function bruteForce(cost: number[][], returnToStart: boolean): number {
  const rest = cost.map((_, i) => i).slice(1);
  let best = Infinity;
  const permute = (arr: number[], prefix: number[]) => {
    if (arr.length === 0) {
      best = Math.min(best, pathCost([0, ...prefix], cost, returnToStart));
      return;
    }
    arr.forEach((v, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...prefix, v]));
  };
  permute(rest, []);
  return best;
}

const isValidOrder = (order: number[], n: number) =>
  order[0] === 0 && order.length === n && new Set(order).size === n;

describe('heldKarp', () => {
  it.each([
    [2, false],
    [4, false],
    [6, true],
    [7, false],
    [8, true],
  ])('n=%i returnToStart=%s 완전탐색과 같은 최적값', (n, returnToStart) => {
    for (let seed = 1; seed <= 5; seed++) {
      const cost = randomMatrix(n, seed * 31 + n);
      const sol = heldKarp(cost, { returnToStart });
      expect(isValidOrder(sol.order, n)).toBe(true);
      expect(sol.cost).toBeCloseTo(bruteForce(cost, returnToStart));
      expect(pathCost(sol.order, cost, returnToStart)).toBeCloseTo(sol.cost);
    }
  });
});

describe('nearestNeighborTwoOpt', () => {
  it('유효한 순서를 반환하고 복귀 여부에 따라 비용을 계산한다', () => {
    const cost = randomMatrix(15, 7, true);
    for (const returnToStart of [false, true]) {
      const sol = nearestNeighborTwoOpt(cost, { returnToStart });
      expect(isValidOrder(sol.order, 15)).toBe(true);
      expect(pathCost(sol.order, cost, returnToStart)).toBeCloseTo(sol.cost);
    }
  });

  it('작은 문제에서 최적해에 근접한다', () => {
    const cost = randomMatrix(8, 99, true);
    const approx = nearestNeighborTwoOpt(cost, { returnToStart: false });
    const exact = heldKarp(cost, { returnToStart: false });
    expect(approx.cost).toBeLessThanOrEqual(exact.cost * 1.3);
  });
});

describe('solveTsp', () => {
  it('장소 10곳 이하는 Held-Karp, 초과는 근사 알고리즘', () => {
    expect(solveTsp(randomMatrix(11, 3), { returnToStart: false }).method).toBe('held-karp');
    expect(solveTsp(randomMatrix(12, 3), { returnToStart: false }).method).toBe('nearest-neighbor+2-opt');
  });

  it('출발지만 있으면 [0]', () => {
    expect(solveTsp([[0]], { returnToStart: true }).order).toEqual([0]);
  });
});

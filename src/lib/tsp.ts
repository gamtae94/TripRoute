/**
 * 출발점 고정 경로 순서 최적화 (TSP 변형).
 *
 * - cost[i][j]: 노드 i → j 이동 비용 (비대칭 허용)
 * - start: 출발 노드, visit: 반드시 한 번씩 방문할 노드들
 * - end: 마지막에 도착해야 하는 노드 (복귀 시 출발지, 거점 등). null이면 마지막 방문지에서 끝남
 * - 방문 노드 수가 EXACT_LIMIT 이하면 Held-Karp로 정확해,
 *   초과하면 Nearest Neighbor + 2-opt로 근사해를 구한다.
 */

export const EXACT_LIMIT = 10;

export interface PathProblem {
  start: number;
  visit: number[];
  end: number | null;
}

export interface PathSolution {
  /** start로 시작하고 visit을 모두 포함한 순서 (end는 포함하지 않음) */
  order: number[];
  /** end까지 포함한 총 비용 */
  cost: number;
  method: 'held-karp' | 'nearest-neighbor+2-opt';
}

export function pathCost(order: number[], cost: number[][], end: number | null): number {
  let total = 0;
  for (let k = 0; k < order.length - 1; k++) total += cost[order[k]][order[k + 1]];
  if (end !== null) total += cost[order[order.length - 1]][end];
  return total;
}

export function solvePath(cost: number[][], problem: PathProblem): PathSolution {
  if (problem.visit.length <= EXACT_LIMIT) return heldKarp(cost, problem);
  return nearestNeighborTwoOpt(cost, problem);
}

/** Held-Karp 동적계획법. O(2^m · m²), m = 방문 노드 수 */
export function heldKarp(cost: number[][], { start, visit, end }: PathProblem): PathSolution {
  const m = visit.length;
  if (m === 0) return { order: [start], cost: end === null ? 0 : cost[start][end], method: 'held-karp' };

  const full = (1 << m) - 1;
  const dp = new Float64Array((1 << m) * m).fill(Infinity);
  const parent = new Int32Array((1 << m) * m).fill(-1);

  for (let j = 0; j < m; j++) dp[(1 << j) * m + j] = cost[start][visit[j]];

  for (let mask = 1; mask <= full; mask++) {
    for (let j = 0; j < m; j++) {
      if (!(mask & (1 << j))) continue;
      const cur = dp[mask * m + j];
      if (cur === Infinity) continue;
      for (let k = 0; k < m; k++) {
        if (mask & (1 << k)) continue;
        const next = mask | (1 << k);
        const cand = cur + cost[visit[j]][visit[k]];
        if (cand < dp[next * m + k]) {
          dp[next * m + k] = cand;
          parent[next * m + k] = j;
        }
      }
    }
  }

  let best = Infinity;
  let last = -1;
  for (let j = 0; j < m; j++) {
    const c = dp[full * m + j] + (end === null ? 0 : cost[visit[j]][end]);
    if (c < best) {
      best = c;
      last = j;
    }
  }

  const reversed: number[] = [];
  let mask = full;
  let j = last;
  while (j !== -1) {
    reversed.push(visit[j]);
    const p = parent[mask * m + j];
    mask &= ~(1 << j);
    j = p;
  }
  return { order: [start, ...reversed.reverse()], cost: best, method: 'held-karp' };
}

/** Nearest Neighbor로 초기해를 만든 뒤 2-opt로 개선 */
export function nearestNeighborTwoOpt(cost: number[][], { start, visit, end }: PathProblem): PathSolution {
  const remaining = new Set(visit);
  const order = [start];
  while (remaining.size > 0) {
    const cur = order[order.length - 1];
    let next = -1;
    for (const j of remaining) {
      if (next === -1 || cost[cur][j] < cost[cur][next]) next = j;
    }
    remaining.delete(next);
    order.push(next);
  }

  // 비대칭 행렬도 다루기 위해 구간 반전 후 전체 비용을 다시 계산한다 (장소 수가 적어 충분히 빠름)
  const n = order.length;
  let best = pathCost(order, cost, end);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        const c = pathCost(candidate, cost, end);
        if (c < best - 1e-9) {
          order.splice(0, n, ...candidate);
          best = c;
          improved = true;
        }
      }
    }
  }
  return { order, cost: best, method: 'nearest-neighbor+2-opt' };
}

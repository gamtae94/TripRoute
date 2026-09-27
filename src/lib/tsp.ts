/**
 * 출발지 고정 TSP 솔버.
 *
 * - cost[i][j]: 노드 i → j 이동 비용 (비대칭 허용). 노드 0은 출발지.
 * - 반환값: 0으로 시작하는 방문 순서 (복귀 시에도 마지막 0은 포함하지 않음).
 * - 방문 장소 수가 EXACT_LIMIT 이하면 Held-Karp로 정확해,
 *   초과하면 Nearest Neighbor + 2-opt로 근사해를 구한다.
 */

export const EXACT_LIMIT = 10;

export interface TspOptions {
  returnToStart: boolean;
}

export interface TspSolution {
  order: number[];
  cost: number;
  method: 'held-karp' | 'nearest-neighbor+2-opt';
}

export function pathCost(order: number[], cost: number[][], returnToStart: boolean): number {
  let total = 0;
  for (let k = 0; k < order.length - 1; k++) total += cost[order[k]][order[k + 1]];
  if (returnToStart && order.length > 1) total += cost[order[order.length - 1]][order[0]];
  return total;
}

export function solveTsp(cost: number[][], options: TspOptions): TspSolution {
  const n = cost.length;
  if (n <= 1) return { order: [0], cost: 0, method: 'held-karp' };
  if (n - 1 <= EXACT_LIMIT) return heldKarp(cost, options);
  return nearestNeighborTwoOpt(cost, options);
}

/** Held-Karp 동적계획법. O(2^m · m²), m = 방문 장소 수 */
export function heldKarp(cost: number[][], { returnToStart }: TspOptions): TspSolution {
  const m = cost.length - 1; // 출발지를 제외한 장소 수. 장소 k(0-based) = 노드 k+1
  const full = (1 << m) - 1;
  const dp = new Float64Array((1 << m) * m).fill(Infinity);
  const parent = new Int32Array((1 << m) * m).fill(-1);

  for (let j = 0; j < m; j++) dp[(1 << j) * m + j] = cost[0][j + 1];

  for (let mask = 1; mask <= full; mask++) {
    for (let j = 0; j < m; j++) {
      if (!(mask & (1 << j))) continue;
      const cur = dp[mask * m + j];
      if (cur === Infinity) continue;
      for (let k = 0; k < m; k++) {
        if (mask & (1 << k)) continue;
        const next = mask | (1 << k);
        const cand = cur + cost[j + 1][k + 1];
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
    const c = dp[full * m + j] + (returnToStart ? cost[j + 1][0] : 0);
    if (c < best) {
      best = c;
      last = j;
    }
  }

  const reversed: number[] = [];
  let mask = full;
  let j = last;
  while (j !== -1) {
    reversed.push(j + 1);
    const p = parent[mask * m + j];
    mask &= ~(1 << j);
    j = p;
  }
  return { order: [0, ...reversed.reverse()], cost: best, method: 'held-karp' };
}

/** Nearest Neighbor로 초기해를 만든 뒤 2-opt로 개선 */
export function nearestNeighborTwoOpt(cost: number[][], { returnToStart }: TspOptions): TspSolution {
  const n = cost.length;
  const visited = new Array<boolean>(n).fill(false);
  const order = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const cur = order[order.length - 1];
    let next = -1;
    for (let j = 1; j < n; j++) {
      if (!visited[j] && (next === -1 || cost[cur][j] < cost[cur][next])) next = j;
    }
    visited[next] = true;
    order.push(next);
  }

  // 비대칭 행렬도 다루기 위해 구간 반전 후 전체 비용을 다시 계산한다 (장소 수가 적어 충분히 빠름)
  let best = pathCost(order, cost, returnToStart);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        const c = pathCost(candidate, cost, returnToStart);
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

import { solveTsp } from './tsp';
import type {
  Criterion,
  LegInfo,
  Place,
  RouteLeg,
  RouteResult,
  RouteTotals,
  TransportMode,
  TravelMatrices,
} from '../types';

/** 구간별 수단 혼합 시 도보를 허용하는 최대 거리 (km) */
export const WALK_MAX_KM = 2;

const ALL_MODES: TransportMode[] = ['walk', 'transit', 'car'];

export interface OptimizeInput {
  /** nodes[0] = 출발지, 이후 방문 장소 (행렬 인덱스와 동일) */
  nodes: Place[];
  matrices: TravelMatrices;
  criterion: Criterion;
  defaultMode: TransportMode;
  allowMixedModes: boolean;
  returnToStart: boolean;
  /** true면 최적화 없이 사용자가 정한 순서를 그대로 사용 */
  keepManualOrder: boolean;
}

/** 기준별 구간 비용. 동률일 때는 시간이 짧은 쪽을 우선하도록 아주 작은 가중치를 더한다 */
export function legMetric(info: LegInfo, criterion: Criterion): number {
  const tieBreak = info.durationMin * 1e-6;
  switch (criterion) {
    case 'distance':
      return info.distanceKm + tieBreak;
    case 'time':
      return info.durationMin;
    case 'cost':
      return info.costKrw + tieBreak;
  }
}

export function candidateModes(defaultMode: TransportMode, allowMixedModes: boolean): TransportMode[] {
  return allowMixedModes ? ALL_MODES : [defaultMode];
}

/** 구간 i → j에 대해 기준상 가장 유리한 이동수단을 고른다 */
export function bestModeForLeg(
  matrices: TravelMatrices,
  i: number,
  j: number,
  criterion: Criterion,
  defaultMode: TransportMode,
  allowMixedModes: boolean,
): TransportMode {
  let best = defaultMode;
  let bestValue = Infinity;
  for (const mode of candidateModes(defaultMode, allowMixedModes)) {
    const info = matrices[mode][i][j];
    if (allowMixedModes && mode === 'walk' && info.distanceKm > WALK_MAX_KM) continue;
    const value = legMetric(info, criterion);
    if (value < bestValue) {
      bestValue = value;
      best = mode;
    }
  }
  return best;
}

export function sumTotals(legs: RouteLeg[]): RouteTotals {
  return legs.reduce<RouteTotals>(
    (acc, leg) => ({
      distanceKm: acc.distanceKm + leg.info.distanceKm,
      durationMin: acc.durationMin + leg.info.durationMin,
      costKrw: acc.costKrw + leg.info.costKrw,
    }),
    { distanceKm: 0, durationMin: 0, costKrw: 0 },
  );
}

export function optimizeRoute(input: OptimizeInput): RouteResult {
  const { nodes, matrices, criterion, defaultMode, allowMixedModes, returnToStart, keepManualOrder } = input;
  const n = nodes.length;

  const modeMatrix: TransportMode[][] = [];
  const costMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    modeMatrix.push([]);
    costMatrix.push([]);
    for (let j = 0; j < n; j++) {
      if (i === j) {
        modeMatrix[i].push(defaultMode);
        costMatrix[i].push(0);
        continue;
      }
      const mode = bestModeForLeg(matrices, i, j, criterion, defaultMode, allowMixedModes);
      modeMatrix[i].push(mode);
      costMatrix[i].push(legMetric(matrices[mode][i][j], criterion));
    }
  }

  let order: number[];
  let algorithm: RouteResult['algorithm'];
  if (keepManualOrder) {
    order = nodes.map((_, idx) => idx);
    algorithm = 'manual';
  } else {
    const solution = solveTsp(costMatrix, { returnToStart });
    order = solution.order;
    algorithm = solution.method;
  }

  const stops = returnToStart && n > 1 ? [...order, 0] : order;
  const legs: RouteLeg[] = [];
  for (let k = 0; k < stops.length - 1; k++) {
    const i = stops[k];
    const j = stops[k + 1];
    const mode = modeMatrix[i][j];
    legs.push({ fromIndex: i, toIndex: j, from: nodes[i], to: nodes[j], mode, info: matrices[mode][i][j] });
  }

  return {
    order: order.slice(1).map((idx) => nodes[idx]),
    legs,
    totals: sumTotals(legs),
    algorithm,
  };
}

/** 결과 화면에서 사용자가 특정 구간의 수단을 바꿨을 때 (순서는 유지) */
export function overrideLegMode(
  result: RouteResult,
  matrices: TravelMatrices,
  legIndex: number,
  mode: TransportMode,
): RouteResult {
  const legs = result.legs.map((leg, idx) =>
    idx === legIndex ? { ...leg, mode, info: matrices[mode][leg.fromIndex][leg.toIndex] } : leg,
  );
  return { ...result, legs, totals: sumTotals(legs) };
}

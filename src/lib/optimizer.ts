import { groupFareKrw } from './fare';
import { pathCost, solvePath, type PathSolution } from './tsp';
import type {
  Criterion,
  LegInfo,
  Passengers,
  Place,
  RouteLeg,
  RouteResult,
  RouteTotals,
  TransportMode,
  TravelMatrices,
} from '../types';

/** 여러 수단을 선호할 때 도보를 허용하는 최대 거리 (km). 도보만 선택하면 제한 없음 */
export const WALK_MAX_KM = 2;

export interface TripSetup {
  origin: Place;
  places: Place[];
  /** 여행지 도착 거점 후보 (예: 서울역, 용산역). 비어 있으면 출발지에서 바로 첫 장소로 */
  entryHubs: Place[];
  /** 복귀할 때 이용할 거점 후보 (예: 서울역, 영등포역). 복귀 시에만 사용 */
  exitHubs: Place[];
  returnToStart: boolean;
  keepManualOrder: boolean;
  preferredModes: TransportMode[];
  criterion: Criterion;
  passengers: Passengers;
}

export interface OptimizeInput extends TripSetup {
  /** buildNodes(setup) 결과와 같은 인덱스 체계의 행렬 */
  nodes: Place[];
  matrices: TravelMatrices;
}

/** 행렬에 들어갈 노드 목록 (id 기준 중복 제거). 0번은 항상 출발지 */
export function buildNodes(setup: Pick<TripSetup, 'origin' | 'places' | 'entryHubs' | 'exitHubs'>): Place[] {
  const seen = new Set<string>();
  const nodes: Place[] = [];
  for (const p of [setup.origin, ...setup.places, ...setup.entryHubs, ...setup.exitHubs]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      nodes.push(p);
    }
  }
  return nodes;
}

/** 기준별 구간 비용. 동률일 때는 시간이 짧은 쪽을 우선하도록 아주 작은 가중치를 더한다 */
export function legMetric(info: LegInfo, criterion: Criterion, passengers: Passengers): number {
  const tieBreak = info.durationMin * 1e-6;
  switch (criterion) {
    case 'distance':
      return info.distanceKm + tieBreak;
    case 'time':
      return info.durationMin;
    case 'cost':
      return groupFareKrw(info, passengers) + tieBreak;
  }
}

export interface ModeChoice {
  mode: TransportMode;
  info: LegInfo;
}

/** 선택된 수단들 중 기준상 가장 유리한 수단을 고른다 */
export function pickBestMode(candidates: ModeChoice[], criterion: Criterion, passengers: Passengers): ModeChoice {
  const multiple = candidates.length > 1;
  let best: ModeChoice | null = null;
  let bestValue = Infinity;
  for (const c of candidates) {
    if (multiple && c.mode === 'walk' && c.info.distanceKm > WALK_MAX_KM) continue;
    const value = legMetric(c.info, criterion, passengers);
    if (value < bestValue) {
      bestValue = value;
      best = c;
    }
  }
  // 도보만 남았는데 거리 제한에 걸린 경우 등: 첫 후보로 대체
  return best ?? candidates[0];
}

export function sumTotals(legs: RouteLeg[]): RouteTotals {
  return legs.reduce<RouteTotals>(
    (acc, leg) => ({
      distanceKm: acc.distanceKm + leg.info.distanceKm,
      durationMin: acc.durationMin + leg.info.durationMin,
      costKrw: acc.costKrw + leg.costKrw,
    }),
    { distanceKm: 0, durationMin: 0, costKrw: 0 },
  );
}

export function makeLeg(
  nodes: Place[],
  fromIndex: number,
  toIndex: number,
  choice: ModeChoice,
  passengers: Passengers,
  overridden?: boolean,
): RouteLeg {
  return {
    fromIndex,
    toIndex,
    from: nodes[fromIndex],
    to: nodes[toIndex],
    mode: choice.mode,
    info: choice.info,
    costKrw: groupFareKrw(choice.info, passengers),
    ...(overridden ? { overridden } : {}),
  };
}

export function optimizeRoute(input: OptimizeInput): RouteResult {
  const { nodes, matrices, criterion, passengers, returnToStart, keepManualOrder } = input;
  const n = nodes.length;
  const indexOf = new Map(nodes.map((p, i) => [p.id, i]));
  const idx = (p: Place) => indexOf.get(p.id)!;
  const modes = input.preferredModes.filter((m) => matrices[m]);
  if (modes.length === 0) throw new Error('선택한 이동 수단의 경로 정보가 없습니다.');

  // 구간마다 선호 수단 중 최선을 고르고, 그 기준값으로 비용 행렬을 만든다
  const choice: ModeChoice[][] = [];
  const cost: number[][] = [];
  for (let i = 0; i < n; i++) {
    choice.push([]);
    cost.push([]);
    for (let j = 0; j < n; j++) {
      const best = pickBestMode(
        modes.map((mode) => ({ mode, info: matrices[mode]![i][j] })),
        criterion,
        passengers,
      );
      choice[i].push(best);
      cost[i].push(i === j ? 0 : legMetric(best.info, criterion, passengers));
    }
  }

  const visit = input.places.map(idx);
  const entryOptions: (number | null)[] = input.entryHubs.length ? input.entryHubs.map(idx) : [null];
  const exitOptions: (number | null)[] = returnToStart && input.exitHubs.length ? input.exitHubs.map(idx) : [null];

  // 거점 후보 조합마다 최적 순서를 구해 가장 좋은 조합을 고른다 (후보 수가 적어 전수 비교)
  let best: { entry: number | null; exit: number | null; solution: PathSolution; total: number } | null = null;
  for (const entry of entryOptions) {
    for (const exit of exitOptions) {
      const start = entry ?? 0;
      const end = exit ?? (returnToStart ? 0 : null);
      const problem = { start, visit: visit.filter((v) => v !== start), end };
      const solution: PathSolution = keepManualOrder
        ? { order: [start, ...problem.visit], cost: pathCost([start, ...problem.visit], cost, end), method: 'held-karp' }
        : solvePath(cost, problem);
      const pre = entry === null ? 0 : cost[0][entry];
      const post = exit !== null && returnToStart ? cost[exit][0] : 0;
      const total = pre + solution.cost + post;
      if (!best || total < best.total) best = { entry, exit, solution, total };
    }
  }
  const { entry, exit, solution } = best!;

  const stops = [
    0,
    ...(entry === null ? [] : [entry]),
    ...solution.order.slice(1),
    ...(exit === null ? [] : [exit]),
    ...(returnToStart ? [0] : []),
  ];
  const legs: RouteLeg[] = [];
  for (let k = 0; k < stops.length - 1; k++) {
    const [i, j] = [stops[k], stops[k + 1]];
    legs.push(makeLeg(nodes, i, j, choice[i][j], passengers));
  }

  return {
    stops: stops.map((s) => nodes[s]),
    order: solution.order.slice(1).map((s) => nodes[s]),
    legs,
    totals: sumTotals(legs),
    algorithm: keepManualOrder ? 'manual' : solution.method,
    entryHub: entry === null ? undefined : nodes[entry],
    exitHub: exit === null ? undefined : nodes[exit],
  };
}

/** 일부 구간을 교체한 결과 (순서는 유지) */
export function replaceLegs(result: RouteResult, replacements: Map<number, RouteLeg>): RouteResult {
  const legs = result.legs.map((leg, i) => replacements.get(i) ?? leg);
  return { ...result, legs, totals: sumTotals(legs) };
}

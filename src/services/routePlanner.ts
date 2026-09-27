import { estimateLeg } from '../lib/estimate';
import { buildNodes, makeLeg, optimizeRoute, pickBestMode, replaceLegs, WALK_MAX_KM, type TripSetup } from '../lib/optimizer';
import type { Criterion, Passengers, Place, RouteLeg, RouteResult, TransportMode } from '../types';
import { buildTravelMatrices, cachedLeg, type LegQuery, type MatrixStrategy, type RoutingProvider } from './routing';

export interface PlanOutput {
  nodes: Place[];
  result: RouteResult;
}

/**
 * 1) 노드 행렬 수집 (전략에 따라 추정 또는 API)
 * 2) 방문 순서·거점 최적화
 * 3) 추정 전략이면 확정된 구간만 API로 다시 조회해 실제 값으로 교체
 */
export async function planRoute(
  setup: TripSetup,
  provider: RoutingProvider,
  strategy: MatrixStrategy,
  query?: LegQuery,
): Promise<PlanOutput> {
  const nodes = buildNodes(setup);
  const matrices = await buildTravelMatrices(provider, nodes, setup.preferredModes, strategy, query);
  let result = optimizeRoute({ ...setup, nodes, matrices });

  if (strategy === 'estimate') {
    const legs = await Promise.all(
      result.legs.map((leg) =>
        resolveLeg(provider, nodes, leg.fromIndex, leg.toIndex, setup.preferredModes, setup.criterion, setup.passengers, query),
      ),
    );
    result = replaceLegs(result, new Map(legs.map((leg, i) => [i, leg])));
  }
  return { nodes, result };
}

/** 한 구간을 주어진 수단들로 API 조회해 가장 유리한 수단으로 확정 */
export async function resolveLeg(
  provider: RoutingProvider,
  nodes: Place[],
  i: number,
  j: number,
  modes: TransportMode[],
  criterion: Criterion,
  passengers: Passengers,
  query?: LegQuery,
  overridden?: boolean,
): Promise<RouteLeg> {
  const from = nodes[i];
  const to = nodes[j];
  // 여러 수단 중 고를 때 먼 구간의 도보는 어차피 제외되므로 API를 부르지 않는다
  const candidates = modes.filter(
    (m) => !(modes.length > 1 && m === 'walk' && estimateLeg(from, to, 'walk').distanceKm > WALK_MAX_KM * 1.5),
  );
  const choices = await Promise.all(
    candidates.map(async (mode) => ({ mode, info: await cachedLeg(provider, from, to, mode, query) })),
  );
  return makeLeg(nodes, i, j, pickBestMode(choices, criterion, passengers), passengers, overridden);
}

/**
 * 결과 화면에서 사용자가 고른 구간(stops[fromStop] ~ stops[toStop])만 다른 수단으로 재검색.
 * 방문 순서는 그대로 두고 해당 구간의 이동 수단만 바꾼다.
 */
export async function researchSection(
  provider: RoutingProvider,
  nodes: Place[],
  result: RouteResult,
  fromStop: number,
  toStop: number,
  modes: TransportMode[],
  criterion: Criterion,
  passengers: Passengers,
  query?: LegQuery,
): Promise<RouteResult> {
  const indexes = result.legs.map((_, k) => k).filter((k) => k >= fromStop && k < toStop);
  const legs = await Promise.all(
    indexes.map((k) =>
      resolveLeg(provider, nodes, result.legs[k].fromIndex, result.legs[k].toIndex, modes, criterion, passengers, query, true),
    ),
  );
  return replaceLegs(result, new Map(indexes.map((k, n) => [k, legs[n]])));
}

/** 'YYYY-MM-DD' + 'HH:mm' → 'YYYYMMDDHHmm' (형식이 맞지 않으면 undefined) */
export function toDepartAt(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return undefined;
  return date.replace(/-/g, '') + time.replace(':', '');
}

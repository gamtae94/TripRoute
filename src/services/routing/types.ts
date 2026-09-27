import { mapWithConcurrency } from '../../lib/concurrency';
import { estimateLeg } from '../../lib/estimate';
import type { Coord, LegInfo, Place, TransportMode, TravelMatrices } from '../../types';

/** '전체 조회' 전략에서 동시에 조회할 최대 구간 수 (TMAP 등 무료 등급의 초당 호출 제한 대비) */
const MATRIX_CONCURRENCY = 3;

export interface LegQuery {
  /** 출발 일시 'YYYYMMDDHHmm' (대중교통 시간표 반영용, 선택) */
  departAt?: string;
}

/**
 * 지도/경로 API 공통 인터페이스.
 * 국내는 TMAP, 해외 확장 시 Google 등 구현체를 추가해 교체한다.
 */
export interface RoutingProvider {
  /** 캐시 키에 쓰이는 식별자 */
  readonly id: string;
  /** 장소 키워드 검색 (자동완성) */
  searchPlaces(query: string): Promise<Place[]>;
  /** 두 지점 사이 한 구간 */
  getLeg(from: Place, to: Place, mode: TransportMode, query?: LegQuery): Promise<LegInfo>;
  /** 좌표 → 주소 (지원하지 않으면 생략) */
  reverseGeocode?(coord: Coord): Promise<string | null>;
}

/**
 * 경로 행렬 계산 방식
 * - estimate: 직선거리 추정 행렬로 순서를 정한 뒤, 확정된 구간만 API 조회 (호출 수 ≈ 구간 수 × 수단 수)
 * - full: 모든 장소 쌍을 API로 조회 (정확하지만 호출 수 ≈ N² × 수단 수)
 */
export type MatrixStrategy = 'estimate' | 'full';

export async function buildTravelMatrices(
  provider: RoutingProvider,
  nodes: Place[],
  modes: TransportMode[],
  strategy: MatrixStrategy,
  query?: LegQuery,
): Promise<TravelMatrices> {
  // 직선거리 추정치로 먼저 채운다 (API 호출 없음). 'estimate' 전략은 이걸로 끝.
  const matrices = {} as Record<TransportMode, LegInfo[][]>;
  for (const mode of modes) {
    matrices[mode] = nodes.map((from) => nodes.map((to) => estimateLeg(from, to, mode)));
  }
  if (strategy !== 'full') return matrices as TravelMatrices;

  // 'full': 모든 장소 쌍을 API로 조회해 덮어쓴다. 순간적으로 요청이 몰리지 않도록 동시 개수를 제한한다.
  const pairs: { mode: TransportMode; i: number; j: number }[] = [];
  for (const mode of modes) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i !== j) pairs.push({ mode, i, j });
      }
    }
  }
  const legs = await mapWithConcurrency(pairs, MATRIX_CONCURRENCY, ({ mode, i, j }) =>
    cachedLeg(provider, nodes[i], nodes[j], mode, query),
  );
  pairs.forEach(({ mode, i, j }, idx) => {
    matrices[mode][i][j] = legs[idx];
  });
  return matrices as TravelMatrices;
}

const legCache = new Map<string, Promise<LegInfo>>();

/** 같은 구간·수단·출발시각 조회는 한 번만 API를 호출한다 */
export function cachedLeg(
  provider: RoutingProvider,
  from: Place,
  to: Place,
  mode: TransportMode,
  query?: LegQuery,
): Promise<LegInfo> {
  const key = [provider.id, mode, from.id, to.id, query?.departAt ?? ''].join('|');
  let leg = legCache.get(key);
  if (!leg) {
    leg = provider.getLeg(from, to, mode, query);
    leg.catch(() => legCache.delete(key));
    legCache.set(key, leg);
  }
  return leg;
}

export function clearLegCache() {
  legCache.clear();
}

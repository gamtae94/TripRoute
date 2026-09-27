import { estimateLeg } from '../../lib/estimate';
import type { LegInfo, Place, TransportMode, TravelMatrices } from '../../types';

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
  const entries = await Promise.all(
    modes.map(async (mode) => {
      const rows = await Promise.all(
        nodes.map((from, i) =>
          Promise.all(
            nodes.map((to, j) => {
              if (i === j) return Promise.resolve(estimateLeg(from, to, mode));
              return strategy === 'full' ? cachedLeg(provider, from, to, mode, query) : Promise.resolve(estimateLeg(from, to, mode));
            }),
          ),
        ),
      );
      return [mode, rows] as const;
    }),
  );
  return Object.fromEntries(entries) as TravelMatrices;
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

import type { Coord, LegInfo, Place, TransportMode, TravelMatrices } from '../../types';

/**
 * 지도/경로 API 공통 인터페이스.
 * 1단계는 DummyRoutingProvider, 이후 Kakao/Google 구현체로 교체한다.
 */
export interface RoutingProvider {
  readonly name: string;
  /** 장소 키워드 검색 (자동완성) */
  searchPlaces(query: string, options?: { near?: Coord; kind?: 'place' | 'origin' }): Promise<Place[]>;
  /** 두 지점 사이 한 구간 */
  getLeg(from: Place, to: Place, mode: TransportMode): Promise<LegInfo>;
}

/**
 * nodes 전체 쌍(N×N)에 대해 수단별 이동 정보를 모은다.
 * 호출 수가 N² × 수단 수로 늘어나므로 구간 단위로 캐싱한다.
 */
export async function buildTravelMatrices(
  provider: RoutingProvider,
  nodes: Place[],
  modes: TransportMode[] = ['walk', 'transit', 'car'],
): Promise<TravelMatrices> {
  const empty: LegInfo = { distanceKm: 0, durationMin: 0, costKrw: 0, path: [] };
  const entries = await Promise.all(
    modes.map(async (mode) => {
      const rows = await Promise.all(
        nodes.map((from, i) =>
          Promise.all(nodes.map((to, j) => (i === j ? empty : cachedLeg(provider, from, to, mode)))),
        ),
      );
      return [mode, rows] as const;
    }),
  );
  return Object.fromEntries(entries) as TravelMatrices;
}

const legCache = new Map<string, Promise<LegInfo>>();

function cachedLeg(provider: RoutingProvider, from: Place, to: Place, mode: TransportMode): Promise<LegInfo> {
  const key = `${provider.name}|${mode}|${from.id}|${to.id}`;
  let leg = legCache.get(key);
  if (!leg) {
    leg = provider.getLeg(from, to, mode);
    leg.catch(() => legCache.delete(key));
    legCache.set(key, leg);
  }
  return leg;
}

export function clearLegCache() {
  legCache.clear();
}

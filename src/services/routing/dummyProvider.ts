import { DUMMY_ORIGINS, DUMMY_PLACES } from '../../data/dummyPlaces';
import { taxiFareKrw, transitFareKrw } from '../../lib/fare';
import { haversineKm } from '../../lib/geo';
import type { Coord, LegInfo, Place, TransportMode } from '../../types';
import type { RoutingProvider } from './types';

/** 직선거리 → 실제 이동거리 보정 계수 */
const DETOUR: Record<TransportMode, number> = { walk: 1.2, transit: 1.35, car: 1.3 };
/** 평균 이동 속도 (km/h) */
const SPEED_KMH: Record<TransportMode, number> = { walk: 4.5, transit: 20, car: 25 };
/** 고정 부가 시간 (분): 대중교통 대기·환승, 택시 호출 등 */
const OVERHEAD_MIN: Record<TransportMode, number> = { walk: 0, transit: 8, car: 3 };

const LATENCY_MS = 150;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * API 키 없이 화면 흐름을 확인하기 위한 가짜 provider.
 * 거리·시간은 직선거리 기반 추정, 경로 좌표는 약간 휘어진 곡선으로 흉내만 낸다.
 */
export class DummyRoutingProvider implements RoutingProvider {
  readonly name = 'dummy';

  async searchPlaces(query: string, options?: { kind?: 'place' | 'origin' }): Promise<Place[]> {
    await delay(LATENCY_MS);
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const pool = options?.kind === 'origin' ? [...DUMMY_ORIGINS, ...DUMMY_PLACES] : DUMMY_PLACES;
    return pool.filter((p) =>
      [p.name, p.address, p.category ?? ''].some((field) => field.toLowerCase().includes(q)),
    );
  }

  async getLeg(from: Place, to: Place, mode: TransportMode): Promise<LegInfo> {
    const distanceKm = round1(haversineKm(from.coord, to.coord) * DETOUR[mode]);
    const durationMin = Math.max(1, Math.round((distanceKm / SPEED_KMH[mode]) * 60 + OVERHEAD_MIN[mode]));
    const costKrw = mode === 'walk' ? 0 : mode === 'transit' ? transitFareKrw(distanceKm) : taxiFareKrw(distanceKm);
    return { distanceKm, durationMin, costKrw, path: curvedPath(from.coord, to.coord, mode) };
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** 두 점을 잇는 완만한 곡선 (수단별로 휘는 방향을 달리해 겹침 방지) */
function curvedPath(a: Coord, b: Coord, mode: TransportMode, segments = 12): Coord[] {
  const bend = mode === 'walk' ? 0.04 : mode === 'transit' ? -0.08 : 0.1;
  const dLat = b.latitude - a.latitude;
  const dLon = b.longitude - a.longitude;
  const points: Coord[] = [];
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    const offset = Math.sin(Math.PI * t) * bend;
    points.push({
      latitude: a.latitude + dLat * t - dLon * offset,
      longitude: a.longitude + dLon * t + dLat * offset,
    });
  }
  return points;
}

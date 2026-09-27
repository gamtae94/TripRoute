import type { Coord, LegInfo, Place, TransportMode } from '../types';
import { estimateTaxiFareKrw, estimateTransitFareKrw } from './fare';
import { haversineKm } from './geo';

/** 직선거리 → 실제 이동거리 보정 계수 */
const DETOUR: Record<TransportMode, number> = { walk: 1.2, transit: 1.35, car: 1.3 };
/** 평균 이동 속도 (km/h) */
const SPEED_KMH: Record<TransportMode, number> = { walk: 4.5, transit: 20, car: 25 };
/** 고정 부가 시간 (분): 대중교통 대기·환승, 택시 호출 등 */
const OVERHEAD_MIN: Record<TransportMode, number> = { walk: 0, transit: 8, car: 3 };

/** 이 거리(직선, km)를 넘으면 도시 간 이동(기차·고속도로)으로 보고 다른 속도를 쓴다 */
const INTERCITY_KM = 50;
const INTERCITY_SPEED_KMH: Record<TransportMode, number> = { walk: 4.5, transit: 120, car: 80 };
const INTERCITY_OVERHEAD_MIN: Record<TransportMode, number> = { walk: 0, transit: 30, car: 5 };
/** 기차 요금 근사 (원/km) */
const TRAIN_KRW_PER_KM = 165;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * API 호출 없이 직선거리로 구간 정보를 추정한다.
 * - 더미 provider의 응답
 * - "추정 후 확정" 전략에서 방문 순서를 정할 때의 N×N 행렬
 */
export function estimateLeg(from: Place, to: Place, mode: TransportMode): LegInfo {
  const straightKm = haversineKm(from.coord, to.coord);
  const intercity = straightKm > INTERCITY_KM;
  const distanceKm = round1(straightKm * DETOUR[mode]);
  const speed = intercity ? INTERCITY_SPEED_KMH[mode] : SPEED_KMH[mode];
  const overhead = intercity ? INTERCITY_OVERHEAD_MIN[mode] : OVERHEAD_MIN[mode];
  const durationMin = Math.max(1, Math.round((distanceKm / speed) * 60 + overhead));
  const base = { distanceKm, durationMin, path: curvedPath(from.coord, to.coord, mode), estimated: true };
  switch (mode) {
    case 'walk':
      return { ...base, fareKrw: 0, fareBasis: 'free' };
    case 'transit':
      return {
        ...base,
        fareKrw: intercity ? Math.round((distanceKm * TRAIN_KRW_PER_KM) / 100) * 100 : estimateTransitFareKrw(distanceKm),
        fareBasis: 'per-person',
        transitVehicles: intercity ? ['train'] : ['subway'],
      };
    case 'car':
      return { ...base, fareKrw: estimateTaxiFareKrw(distanceKm), fareBasis: 'per-vehicle' };
  }
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

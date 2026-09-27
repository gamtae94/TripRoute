/**
 * 평균 요금표 기반 예상 비용 (서울 기준, 카드 결제 성인 요금 근사치).
 * 실시간 요금 API 연동 전까지 사용하는 추정값이다.
 */

export const TRANSIT_FARE = {
  baseKrw: 1550,
  baseKm: 10,
  extraKrw: 100,
  extraEveryKm: 5,
};

export const TAXI_FARE = {
  baseKrw: 4800,
  baseKm: 1.6,
  extraKrw: 100,
  extraEveryKm: 0.131,
};

export function transitFareKrw(distanceKm: number): number {
  const { baseKrw, baseKm, extraKrw, extraEveryKm } = TRANSIT_FARE;
  if (distanceKm <= baseKm) return baseKrw;
  return baseKrw + Math.ceil((distanceKm - baseKm) / extraEveryKm) * extraKrw;
}

export function taxiFareKrw(distanceKm: number): number {
  const { baseKrw, baseKm, extraKrw, extraEveryKm } = TAXI_FARE;
  if (distanceKm <= baseKm) return baseKrw;
  return baseKrw + Math.ceil((distanceKm - baseKm) / extraEveryKm) * extraKrw;
}

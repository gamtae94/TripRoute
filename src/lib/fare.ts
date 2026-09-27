import type { LegInfo, PassengerCategory, Passengers, TransitVehicle } from '../types';

/**
 * 요금 계산.
 *
 * 경로 API(TMAP)는 대중교통 "성인 1인 요금"과 택시 "차량 1대 요금"만 준다.
 * 인원 분류별 요금은 아래 할인 규칙을 성인 요금에 적용해 구한다.
 * 규칙은 수도권 교통카드 요금(2025.6 기준: 성인 1,550 / 청소년 900 / 어린이 550원) 등을
 * 바탕으로 한 근사치이며, 지역·노선별로 다를 수 있다.
 */

export type FareRule = number | 'subway-free';

/** 시내 대중교통(버스·지하철) 할인 규칙: 성인 요금 대비 비율 */
export const LOCAL_TRANSIT_RULES: Record<PassengerCategory, FareRule> = {
  adult: 1,
  youth: 900 / 1550,
  child: 550 / 1550,
  infant: 0,
  // 지하철 무임, 버스는 일반 요금 (서울 기준)
  senior: 'subway-free',
  disabled: 'subway-free',
};

/** 기차·고속/시외버스·항공 등 광역 수단이 포함된 구간 할인 규칙 (대표 할인율 근사) */
export const INTERCITY_RULES: Record<PassengerCategory, FareRule> = {
  adult: 1,
  youth: 1,
  child: 0.5,
  infant: 0,
  senior: 0.7,
  disabled: 0.5,
};

const INTERCITY_VEHICLES: TransitVehicle[] = ['train', 'express-bus', 'airplane', 'ferry'];

/** 택시 1대 최대 탑승 인원 */
export const TAXI_CAPACITY = 4;

export const DEFAULT_PASSENGERS: Passengers = { adult: 1, youth: 0, child: 0, infant: 0, senior: 0, disabled: 0 };

export function totalPassengers(p: Passengers): number {
  return Object.values(p).reduce((a, b) => a + b, 0);
}

const roundTo10 = (krw: number) => Math.round(krw / 10) * 10;

function applyRule(rule: FareRule, adultKrw: number, vehicles: TransitVehicle[]): number {
  if (rule === 'subway-free') {
    // 구간이 지하철로만 이뤄졌을 때만 무임. 버스 등이 섞이면 수단별 요금 분리가 안 되므로 성인 요금으로 보수적으로 계산
    const subwayOnly = vehicles.length > 0 && vehicles.every((v) => v === 'subway');
    return subwayOnly ? 0 : adultKrw;
  }
  return roundTo10(adultKrw * rule);
}

/** 한 구간의 일행 전체 비용 */
export function groupFareKrw(info: LegInfo, passengers: Passengers): number {
  switch (info.fareBasis) {
    case 'free':
      return 0;
    case 'per-vehicle': {
      const vehicles = Math.max(1, Math.ceil(totalPassengers(passengers) / TAXI_CAPACITY));
      return info.fareKrw * vehicles;
    }
    case 'per-person': {
      const transitVehicles = info.transitVehicles ?? [];
      const rules = transitVehicles.some((v) => INTERCITY_VEHICLES.includes(v)) ? INTERCITY_RULES : LOCAL_TRANSIT_RULES;
      let total = 0;
      for (const category of Object.keys(passengers) as PassengerCategory[]) {
        const count = passengers[category];
        if (count > 0) total += count * applyRule(rules[category], info.fareKrw, transitVehicles);
      }
      return total;
    }
  }
}

// ---- API가 없을 때(더미·추정) 쓰는 평균 요금표 ----

export const TRANSIT_FARE = { baseKrw: 1550, baseKm: 10, extraKrw: 100, extraEveryKm: 5 };
export const TAXI_FARE = { baseKrw: 4800, baseKm: 1.6, extraKrw: 100, extraEveryKm: 0.131 };

function distanceFare(distanceKm: number, t: typeof TRANSIT_FARE): number {
  if (distanceKm <= t.baseKm) return t.baseKrw;
  return t.baseKrw + Math.ceil((distanceKm - t.baseKm) / t.extraEveryKm) * t.extraKrw;
}

export const estimateTransitFareKrw = (distanceKm: number) => distanceFare(distanceKm, TRANSIT_FARE);
export const estimateTaxiFareKrw = (distanceKm: number) => distanceFare(distanceKm, TAXI_FARE);

export type TransportMode = 'walk' | 'transit' | 'car';

export type Criterion = 'distance' | 'time' | 'cost';

export interface Coord {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  category?: string;
  coord: Coord;
}

/** 대중교통 구간 안에서 실제로 탄 수단 (요금 할인 규칙 적용에 사용) */
export type TransitVehicle = 'subway' | 'bus' | 'train' | 'express-bus' | 'airplane' | 'ferry' | 'other';

/**
 * 요금 과금 단위
 * - free: 도보
 * - per-person: 대중교통 (API가 주는 값은 성인 1인 요금)
 * - per-vehicle: 택시·자동차 (차량 1대 요금)
 */
export type FareBasis = 'free' | 'per-person' | 'per-vehicle';

/** 두 지점 사이를 특정 이동수단으로 이동할 때의 정보 */
export interface LegInfo {
  distanceKm: number;
  durationMin: number;
  /** fareBasis 단위의 요금 (per-person이면 성인 1인 기준) */
  fareKrw: number;
  fareBasis: FareBasis;
  /** 대중교통 구간의 세부 수단 */
  transitVehicles?: TransitVehicle[];
  /** 실제 경로 좌표 (API가 반환한 도로/노선 좌표) */
  path: Coord[];
  /** API 호출 없이 직선거리로 추정한 값이면 true */
  estimated?: boolean;
  /** 사용자 안내 문구 (예: 가까워서 대중교통 대신 도보) */
  note?: string;
}

/** matrix[i][j] = 노드 i → 노드 j 이동 정보 */
export type LegMatrix = LegInfo[][];

export type TravelMatrices = Partial<Record<TransportMode, LegMatrix>>;

export type PassengerCategory = 'adult' | 'youth' | 'child' | 'infant' | 'senior' | 'disabled';

export type Passengers = Record<PassengerCategory, number>;

export interface RouteLeg {
  fromIndex: number;
  toIndex: number;
  from: Place;
  to: Place;
  mode: TransportMode;
  info: LegInfo;
  /** 인원·분류를 반영한 이 구간 총 비용 */
  costKrw: number;
  /** 결과 화면에서 사용자가 수단을 바꿔 재검색한 구간 */
  overridden?: boolean;
}

export interface RouteTotals {
  distanceKm: number;
  durationMin: number;
  costKrw: number;
}

export type Algorithm = 'held-karp' | 'nearest-neighbor+2-opt' | 'manual';

export interface RouteResult {
  /** 경로상의 모든 지점 (출발지, 거점, 방문 장소, 복귀 지점 포함). legs[k]는 stops[k] → stops[k+1] */
  stops: Place[];
  /** 방문 장소만 최적 순서대로 */
  order: Place[];
  legs: RouteLeg[];
  totals: RouteTotals;
  algorithm: Algorithm;
  entryHub?: Place;
  exitHub?: Place;
}

export const MODE_LABEL: Record<TransportMode, string> = {
  walk: '도보',
  transit: '대중교통',
  car: '택시·자동차',
};

export const CRITERION_LABEL: Record<Criterion, string> = {
  distance: '최단 거리',
  time: '최단 시간',
  cost: '최소 비용',
};

export const PASSENGER_LABEL: Record<PassengerCategory, string> = {
  adult: '성인',
  youth: '청소년(13~18세)',
  child: '어린이(6~12세)',
  infant: '영유아(6세 미만)',
  senior: '경로(65세 이상)',
  disabled: '장애인',
};

export const ALL_MODES: TransportMode[] = ['walk', 'transit', 'car'];

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

/** 두 지점 사이를 특정 이동수단으로 이동할 때의 정보 */
export interface LegInfo {
  distanceKm: number;
  durationMin: number;
  costKrw: number;
  /** 실제 경로 좌표 (API 연동 시 도로/노선을 따르는 좌표로 교체) */
  path: Coord[];
}

/** matrix[i][j] = 노드 i → 노드 j 이동 정보. 노드 0은 항상 출발지 */
export type LegMatrix = LegInfo[][];

export type TravelMatrices = Record<TransportMode, LegMatrix>;

export interface RouteLeg {
  fromIndex: number;
  toIndex: number;
  from: Place;
  to: Place;
  mode: TransportMode;
  info: LegInfo;
}

export interface RouteTotals {
  distanceKm: number;
  durationMin: number;
  costKrw: number;
}

export type Algorithm = 'held-karp' | 'nearest-neighbor+2-opt' | 'manual';

export interface RouteResult {
  /** 방문 순서 (출발지 제외) */
  order: Place[];
  legs: RouteLeg[];
  totals: RouteTotals;
  algorithm: Algorithm;
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

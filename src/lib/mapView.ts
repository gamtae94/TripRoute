import type { Coord, Place, RouteLeg } from '../types';
import { haversineKm } from './geo';

export interface MapMarker {
  place: Place;
  label: string;
  kind: 'origin' | 'hub' | 'place';
}

/** 출발지가 여행지 중심에서 이보다 멀면 여행지 위주로 확대 (km) */
export const FAR_ORIGIN_KM = 50;

export function centroid(coords: Coord[]): Coord {
  return {
    latitude: coords.reduce((a, c) => a + c.latitude, 0) / coords.length,
    longitude: coords.reduce((a, c) => a + c.longitude, 0) / coords.length,
  };
}

/**
 * 지도에 맞춰 보여줄 좌표들.
 * 다른 도시에서 출발한 여행이면 여행지(방문 장소·거점)에 맞추고 출발지는 화면 밖으로 둔다.
 */
export function mapFocus(markers: MapMarker[], legs: RouteLeg[]): { coords: Coord[]; hiddenOrigin?: Place } {
  const origin = markers.find((m) => m.kind === 'origin');
  const others = markers.filter((m) => m.kind !== 'origin').map((m) => m.place.coord);
  if (origin && others.length > 0 && haversineKm(origin.place.coord, centroid(others)) > FAR_ORIGIN_KM) {
    return { coords: others, hiddenOrigin: origin.place };
  }
  return { coords: [...markers.map((m) => m.place.coord), ...legs.flatMap((l) => l.info.path)] };
}

import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Coord, Place } from '../types';
import type { RoutingProvider } from './routing';

export class LocationError extends Error {}

/** GPS로 현재 위치를 얻어 출발지(Place)로 만든다 */
export async function getCurrentPlace(provider: RoutingProvider): Promise<Place> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new LocationError('위치 권한이 없습니다. 기기 설정에서 허용하거나 출발지를 검색해 주세요.');
  }
  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    throw new LocationError('현재 위치를 가져오지 못했습니다. 위치 서비스가 켜져 있는지 확인해 주세요.');
  }
  const coord: Coord = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  return {
    // 좌표를 id에 넣어 위치가 바뀌면 구간 캐시도 새로 조회되게 한다
    id: `current:${coord.latitude.toFixed(5)},${coord.longitude.toFixed(5)}`,
    name: '현재 위치',
    address: await describeCoord(coord, provider),
    coord,
  };
}

/** 좌표 → 주소 문자열. 경로 provider(TMAP) → 기기 역지오코딩 → 좌표 순으로 시도 */
async function describeCoord(coord: Coord, provider: RoutingProvider): Promise<string> {
  try {
    const address = await provider.reverseGeocode?.(coord);
    if (address) return address;
  } catch {
    // 다음 방법으로
  }
  if (Platform.OS !== 'web') {
    try {
      const [first] = await Location.reverseGeocodeAsync(coord);
      const address =
        first?.formattedAddress ?? [first?.region, first?.city, first?.district, first?.street].filter(Boolean).join(' ');
      if (address) return address;
    } catch {
      // 좌표로 표시
    }
  }
  return `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`;
}

import type { Coord, LegInfo, Place, TransitVehicle, TransportMode } from '../../types';
import type { LegQuery, RoutingProvider } from './types';

/**
 * TMAP (SK open API) 구현체.
 * - 장소 검색: POI 통합검색  GET  /tmap/pois
 * - 자동차:    자동차 경로   POST /tmap/routes            (taxiFare 제공)
 * - 도보:      보행자 경로   POST /tmap/routes/pedestrian
 * - 대중교통:  대중교통      POST /transit/routes         (fare.regular.totalFare 제공, 기차·고속버스 포함)
 * 모든 요청은 헤더 appKey로 인증한다. 좌표계는 WGS84GEO.
 *
 * NOTE: 응답 필드는 공개 문서 기준으로 작성했다. 실제 키로 처음 연동할 때 응답을 한 번 확인할 것.
 */

const BASE = 'https://apis.openapi.sk.com';

export class TmapApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export class TmapRoutingProvider implements RoutingProvider {
  readonly id = 'tmap';

  constructor(private readonly appKey: string) {}

  private async request<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T | null> {
    const res = await fetch(`${BASE}${path}`, {
      method: init.method,
      headers: { appKey: this.appKey, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (res.status === 204) return null; // 검색 결과 없음
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new TmapApiError(`TMAP API 오류 (${res.status}) ${text.slice(0, 200)}`, res.status);
    }
    return (await res.json()) as T;
  }

  async searchPlaces(query: string): Promise<Place[]> {
    const q = query.trim();
    if (!q) return [];
    const params = new URLSearchParams({
      version: '1',
      searchKeyword: q,
      count: '15',
      searchType: 'all',
      reqCoordType: 'WGS84GEO',
      resCoordType: 'WGS84GEO',
    });
    const data = await this.request<PoiResponse>(`/tmap/pois?${params}`, { method: 'GET' });
    const pois = data?.searchPoiInfo?.pois?.poi ?? [];
    return pois.map(toPlace);
  }

  async getLeg(from: Place, to: Place, mode: TransportMode, query?: LegQuery): Promise<LegInfo> {
    switch (mode) {
      case 'car':
        return this.car(from, to);
      case 'walk':
        return this.walk(from, to);
      case 'transit':
        return this.transit(from, to, query);
    }
  }

  private points(from: Place, to: Place) {
    return {
      startX: String(from.coord.longitude),
      startY: String(from.coord.latitude),
      endX: String(to.coord.longitude),
      endY: String(to.coord.latitude),
    };
  }

  private async car(from: Place, to: Place): Promise<LegInfo> {
    const data = await this.request<RouteGeoJson>('/tmap/routes?version=1', {
      method: 'POST',
      body: { ...this.points(from, to), reqCoordType: 'WGS84GEO', resCoordType: 'WGS84GEO', searchOption: '0', trafficInfo: 'N' },
    });
    const props = data?.features?.[0]?.properties ?? {};
    return {
      distanceKm: (props.totalDistance ?? 0) / 1000,
      durationMin: Math.round((props.totalTime ?? 0) / 60),
      // taxiFare: 예상 택시 요금 (차량 1대)
      fareKrw: props.taxiFare ?? 0,
      fareBasis: 'per-vehicle',
      path: lineStringCoords(data),
    };
  }

  private async walk(from: Place, to: Place): Promise<LegInfo> {
    const data = await this.request<RouteGeoJson>('/tmap/routes/pedestrian?version=1', {
      method: 'POST',
      body: {
        ...this.points(from, to),
        startName: from.name,
        endName: to.name,
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
      },
    });
    const props = data?.features?.[0]?.properties ?? {};
    return {
      distanceKm: (props.totalDistance ?? 0) / 1000,
      durationMin: Math.round((props.totalTime ?? 0) / 60),
      fareKrw: 0,
      fareBasis: 'free',
      path: lineStringCoords(data),
    };
  }

  private async transit(from: Place, to: Place, query?: LegQuery): Promise<LegInfo> {
    const data = await this.request<TransitResponse>('/transit/routes', {
      method: 'POST',
      body: {
        ...this.points(from, to),
        count: 1,
        lang: 0,
        format: 'json',
        ...(query?.departAt ? { searchDttm: query.departAt } : {}),
      },
    });
    const itinerary = data?.metaData?.plan?.itineraries?.[0];
    if (!itinerary) {
      // 출발지·도착지가 너무 가까우면(status 11 등) 대중교통 경로가 없다 → 도보로 대체
      const walk = await this.walk(from, to);
      return { ...walk, note: data?.result?.message ?? '대중교통 경로가 없어 도보로 안내합니다.' };
    }
    const legs = itinerary.legs ?? [];
    return {
      distanceKm: (itinerary.totalDistance ?? 0) / 1000,
      durationMin: Math.round((itinerary.totalTime ?? 0) / 60),
      fareKrw: itinerary.fare?.regular?.totalFare ?? 0,
      fareBasis: 'per-person',
      transitVehicles: [...new Set(legs.map((l) => toVehicle(l.mode)).filter((v): v is TransitVehicle => v !== null))],
      path: legs.flatMap((l) => [
        ...parseLineString(l.passShape?.linestring),
        ...(l.steps ?? []).flatMap((s) => parseLineString(s.linestring)),
      ]),
    };
  }
}

// ---- 응답 파싱 ----

interface Poi {
  id: string;
  name: string;
  noorLat?: string;
  noorLon?: string;
  frontLat?: string;
  frontLon?: string;
  upperAddrName?: string;
  middleAddrName?: string;
  lowerAddrName?: string;
  detailAddrName?: string;
  upperBizName?: string;
  middleBizName?: string;
  newAddressList?: { newAddress?: { fullAddressRoad?: string }[] };
}
interface PoiResponse {
  searchPoiInfo?: { pois?: { poi?: Poi[] } };
}
interface RouteGeoJson {
  features?: {
    geometry?: { type: string; coordinates: unknown };
    properties?: { totalDistance?: number; totalTime?: number; taxiFare?: number; totalFare?: number };
  }[];
}
interface TransitLeg {
  mode: string;
  passShape?: { linestring?: string };
  steps?: { linestring?: string }[];
}
interface TransitResponse {
  result?: { status?: number; message?: string };
  metaData?: {
    plan?: {
      itineraries?: {
        totalTime?: number;
        totalDistance?: number;
        fare?: { regular?: { totalFare?: number } };
        legs?: TransitLeg[];
      }[];
    };
  };
}

function toPlace(poi: Poi): Place {
  const road = poi.newAddressList?.newAddress?.[0]?.fullAddressRoad;
  const jibun = [poi.upperAddrName, poi.middleAddrName, poi.lowerAddrName, poi.detailAddrName].filter(Boolean).join(' ');
  return {
    id: `tmap:${poi.id}`,
    name: poi.name,
    address: road || jibun,
    category: poi.middleBizName || poi.upperBizName,
    coord: {
      latitude: Number(poi.noorLat ?? poi.frontLat),
      longitude: Number(poi.noorLon ?? poi.frontLon),
    },
  };
}

function lineStringCoords(data: RouteGeoJson | null): Coord[] {
  return (data?.features ?? [])
    .filter((f) => f.geometry?.type === 'LineString')
    .flatMap((f) => (f.geometry!.coordinates as [number, number][]).map(([lon, lat]) => ({ latitude: lat, longitude: lon })));
}

/** "lon,lat lon,lat ..." 형식 */
function parseLineString(s?: string): Coord[] {
  if (!s) return [];
  return s
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))
    .map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
}

function toVehicle(mode: string): TransitVehicle | null {
  switch (mode) {
    case 'WALK':
      return null;
    case 'SUBWAY':
      return 'subway';
    case 'BUS':
      return 'bus';
    case 'TRAIN':
      return 'train';
    case 'EXPRESSBUS':
      return 'express-bus';
    case 'AIRPLANE':
      return 'airplane';
    case 'FERRY':
      return 'ferry';
    default:
      return 'other';
  }
}

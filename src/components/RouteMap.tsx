import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { haversineKm } from '../lib/geo';
import { colors, MODE_COLOR } from '../theme';
import type { Coord, Place, RouteLeg } from '../types';

export interface MapMarker {
  place: Place;
  label: string;
  kind: 'origin' | 'hub' | 'place';
}

const HEIGHT = 300;
const PADDING = 28;
const MARKER = 26;
/** 출발지가 여행지 중심에서 이보다 멀면 여행지 위주로 확대 (km) */
const FAR_ORIGIN_KM = 50;

interface Props {
  markers: MapMarker[];
  legs: RouteLeg[];
  /** 강조할 구간 인덱스 (구간 재검색 선택) */
  highlighted?: Set<number>;
  badge: string;
}

const MARKER_COLOR: Record<MapMarker['kind'], string> = {
  origin: colors.start,
  hub: '#7C3AED',
  place: colors.primary,
};

/**
 * 지도 타일 없이 좌표를 화면에 투영해 경로선과 순서 마커를 그리는 미리보기.
 * 경로선은 API가 준 실제 경로 좌표(path)를 그대로 따라간다.
 * TODO: TMAP 지도 SDK(WebView) 등 실제 지도 타일 위에 그리기.
 */
export function RouteMap({ markers, legs, highlighted, badge }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // 다른 도시에서 출발한 여행이면 여행지(방문 장소·거점)에 맞춰 확대하고 출발지는 화면 밖으로 둔다
  const origin = markers.find((m) => m.kind === 'origin');
  const others = markers.filter((m) => m.kind !== 'origin').map((m) => m.place.coord);
  const originFar = origin !== undefined && others.length > 0 && haversineKm(origin.place.coord, centroid(others)) > FAR_ORIGIN_KM;
  const boundsCoords = originFar
    ? others
    : [...markers.map((m) => m.place.coord), ...legs.flatMap((l) => l.info.path)];
  const dim = highlighted && highlighted.size > 0;
  const project = makeProjection(boundsCoords, width, HEIGHT);

  return (
    <View style={s.container} onLayout={onLayout}>
      {width > 0 ? (
        <>
          {legs.map((leg, legIdx) =>
            pairs(leg.info.path.length ? leg.info.path : [leg.from.coord, leg.to.coord]).map(([a, b], segIdx) => (
              <Segment
                key={`${legIdx}-${segIdx}`}
                a={project(a)}
                b={project(b)}
                color={MODE_COLOR[leg.mode]}
                opacity={dim && !highlighted.has(legIdx) ? 0.2 : 0.85}
              />
            )),
          )}
          {markers.map((m) => (
            <Marker key={m.place.id} point={project(m.place.coord)} label={m.label} color={MARKER_COLOR[m.kind]} />
          ))}
        </>
      ) : null}
      {originFar ? <Text style={s.topBadge}>출발지({origin.place.name})는 지도 밖</Text> : null}
      <Text style={s.badge}>{badge}</Text>
    </View>
  );
}

type Point = { x: number; y: number };

function centroid(coords: Coord[]): Coord {
  return {
    latitude: coords.reduce((a, c) => a + c.latitude, 0) / coords.length,
    longitude: coords.reduce((a, c) => a + c.longitude, 0) / coords.length,
  };
}

function makeProjection(coords: Coord[], width: number, height: number) {
  const lats = coords.map((c) => c.latitude);
  const lons = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  // 위도에 따른 경도 축소를 반영해 가로세로 비율 유지
  const lonScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLon - minLon) * lonScale, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((width - PADDING * 2) / spanX, (height - PADDING * 2) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  return (c: Coord): Point => ({
    x: offsetX + (c.longitude - minLon) * lonScale * scale,
    y: offsetY + (maxLat - c.latitude) * scale,
  });
}

function pairs<T>(items: T[]): [T, T][] {
  return items.slice(1).map((item, i) => [items[i], item]);
}

function Segment({ a, b, color, opacity }: { a: Point; b: Point; color: string; opacity: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  return (
    <View
      style={{
        position: 'absolute',
        left: (a.x + b.x) / 2 - length / 2,
        top: (a.y + b.y) / 2 - 2,
        width: length + 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

function Marker({ point, label, color }: { point: Point; label: string; color: string }) {
  return (
    <View style={[s.marker, { left: point.x - MARKER / 2, top: point.y - MARKER / 2, backgroundColor: color }]}>
      <Text style={s.markerText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.mapBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  badge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    fontSize: 11,
    color: colors.subText,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  topBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    fontSize: 11,
    color: colors.subText,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

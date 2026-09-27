import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { colors, MODE_COLOR } from '../theme';
import type { Coord, Place, RouteLeg } from '../types';

const HEIGHT = 300;
const PADDING = 28;
const MARKER = 26;

interface Props {
  origin: Place;
  order: Place[];
  legs: RouteLeg[];
}

/**
 * 1단계용 지도 대체 뷰: 좌표를 화면에 투영해 경로선과 순서 마커를 그린다.
 * 2단계에서 카카오맵(WebView) 또는 react-native-maps 컴포넌트로 교체한다.
 */
export function RouteMap({ origin, order, legs }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const allCoords = [origin.coord, ...order.map((p) => p.coord), ...legs.flatMap((l) => l.info.path)];
  const project = makeProjection(allCoords, width, HEIGHT);

  return (
    <View style={s.container} onLayout={onLayout}>
      {width > 0 ? (
        <>
          {legs.map((leg, legIdx) =>
            pairs(leg.info.path.length ? leg.info.path : [leg.from.coord, leg.to.coord]).map(([a, b], segIdx) => (
              <Segment key={`${legIdx}-${segIdx}`} a={project(a)} b={project(b)} color={MODE_COLOR[leg.mode]} />
            )),
          )}
          <Marker point={project(origin.coord)} label="S" color={colors.start} />
          {order.map((place, idx) => (
            <Marker key={place.id} point={project(place.coord)} label={String(idx + 1)} color={colors.primary} />
          ))}
        </>
      ) : null}
      <Text style={s.badge}>미리보기 지도 (더미)</Text>
    </View>
  );
}

type Point = { x: number; y: number };

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

function Segment({ a, b, color }: { a: Point; b: Point; color: string }) {
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
        opacity: 0.85,
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
});

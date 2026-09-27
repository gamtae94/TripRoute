import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { mapFocus, type MapMarker } from '../lib/mapView';
import { buildTmapHtml, thinPath, toLatLng, type TmapMapData, type TmapMapMessage } from '../lib/tmapHtml';
import { getRoutingProvider } from '../services/routing';
import { effectiveTmapAppKey, useSettingsStore } from '../store/settingsStore';
import { colors, MODE_COLOR } from '../theme';
import type { RouteLeg } from '../types';
import { MAP_HEIGHT, MARKER_COLOR, RouteMap } from './RouteMap';
import { TmapFrame } from './TmapFrame';

/** SDK가 이 시간 안에 준비되지 않으면 미리보기로 대체 */
const LOAD_TIMEOUT_MS = 10000;

interface Props {
  markers: MapMarker[];
  legs: RouteLeg[];
  highlighted?: Set<number>;
}

/**
 * 결과 화면 지도.
 * TMAP을 쓰고 키가 있으면 TMAP 지도 위에 경로를 그리고,
 * 그렇지 않거나 지도를 불러오지 못하면 좌표 투영 미리보기(RouteMap)로 대체한다.
 */
export function RouteMapView({ markers, legs, highlighted }: Props) {
  const appKey = useSettingsStore((s) => (s.providerId === 'tmap' ? effectiveTmapAppKey(s) : ''));
  const isDummy = getRoutingProvider().id === 'dummy';

  const html = useMemo(() => {
    if (!appKey) return null;
    const dim = highlighted && highlighted.size > 0;
    const data: TmapMapData = {
      markers: markers.map((m) => ({
        lat: m.place.coord.latitude,
        lng: m.place.coord.longitude,
        label: m.label,
        color: MARKER_COLOR[m.kind],
      })),
      lines: legs.map((leg, i) => ({
        path: thinPath(leg.info.path.length ? leg.info.path : [leg.from.coord, leg.to.coord]).map(toLatLng),
        color: MODE_COLOR[leg.mode],
        opacity: dim && !highlighted.has(i) ? 0.25 : 0.9,
      })),
      focus: mapFocus(markers, legs).coords.map(toLatLng),
    };
    return buildTmapHtml(appKey, data);
  }, [appKey, markers, legs, highlighted]);

  const preview = (badge: string) => <RouteMap markers={markers} legs={legs} highlighted={highlighted} badge={badge} />;

  if (!html) return preview(isDummy ? '미리보기 (더미 데이터)' : '경로 미리보기');
  // html이 바뀌면(구간 재검색 등) 로딩 상태부터 다시 시작
  return <TmapMap key={html} html={html} fallback={preview} />;
}

function TmapMap({ html, fallback }: { html: string; fallback: (badge: string) => ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const timer = setTimeout(() => setStatus((s) => (s === 'loading' ? 'failed' : s)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const onMessage = (msg: TmapMapMessage) => setStatus(msg.type === 'ready' ? 'ready' : 'failed');

  if (status === 'failed') return fallback('TMAP 지도를 불러오지 못해 미리보기로 표시');

  return (
    <View style={s.container}>
      <TmapFrame html={html} onMessage={onMessage} />
      {status === 'loading' ? (
        <View style={s.loading}>
          <ActivityIndicator />
          <Text style={s.loadingText}>TMAP 지도 불러오는 중…</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mapBackground,
  },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: colors.subText, fontSize: 13 },
});

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RouteMap, type MapMarker } from '@/components/RouteMap';
import { Button, Chip, Screen, SectionTitle, StepHeader, styles } from '@/components/ui';
import { getRoutingProvider } from '@/services/routing';
import { useTripStore } from '@/store/tripStore';
import { colors, formatDistance, formatDuration, formatKrw, MODE_COLOR, MODE_ICON } from '@/theme';
import {
  ALL_MODES,
  CRITERION_LABEL,
  MODE_LABEL,
  type Algorithm,
  type Criterion,
  type RouteLeg,
  type RouteResult,
  type TransportMode,
} from '@/types';

const CRITERIA: Criterion[] = ['distance', 'time', 'cost'];

const ALGORITHM_LABEL: Record<Algorithm, string> = {
  'held-karp': '정확한 최적해 (Held-Karp)',
  'nearest-neighbor+2-opt': '근사 최적해 (Nearest Neighbor + 2-opt)',
  manual: '사용자 지정 순서',
};

type StopKind = MapMarker['kind'];

/** 경로상 각 지점의 표시 라벨: 출발지 S, 거점 H, 방문 장소 1..n */
function stopLabels(result: RouteResult, originId: string): { label: string; kind: StopKind }[] {
  const placeNo = new Map(result.order.map((p, i) => [p.id, i + 1]));
  return result.stops.map((p) => {
    if (p.id === originId) return { label: 'S', kind: 'origin' };
    const no = placeNo.get(p.id);
    return no ? { label: String(no), kind: 'place' } : { label: 'H', kind: 'hub' };
  });
}

export default function ResultScreen() {
  const s = useTripStore();
  const { origin, result } = s;
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [sectionModes, setSectionModes] = useState<TransportMode[]>(['car']);

  const labels = useMemo(() => (result && origin ? stopLabels(result, origin.id) : []), [result, origin]);
  const markers = useMemo<MapMarker[]>(() => {
    if (!result) return [];
    const seen = new Set<string>();
    return result.stops.flatMap((place, k) => {
      if (seen.has(place.id)) return [];
      seen.add(place.id);
      return [{ place, ...labels[k] }];
    });
  }, [result, labels]);

  if (!origin || !result) {
    return (
      <Screen>
        <Text style={styles.muted}>계산된 경로가 없습니다.</Text>
        <Button label="처음으로" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  const hasSection = selStart !== null && selEnd !== null;
  const highlighted = new Set(hasSection ? result.legs.map((_, k) => k).filter((k) => k >= selStart && k < selEnd) : []);

  const onStopPress = (k: number) => {
    if (selStart === null || selEnd !== null) {
      setSelStart(k);
      setSelEnd(null);
    } else if (k > selStart) {
      setSelEnd(k);
    } else {
      setSelStart(k);
    }
  };
  const clearSelection = () => {
    setSelStart(null);
    setSelEnd(null);
  };
  const toggleSectionMode = (mode: TransportMode) =>
    setSectionModes((cur) =>
      cur.includes(mode) ? (cur.length > 1 ? cur.filter((m) => m !== mode) : cur) : [...cur, mode],
    );
  const onResearch = async () => {
    if (!hasSection) return;
    await s.researchSection(selStart, selEnd, sectionModes);
    clearSelection();
  };

  const footer = hasSection ? (
    <>
      <Text style={{ fontWeight: '700', color: colors.text }}>
        선택 구간: {result.stops[selStart].name} → {result.stops[selEnd].name} ({selEnd - selStart}개 구간)
      </Text>
      <View style={styles.chipRow}>
        {ALL_MODES.map((m) => (
          <Chip key={m} label={`${MODE_ICON[m]} ${MODE_LABEL[m]}`} selected={sectionModes.includes(m)} onPress={() => toggleSectionMode(m)} />
        ))}
      </View>
      <Button label={s.computing ? '재검색 중…' : '이 구간만 선택한 수단으로 재검색'} disabled={s.computing} onPress={onResearch} />
      <Button label="선택 취소" variant="secondary" onPress={clearSelection} />
    </>
  ) : (
    <>
      <Button label={s.computing ? '계산 중…' : '다시 계산'} disabled={s.computing} onPress={() => s.computeRoute()} />
      <Button label="이동 수단·인원 변경" variant="secondary" onPress={() => router.back()} />
    </>
  );

  return (
    <Screen footer={footer}>
      <StepHeader step={4} title="최적 방문 순서" description={ALGORITHM_LABEL[result.algorithm]} />

      <RouteMap
        markers={markers}
        legs={result.legs}
        highlighted={highlighted}
        badge={getRoutingProvider().id === 'dummy' ? '미리보기 (더미 데이터)' : '경로 미리보기'}
      />
      <View style={[styles.chipRow, { justifyContent: 'center' }]}>
        {ALL_MODES.map((m) => (
          <Text key={m} style={{ color: MODE_COLOR[m], fontWeight: '700', fontSize: 12 }}>
            ━ {MODE_LABEL[m]}
          </Text>
        ))}
      </View>

      <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-around' }]}>
        <Total label="총 이동시간" value={formatDuration(result.totals.durationMin)} />
        <Total label="총 거리" value={formatDistance(result.totals.distanceKm)} />
        <Total label="예상 비용" value={formatKrw(result.totals.costKrw)} />
      </View>

      <SectionTitle>최적화 기준</SectionTitle>
      <View style={styles.chipRow}>
        {CRITERIA.map((c) => (
          <Chip key={c} label={CRITERION_LABEL[c]} selected={s.criterion === c} onPress={() => s.setCriterion(c)} />
        ))}
      </View>
      <Text style={styles.muted}>기준을 바꾼 뒤 “다시 계산”을 누르세요. (재검색한 구간은 초기화됩니다)</Text>

      <SectionTitle>구간별 안내</SectionTitle>
      <Text style={styles.muted}>
        지점을 두 번 눌러 구간(시작 → 끝)을 고르면, 그 구간만 다른 이동 수단으로 재검색할 수 있어요.
      </Text>
      {s.error ? <Text style={{ color: colors.danger }}>{s.error}</Text> : null}

      <View>
        {result.stops.map((stop, k) => (
          <View key={`${stop.id}-${k}`}>
            <StopRow
              name={stop.name}
              {...labels[k]}
              selected={k === selStart || k === selEnd}
              onPress={() => onStopPress(k)}
            />
            {k < result.legs.length ? <LegRow leg={result.legs[k]} highlighted={highlighted.has(k)} /> : null}
          </View>
        ))}
      </View>

      <Text style={[styles.muted, { marginTop: 8 }]}>
        {getRoutingProvider().id === 'dummy'
          ? '* 더미 데이터 기반 추정치입니다. 설정 탭에서 TMAP 키를 입력하면 실제 경로·요금으로 계산합니다.'
          : '* 요금은 TMAP이 제공한 성인 요금(대중교통)·택시 요금에 인원·분류별 할인 규칙을 적용한 예상치입니다.'}
      </Text>
    </Screen>
  );
}

function StopRow({
  name,
  label,
  kind,
  selected,
  onPress,
}: {
  name: string;
  label: string;
  kind: StopKind;
  selected: boolean;
  onPress: () => void;
}) {
  const bg = kind === 'origin' ? colors.start : kind === 'hub' ? '#7C3AED' : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10 },
        selected && { backgroundColor: '#DBEAFE' },
      ]}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{label}</Text>
      </View>
      <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>{name}</Text>
      {kind === 'hub' ? <Text style={styles.muted}>거점</Text> : null}
    </Pressable>
  );
}

function LegRow({ leg, highlighted }: { leg: RouteLeg; highlighted: boolean }) {
  return (
    <View
      style={{
        marginLeft: 18,
        paddingLeft: 20,
        paddingVertical: 8,
        borderLeftWidth: 3,
        borderLeftColor: MODE_COLOR[leg.mode],
        backgroundColor: highlighted ? '#EFF6FF' : undefined,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <View style={{ backgroundColor: MODE_COLOR[leg.mode], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
            {MODE_ICON[leg.mode]} {MODE_LABEL[leg.mode]}
          </Text>
        </View>
        <Text style={{ color: colors.text }}>{formatDuration(leg.info.durationMin)}</Text>
        <Text style={styles.muted}>{formatDistance(leg.info.distanceKm)}</Text>
        <Text style={styles.muted}>{formatKrw(leg.costKrw)}</Text>
        {leg.overridden ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>재검색됨</Text> : null}
      </View>
      {leg.info.note ? <Text style={styles.muted}>{leg.info.note}</Text> : null}
    </View>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{value}</Text>
    </View>
  );
}

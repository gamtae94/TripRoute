import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { RouteMap } from '@/components/RouteMap';
import { Button, Chip, Screen, SectionTitle, StepHeader, styles } from '@/components/ui';
import { useTripStore } from '@/store/tripStore';
import { colors, formatDistance, formatDuration, formatKrw, MODE_COLOR, MODE_ICON } from '@/theme';
import { CRITERION_LABEL, MODE_LABEL, type Algorithm, type Criterion, type TransportMode } from '@/types';

const CRITERIA: Criterion[] = ['distance', 'time', 'cost'];
const MODES: TransportMode[] = ['walk', 'transit', 'car'];

const ALGORITHM_LABEL: Record<Algorithm, string> = {
  'held-karp': '정확한 최적해 (Held-Karp)',
  'nearest-neighbor+2-opt': '근사 최적해 (Nearest Neighbor + 2-opt)',
  manual: '사용자 지정 순서',
};

export default function ResultScreen() {
  const origin = useTripStore((s) => s.origin);
  const result = useTripStore((s) => s.result);
  const criterion = useTripStore((s) => s.criterion);
  const computing = useTripStore((s) => s.computing);
  const setCriterion = useTripStore((s) => s.setCriterion);
  const computeRoute = useTripStore((s) => s.computeRoute);
  const setLegMode = useTripStore((s) => s.setLegMode);

  if (!origin || !result) {
    return (
      <Screen>
        <Text style={styles.muted}>계산된 경로가 없습니다.</Text>
        <Button label="처음으로" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  const nextMode = (mode: TransportMode) => MODES[(MODES.indexOf(mode) + 1) % MODES.length];

  return (
    <Screen
      footer={
        <>
          <Button label={computing ? '계산 중…' : '다시 계산'} disabled={computing} onPress={computeRoute} />
          <Button label="이동 수단·옵션 변경" variant="secondary" onPress={() => router.back()} />
        </>
      }
    >
      <StepHeader step={4} title="최적 방문 순서" description={ALGORITHM_LABEL[result.algorithm]} />

      <RouteMap origin={origin} order={result.order} legs={result.legs} />
      <View style={[styles.chipRow, { justifyContent: 'center' }]}>
        {MODES.map((m) => (
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
          <Chip key={c} label={CRITERION_LABEL[c]} selected={criterion === c} onPress={() => setCriterion(c)} />
        ))}
      </View>
      <Text style={styles.muted}>기준을 바꾼 뒤 "다시 계산"을 누르세요.</Text>

      <SectionTitle>구간별 안내</SectionTitle>
      <Text style={styles.muted}>수단 배지를 누르면 해당 구간의 이동 수단을 바꿔볼 수 있어요 (순서는 유지).</Text>
      {result.legs.map((leg, idx) => (
        <View key={`${leg.fromIndex}-${leg.toIndex}`} style={[styles.card, { gap: 6 }]}>
          <Text style={{ fontWeight: '700', color: colors.text }}>
            {idx + 1}. {leg.from.name} → {leg.to.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setLegMode(idx, nextMode(leg.mode))}
              style={{ backgroundColor: MODE_COLOR[leg.mode], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {MODE_ICON[leg.mode]} {MODE_LABEL[leg.mode]}
              </Text>
            </Pressable>
            <Text style={{ color: colors.text }}>{formatDuration(leg.info.durationMin)}</Text>
            <Text style={styles.muted}>{formatDistance(leg.info.distanceKm)}</Text>
            <Text style={styles.muted}>{formatKrw(leg.info.costKrw)}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.muted, { marginTop: 8 }]}>
        * 더미 데이터 기반 추정치입니다. 비용은 서울 평균 요금표(대중교통/택시) 기준입니다.
      </Text>
    </Screen>
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

import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Chip, Screen, SectionTitle, StepHeader, styles, ToggleRow } from '@/components/ui';
import { WALK_MAX_KM } from '@/lib/optimizer';
import { useTripStore } from '@/store/tripStore';
import { colors, MODE_ICON } from '@/theme';
import { CRITERION_LABEL, MODE_LABEL, type Criterion, type TransportMode } from '@/types';

const MODES: TransportMode[] = ['walk', 'transit', 'car'];
const CRITERIA: Criterion[] = ['distance', 'time', 'cost'];

export default function OptionsScreen() {
  const s = useTripStore();

  const onCompute = async () => {
    await s.computeRoute();
    if (!useTripStore.getState().error) router.push('/result');
  };

  return (
    <Screen footer={<Button label={s.computing ? '계산 중…' : '최적 경로 계산'} disabled={s.computing} onPress={onCompute} />}>
      <StepHeader step={3} title="어떻게 이동할까요?" description="이동 수단과 최적화 기준을 선택하세요." />

      <SectionTitle>기본 이동 수단</SectionTitle>
      <View style={styles.chipRow}>
        {MODES.map((mode) => (
          <Chip
            key={mode}
            label={`${MODE_ICON[mode]} ${MODE_LABEL[mode]}`}
            selected={s.defaultMode === mode}
            onPress={() => s.setDefaultMode(mode)}
          />
        ))}
      </View>

      <View style={styles.card}>
        <ToggleRow
          label="구간별로 다른 수단 허용"
          description={`구간마다 기준에 가장 유리한 수단을 자동 선택합니다. (도보는 ${WALK_MAX_KM}km 이내만)`}
          value={s.allowMixedModes}
          onValueChange={s.setAllowMixedModes}
        />
      </View>

      <SectionTitle>최적화 기준</SectionTitle>
      <View style={styles.chipRow}>
        {CRITERIA.map((c) => (
          <Chip key={c} label={CRITERION_LABEL[c]} selected={s.criterion === c} onPress={() => s.setCriterion(c)} />
        ))}
      </View>

      <SectionTitle>경로 옵션</SectionTitle>
      <View style={styles.card}>
        <ToggleRow
          label="출발지로 복귀"
          description="마지막 장소에서 출발지로 돌아오는 구간까지 포함합니다."
          value={s.returnToStart}
          onValueChange={s.setReturnToStart}
        />
        <ToggleRow
          label="내가 정한 순서 유지"
          description="최적화하지 않고 장소 리스트 순서 그대로 경로를 만듭니다."
          value={s.keepManualOrder}
          onValueChange={s.setKeepManualOrder}
        />
      </View>

      {s.error ? <Text style={{ color: colors.danger }}>{s.error}</Text> : null}
    </Screen>
  );
}

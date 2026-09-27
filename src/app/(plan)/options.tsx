import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, Chip, Screen, SectionTitle, StepHeader, styles, ToggleRow } from '@/components/ui';
import { TAXI_CAPACITY, totalPassengers } from '@/lib/fare';
import { WALK_MAX_KM } from '@/lib/optimizer';
import { useTripStore } from '@/store/tripStore';
import { colors, MODE_ICON } from '@/theme';
import { ALL_MODES, CRITERION_LABEL, MODE_LABEL, PASSENGER_LABEL, type Criterion, type PassengerCategory } from '@/types';

const CRITERIA: Criterion[] = ['distance', 'time', 'cost'];
const CATEGORIES = Object.keys(PASSENGER_LABEL) as PassengerCategory[];

export default function OptionsScreen() {
  const s = useTripStore();

  const onCompute = async () => {
    if (await s.computeRoute()) router.push('/result');
  };

  return (
    <Screen footer={<Button label={s.computing ? '계산 중…' : '최적 경로 계산'} disabled={s.computing} onPress={onCompute} />}>
      <StepHeader step={3} title="어떻게 이동할까요?" description="선호 수단, 최적화 기준, 인원을 선택하세요." />

      <SectionTitle>선호 이동 수단 (1~3개 선택)</SectionTitle>
      <View style={styles.chipRow}>
        {ALL_MODES.map((mode) => (
          <Chip
            key={mode}
            label={`${MODE_ICON[mode]} ${MODE_LABEL[mode]}`}
            selected={s.preferredModes.includes(mode)}
            onPress={() => s.togglePreferredMode(mode)}
          />
        ))}
      </View>
      <Text style={styles.muted}>
        {s.preferredModes.length === 1
          ? `모든 구간을 ${MODE_LABEL[s.preferredModes[0]]}(으)로 안내합니다.`
          : `구간마다 선택한 수단 중 기준에 가장 유리한 것을 고릅니다. 도보는 ${WALK_MAX_KM}km 이내 구간만 사용합니다.`}
        {' '}결과 화면에서 원하는 구간만 다른 수단으로 바꿔 재검색할 수 있어요.
      </Text>

      <SectionTitle>최적화 기준</SectionTitle>
      <View style={styles.chipRow}>
        {CRITERIA.map((c) => (
          <Chip key={c} label={CRITERION_LABEL[c]} selected={s.criterion === c} onPress={() => s.setCriterion(c)} />
        ))}
      </View>

      <SectionTitle>인원 (요금 계산)</SectionTitle>
      <View style={[styles.card, { gap: 4 }]}>
        {CATEGORIES.map((c) => (
          <Stepper key={c} label={PASSENGER_LABEL[c]} value={s.passengers[c]} onChange={(n) => s.setPassengerCount(c, n)} />
        ))}
      </View>
      <Text style={styles.muted}>
        대중교통은 인원·분류별 할인을 적용하고, 택시는 {TAXI_CAPACITY}명당 1대로 계산합니다. (총{' '}
        {totalPassengers(s.passengers)}명)
      </Text>

      <SectionTitle>경로 옵션</SectionTitle>
      <View style={styles.card}>
        <ToggleRow
          label="내가 정한 순서 유지"
          description="방문 순서를 최적화하지 않고 장소 리스트 순서 그대로 경로를 만듭니다."
          value={s.keepManualOrder}
          onValueChange={s.setKeepManualOrder}
        />
      </View>

      {s.error ? <Text style={{ color: colors.danger }}>{s.error}</Text> : null}
    </Screen>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{label}</Text>
      <StepButton label="−" disabled={value === 0} onPress={() => onChange(value - 1)} />
      <Text style={{ width: 32, textAlign: 'center', fontWeight: '700', color: colors.text }}>{value}</Text>
      <StepButton label="+" onPress={() => onChange(value + 1)} />
    </View>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

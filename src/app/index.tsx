import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { PlaceSearch } from '@/components/PlaceSearch';
import { Button, Screen, SectionTitle, StepHeader, styles } from '@/components/ui';
import { DUMMY_CURRENT_LOCATION } from '@/data/dummyPlaces';
import { useTripStore } from '@/store/tripStore';
import { colors } from '@/theme';

export default function OriginScreen() {
  const origin = useTripStore((s) => s.origin);
  const setOrigin = useTripStore((s) => s.setOrigin);
  const departureDate = useTripStore((s) => s.departureDate);
  const departureTime = useTripStore((s) => s.departureTime);
  const setDeparture = useTripStore((s) => s.setDeparture);

  return (
    <Screen footer={<Button label="다음: 장소 추가" disabled={!origin} onPress={() => router.push('/places')} />}>
      <StepHeader step={1} title="어디서 출발하나요?" description="현재 위치를 쓰거나 출발지를 검색하세요." />

      {origin ? (
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', borderColor: colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.muted}>선택된 출발지</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{origin.name}</Text>
            <Text style={styles.muted}>{origin.address}</Text>
          </View>
          <Pressable onPress={() => setOrigin(null)} hitSlop={8}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>변경</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* TODO(2단계): expo-location으로 실제 GPS 좌표 + 역지오코딩 */}
          <Button label="📍 현재 위치 사용" variant="secondary" onPress={() => setOrigin(DUMMY_CURRENT_LOCATION)} />
          <SectionTitle>출발지 검색</SectionTitle>
          <PlaceSearch placeholder="예: 서울역, 강남역, 김포공항" kind="origin" actionLabel="선택" onSelect={setOrigin} />
        </>
      )}

      <SectionTitle>출발 예정 일시 (선택)</SectionTitle>
      <Text style={styles.muted}>대중교통 시간표 반영 시 사용됩니다. 비워 두면 지금 출발 기준으로 계산합니다.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 3 }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.subText}
          value={departureDate}
          onChangeText={(v) => setDeparture(v, departureTime)}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="HH:mm"
          placeholderTextColor={colors.subText}
          value={departureTime}
          onChangeText={(v) => setDeparture(departureDate, v)}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
      </View>
    </Screen>
  );
}

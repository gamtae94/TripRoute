import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { PlaceSearch } from '@/components/PlaceSearch';
import { Button, Screen, SectionTitle, StepHeader, styles, ToggleRow } from '@/components/ui';
import { DUMMY_CURRENT_LOCATION } from '@/data/dummyPlaces';
import { useTripStore } from '@/store/tripStore';
import { colors } from '@/theme';
import type { Place } from '@/types';

export default function OriginScreen() {
  const s = useTripStore();
  const [showHubs, setShowHubs] = useState(s.entryHubs.length > 0 || s.exitHubs.length > 0);

  return (
    <Screen footer={<Button label="다음: 장소 추가" disabled={!s.origin} onPress={() => router.push('/places')} />}>
      <StepHeader step={1} title="어디서 출발하나요?" description="출발지와 복귀 여부, 경유 거점을 설정하세요." />

      {s.origin ? (
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', borderColor: colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.muted}>출발지</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{s.origin.name}</Text>
            <Text style={styles.muted}>{s.origin.address}</Text>
          </View>
          <Pressable onPress={() => s.setOrigin(null)} hitSlop={8}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>변경</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* TODO: expo-location으로 실제 GPS 좌표 + 역지오코딩 */}
          <Button label="📍 현재 위치 사용" variant="secondary" onPress={() => s.setOrigin(DUMMY_CURRENT_LOCATION)} />
          <PlaceSearch placeholder="출발지 검색 (예: 서울역, 대전 집)" actionLabel="선택" onSelect={s.setOrigin} />
        </>
      )}

      <View style={styles.card}>
        <ToggleRow
          label="출발지로 복귀"
          description="마지막 장소에서 출발지로 돌아오는 구간까지 포함해 최적화합니다."
          value={s.returnToStart}
          onValueChange={s.setReturnToStart}
        />
        <ToggleRow
          label="경유 거점 설정 (기차역·터미널 등)"
          description="다른 도시로 여행할 때, 여행지에 들어가고 나오는 거점을 지정합니다."
          value={showHubs}
          onValueChange={setShowHubs}
        />
      </View>

      {showHubs ? (
        <>
          <Text style={styles.muted}>
            예) 대전 집 → 대전역 → 서울역 → (서울 여행) → 영등포역 → 서대전역 → 집{'\n'}
            여행지 쪽 거점(서울역, 영등포역)만 넣으면 됩니다. 집 ↔ 거점 사이 기차·버스 경로는 대중교통 검색이 찾아줍니다.
            후보를 여러 개 넣으면 방문 순서에 맞춰 가장 유리한 거점을 자동으로 고릅니다.
          </Text>
          <HubSection
            title="여행지 도착 거점 후보"
            placeholder="예: 서울역, 용산역"
            hubs={s.entryHubs}
            onAdd={(p) => s.addHub('entry', p)}
            onRemove={(id) => s.removeHub('entry', id)}
          />
          {s.returnToStart ? (
            <HubSection
              title="복귀 시 출발 거점 후보"
              placeholder="예: 서울역, 영등포역"
              hubs={s.exitHubs}
              onAdd={(p) => s.addHub('exit', p)}
              onRemove={(id) => s.removeHub('exit', id)}
            />
          ) : null}
        </>
      ) : null}

      <SectionTitle>출발 예정 일시 (선택)</SectionTitle>
      <Text style={styles.muted}>대중교통 시간표에 반영됩니다. 비워 두면 지금 출발 기준입니다.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 3 }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.subText}
          value={s.departureDate}
          onChangeText={(v) => s.setDeparture(v, s.departureTime)}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="HH:mm"
          placeholderTextColor={colors.subText}
          value={s.departureTime}
          onChangeText={(v) => s.setDeparture(s.departureDate, v)}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
      </View>
    </Screen>
  );
}

function HubSection({
  title,
  placeholder,
  hubs,
  onAdd,
  onRemove,
}: {
  title: string;
  placeholder: string;
  hubs: Place[];
  onAdd: (p: Place) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle>{title}</SectionTitle>
      {hubs.length ? (
        <View style={styles.chipRow}>
          {hubs.map((hub) => (
            <Pressable key={hub.id} onPress={() => onRemove(hub.id)} style={[styles.chip, styles.chipSelected]}>
              <Text style={[styles.chipText, styles.chipTextSelected]}>{hub.name} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <PlaceSearch placeholder={placeholder} selectedIds={hubs.map((h) => h.id)} onSelect={onAdd} clearOnSelect />
    </View>
  );
}

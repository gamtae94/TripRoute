import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DraggableList } from '@/components/DraggableList';
import { PlaceSearch } from '@/components/PlaceSearch';
import { Button, Screen, SectionTitle, StepHeader, styles } from '@/components/ui';
import { EXACT_LIMIT } from '@/lib/tsp';
import { useTripStore } from '@/store/tripStore';
import { colors } from '@/theme';

export default function PlacesScreen() {
  const places = useTripStore((s) => s.places);
  const addPlace = useTripStore((s) => s.addPlace);
  const removePlace = useTripStore((s) => s.removePlace);
  const movePlace = useTripStore((s) => s.movePlace);
  const reorderPlace = useTripStore((s) => s.reorderPlace);
  const [dragging, setDragging] = useState(false);

  return (
    <Screen
      scrollEnabled={!dragging}
      footer={
        <Button
          label={`다음: 이동 수단 설정 (${places.length}곳)`}
          disabled={places.length === 0}
          onPress={() => router.push('/options')}
        />
      }
    >
      <StepHeader step={2} title="어디를 방문할까요?" description="가고 싶은 장소를 검색해서 추가하세요." />

      <PlaceSearch
        placeholder="장소 검색 (예: 경복궁, 시장, 공원)"
        selectedIds={places.map((p) => p.id)}
        onSelect={addPlace}
        clearOnSelect
      />

      <SectionTitle>방문 장소 리스트</SectionTitle>
      {places.length === 0 ? (
        <Text style={styles.muted}>아직 추가된 장소가 없습니다.</Text>
      ) : (
        <Text style={styles.muted}>
          ≡ 를 끌거나 ↑↓를 눌러 순서를 바꿀 수 있어요. 다음 화면에서 “내가 정한 순서 유지”를 켜면 이 순서 그대로
          안내합니다.
          {places.length > EXACT_LIMIT ? ` (${EXACT_LIMIT}곳 초과: 근사 최적해로 계산)` : ''}
        </Text>
      )}

      <DraggableList
        items={places}
        keyExtractor={(p) => p.id}
        onReorder={reorderPlace}
        onDragActiveChange={setDragging}
        renderItem={(place, idx, handle, active) => (
          <View
            style={[
              styles.card,
              { flexDirection: 'row', alignItems: 'center', gap: 10 },
              active && { borderColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
            ]}
          >
            {handle}
            <Text style={{ width: 22, fontWeight: '800', color: colors.primary }}>{idx + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{place.name}</Text>
              <Text style={styles.muted}>{place.address}</Text>
            </View>
            <IconButton label="↑" disabled={idx === 0} onPress={() => movePlace(idx, -1)} />
            <IconButton label="↓" disabled={idx === places.length - 1} onPress={() => movePlace(idx, 1)} />
            <IconButton label="✕" color={colors.danger} onPress={() => removePlace(place.id)} />
          </View>
        )}
      />
    </Screen>
  );
}

function IconButton({
  label,
  onPress,
  disabled,
  color = colors.text,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={{ padding: 4, opacity: disabled ? 0.25 : 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color }}>{label}</Text>
    </Pressable>
  );
}

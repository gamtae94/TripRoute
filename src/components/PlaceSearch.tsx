import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { routingProvider } from '../services/routing';
import { colors } from '../theme';
import type { Place } from '../types';
import { styles } from './ui';

const DEBOUNCE_MS = 250;

interface Props {
  placeholder: string;
  kind?: 'place' | 'origin';
  /** 이미 선택된 장소 id (결과 목록에서 "추가됨" 표시) */
  selectedIds?: string[];
  actionLabel?: string;
  onSelect: (place: Place) => void;
  clearOnSelect?: boolean;
}

/** 키워드 입력 → 디바운스 후 provider.searchPlaces 호출하는 자동완성 검색창 */
export function PlaceSearch({ placeholder, kind = 'place', selectedIds = [], actionLabel = '추가', onSelect, clearOnSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      routingProvider
        .searchPlaces(query, { kind })
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kind]);

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor={colors.subText}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {loading ? <ActivityIndicator /> : null}
      {!loading && query.trim() && results.length === 0 ? (
        <Text style={styles.muted}>검색 결과가 없습니다. (더미 데이터: 경복궁, 명동, 홍대, 코엑스, 공원 …)</Text>
      ) : null}
      {results.map((place) => {
        const added = selectedIds.includes(place.id);
        return (
          <Pressable
            key={place.id}
            disabled={added}
            onPress={() => {
              onSelect(place);
              if (clearOnSelect) setQuery('');
            }}
            style={({ pressed }) => [
              styles.card,
              { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{place.name}</Text>
              <Text style={styles.muted}>
                {place.category ? `${place.category} · ` : ''}
                {place.address}
              </Text>
            </View>
            <Text style={{ color: added ? colors.subText : colors.primary, fontWeight: '700' }}>
              {added ? '추가됨' : actionLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

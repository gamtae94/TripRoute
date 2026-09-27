import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { getRoutingProvider } from '../services/routing';
import { colors } from '../theme';
import type { Place } from '../types';
import { styles } from './ui';

const DEBOUNCE_MS = 250;

interface Props {
  placeholder: string;
  /** 이미 선택된 장소 id (결과 목록에서 "추가됨" 표시) */
  selectedIds?: string[];
  actionLabel?: string;
  onSelect: (place: Place) => void;
  clearOnSelect?: boolean;
}

/** 키워드 입력 → 디바운스 후 provider.searchPlaces 호출하는 자동완성 검색창 */
export function PlaceSearch({ placeholder, selectedIds = [], actionLabel = '추가', onSelect, clearOnSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasQuery = query.trim().length > 0;
  const onChangeText = (text: string) => {
    setQuery(text);
    setLoading(text.trim().length > 0);
  };

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getRoutingProvider()
        .searchPlaces(query)
        .then((found) => {
          if (!cancelled) {
            setResults(found);
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : '검색에 실패했습니다.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        value={query}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subText}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {hasQuery && loading ? <ActivityIndicator /> : null}
      {hasQuery && error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {hasQuery && !loading && !error && results.length === 0 ? (
        <Text style={styles.muted}>
          검색 결과가 없습니다.
          {getRoutingProvider().id === 'dummy' ? ' (더미 데이터: 경복궁, 명동, 홍대, 서울역, 대전역 …)' : ''}
        </Text>
      ) : null}
      {(hasQuery ? results : []).map((place) => {
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

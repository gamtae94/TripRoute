import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { Button, Chip, Screen, SectionTitle, styles } from '@/components/ui';
import { config } from '@/config';
import { getRoutingProvider } from '@/services/routing';
import { secureStorageIsEncrypted } from '@/services/secureStorage';
import { useSettingsStore, type ProviderId } from '@/store/settingsStore';
import { colors } from '@/theme';

const PROVIDERS: { id: ProviderId; label: string; description: string }[] = [
  { id: 'dummy', label: '더미 데이터', description: 'API 키 없이 서울 명소 데이터로 화면 흐름을 확인합니다.' },
  { id: 'tmap', label: 'TMAP (실제 경로)', description: '장소 검색·도보·대중교통·자동차 경로와 요금을 TMAP API로 조회합니다.' },
];

export default function SettingsScreen() {
  const loaded = useSettingsStore((s) => s.loaded);
  // 저장된 키를 읽은 뒤에 폼을 그려야 입력칸 초기값이 맞다
  return loaded ? <SettingsForm /> : <ActivityIndicator style={{ marginTop: 40 }} />;
}

function SettingsForm() {
  const settings = useSettingsStore();
  const [keyInput, setKeyInput] = useState(settings.tmapAppKey);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const onSave = async () => {
    await settings.saveTmapAppKey(keyInput);
    setMessage({ ok: true, text: keyInput.trim() ? '키를 저장했습니다.' : '저장된 키를 삭제했습니다.' });
  };

  const onTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      await settings.saveTmapAppKey(keyInput);
      const provider = getRoutingProvider();
      if (provider.id !== 'tmap') throw new Error('TMAP을 선택하고 키를 입력하세요.');
      const found = await provider.searchPlaces('서울역');
      setMessage({ ok: true, text: `연결 성공 — '서울역' 검색 결과 ${found.length}건` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '연결에 실패했습니다.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>경로 데이터</SectionTitle>
      <View style={styles.chipRow}>
        {PROVIDERS.map((p) => (
          <Chip key={p.id} label={p.label} selected={settings.providerId === p.id} onPress={() => settings.setProviderId(p.id)} />
        ))}
      </View>
      <Text style={styles.muted}>{PROVIDERS.find((p) => p.id === settings.providerId)?.description}</Text>

      {settings.providerId === 'tmap' ? (
        <>
          <SectionTitle>TMAP appKey</SectionTitle>
          <TextInput
            style={styles.input}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder={config.tmapAppKey ? '(.env 개발용 키 사용 중)' : 'SK open API에서 발급받은 appKey'}
            placeholderTextColor={colors.subText}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label="저장" onPress={onSave} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={testing ? '확인 중…' : '연결 테스트'} variant="secondary" disabled={testing} onPress={onTest} />
            </View>
          </View>
          {message ? <Text style={{ color: message.ok ? '#16A34A' : colors.danger }}>{message.text}</Text> : null}
          <Text style={styles.muted}>
            {secureStorageIsEncrypted
              ? '키는 이 기기의 보안 저장소(iOS Keychain / Android Keystore)에만 저장되며 외부로 전송되지 않습니다. (TMAP 호출 제외)'
              : '웹에서는 보안 저장소를 쓸 수 없어 브라우저 localStorage에 저장됩니다. 개발 확인용으로만 사용하세요.'}
            {'\n'}발급: openapi.sk.com → TMAP 앱 등록 → appKey. 대중교통 API는 별도 사용 신청이 필요합니다.
          </Text>

          <SectionTitle>API 호출 방식</SectionTitle>
          <View style={styles.chipRow}>
            <Chip
              label="추정 후 확정 (권장)"
              selected={settings.matrixStrategy === 'estimate'}
              onPress={() => settings.setMatrixStrategy('estimate')}
            />
            <Chip
              label="전체 조회 (정확)"
              selected={settings.matrixStrategy === 'full'}
              onPress={() => settings.setMatrixStrategy('full')}
            />
          </View>
          <Text style={styles.muted}>
            {settings.matrixStrategy === 'estimate'
              ? '방문 순서는 직선거리 추정으로 정하고, 확정된 구간만 API로 조회합니다. 호출 수 ≈ 구간 수 × 수단 수.'
              : '모든 장소 쌍을 API로 조회해 순서를 정합니다. 가장 정확하지만 호출 수 ≈ (장소 수)² × 수단 수로 빠르게 늘어납니다.'}
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

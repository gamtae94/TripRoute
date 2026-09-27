import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerBackTitle: '뒤로' }}>
        <Stack.Screen name="index" options={{ title: '출발지 설정' }} />
        <Stack.Screen name="places" options={{ title: '장소 추가' }} />
        <Stack.Screen name="options" options={{ title: '이동 수단 · 기준' }} />
        <Stack.Screen name="result" options={{ title: '최적 경로' }} />
      </Stack>
    </>
  );
}

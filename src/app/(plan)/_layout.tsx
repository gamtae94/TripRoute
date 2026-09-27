import { Stack } from 'expo-router';

export default function PlanLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: '뒤로' }}>
      <Stack.Screen name="index" options={{ title: '출발 · 복귀 설정' }} />
      <Stack.Screen name="places" options={{ title: '장소 추가' }} />
      <Stack.Screen name="options" options={{ title: '이동 수단 · 인원' }} />
      <Stack.Screen name="result" options={{ title: '최적 경로' }} />
    </Stack>
  );
}

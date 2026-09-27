import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

export default function RootLayout() {
  const load = useSettingsStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <StatusBar style="dark" />
      <Tabs>
        <Tabs.Screen
          name="(plan)"
          options={{
            title: '경로 만들기',
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon icon="🗺️" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: '설정', tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} /> }}
        />
      </Tabs>
    </>
  );
}

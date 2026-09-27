import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import type { TmapMapMessage } from '../lib/tmapHtml';

/** iOS/Android: TMAP 지도 HTML을 WebView로 띄운다 (웹은 TmapFrame.web.tsx) */
export function TmapFrame({ html, onMessage }: { html: string; onMessage: (msg: TmapMapMessage) => void }) {
  return (
    <WebView
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      scrollEnabled={false}
      onMessage={(e) => {
        try {
          onMessage(JSON.parse(e.nativeEvent.data) as TmapMapMessage);
        } catch {
          // 알 수 없는 메시지 무시
        }
      }}
      onError={(e) => onMessage({ type: 'error', message: e.nativeEvent.description })}
    />
  );
}

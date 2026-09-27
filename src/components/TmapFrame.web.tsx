import { useEffect, useRef } from 'react';

import type { TmapMapMessage } from '../lib/tmapHtml';

/** 웹: react-native-webview가 웹을 지원하지 않아 iframe(srcdoc)으로 띄운다 */
export function TmapFrame({ html, onMessage }: { html: string; onMessage: (msg: TmapMapMessage) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        onMessageRef.current(JSON.parse(e.data) as TmapMapMessage);
      } catch {
        // 알 수 없는 메시지 무시
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return (
    <iframe
      ref={ref}
      srcDoc={html}
      title="TMAP 경로 지도"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
    />
  );
}

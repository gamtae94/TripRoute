import type { Coord } from '../types';

export interface TmapMapData {
  markers: { lat: number; lng: number; label: string; color: string }[];
  lines: { path: [number, number][]; color: string; opacity: number }[];
  /** fitBounds 대상 좌표 */
  focus: [number, number][];
}

/** 지도 페이지 → 앱으로 보내는 메시지 */
export type TmapMapMessage = { type: 'ready' } | { type: 'error'; message: string };

export const toLatLng = (c: Coord): [number, number] => [c.latitude, c.longitude];

/** 경로 좌표가 많으면 WebView에 넘기는 HTML이 커지므로 적당히 솎아낸다 */
export function thinPath(path: Coord[], maxPoints = 400): Coord[] {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  return path.filter((_, i) => i % step === 0 || i === path.length - 1);
}

function markerIcon(label: string, color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">` +
    `<circle cx="14" cy="14" r="12" fill="${color}" stroke="#fff" stroke-width="2.5"/>` +
    `<text x="14" y="18.5" font-size="12" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * TMAP Web SDK(jsv2)로 경로를 그리는 단독 HTML.
 * 네이티브에서는 WebView, 웹에서는 iframe(srcdoc)에 넣는다.
 * 결과는 postMessage로 { type: 'ready' | 'error' }를 보낸다.
 */
export function buildTmapHtml(appKey: string, data: TmapMapData): string {
  const payload = JSON.stringify({
    ...data,
    markers: data.markers.map((m) => ({ ...m, icon: markerIcon(m.label, m.color) })),
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }</style>
<script src="https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${encodeURIComponent(appKey)}"></script>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  function post(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }
  function init() {
    try {
      if (!window.Tmapv2) throw new Error('TMAP 지도 SDK를 불러오지 못했습니다.');
      var data = ${payload};
      var first = data.focus[0] || [37.5665, 126.978];
      var map = new Tmapv2.Map('map', {
        center: new Tmapv2.LatLng(first[0], first[1]),
        width: '100%',
        height: '100%',
        zoom: 14
      });
      data.lines.forEach(function (line) {
        if (line.path.length < 2) return;
        new Tmapv2.Polyline({
          path: line.path.map(function (p) { return new Tmapv2.LatLng(p[0], p[1]); }),
          strokeColor: line.color,
          strokeWeight: 5,
          strokeOpacity: line.opacity,
          map: map
        });
      });
      data.markers.forEach(function (m) {
        new Tmapv2.Marker({
          position: new Tmapv2.LatLng(m.lat, m.lng),
          icon: m.icon,
          iconSize: new Tmapv2.Size(28, 28),
          map: map
        });
      });
      if (data.focus.length > 1) {
        var bounds = new Tmapv2.LatLngBounds();
        data.focus.forEach(function (p) { bounds.extend(new Tmapv2.LatLng(p[0], p[1])); });
        map.fitBounds(bounds, 40);
      }
      post({ type: 'ready' });
    } catch (e) {
      post({ type: 'error', message: String((e && e.message) || e) });
    }
  }
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
</script>
</body>
</html>`;
}

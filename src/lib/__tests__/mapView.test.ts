import type { Place } from '../../types';
import { mapFocus, type MapMarker } from '../mapView';
import { buildTmapHtml, thinPath } from '../tmapHtml';

const place = (id: string, latitude: number, longitude: number): Place => ({ id, name: id, address: '', coord: { latitude, longitude } });
const marker = (p: Place, kind: MapMarker['kind']): MapMarker => ({ place: p, label: kind === 'origin' ? 'S' : '1', kind });

describe('mapFocus', () => {
  const seoulA = place('a', 37.57, 126.98);
  const seoulB = place('b', 37.55, 126.99);

  it('출발지가 가까우면 전체를 보여준다', () => {
    const focus = mapFocus([marker(place('o', 37.56, 126.97), 'origin'), marker(seoulA, 'place'), marker(seoulB, 'place')], []);
    expect(focus.hiddenOrigin).toBeUndefined();
    expect(focus.coords).toHaveLength(3);
  });

  it('다른 도시에서 출발하면 출발지를 빼고 여행지에 맞춘다', () => {
    const daejeon = place('home', 36.35, 127.38);
    const focus = mapFocus([marker(daejeon, 'origin'), marker(seoulA, 'place'), marker(seoulB, 'hub')], []);
    expect(focus.hiddenOrigin?.id).toBe('home');
    expect(focus.coords).toEqual([seoulA.coord, seoulB.coord]);
  });
});

describe('buildTmapHtml', () => {
  it('SDK 스크립트, 키, 데이터가 들어가고 </script> 주입이 막힌다', () => {
    const html = buildTmapHtml('my key', {
      markers: [{ lat: 37.5, lng: 127, label: '1', color: '#2563EB' }],
      lines: [{ path: [[37.5, 127], [37.6, 127.1]], color: '#16A34A', opacity: 0.9 }],
      focus: [[37.5, 127]],
    });
    expect(html).toContain('https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=my%20key');
    expect(html).toContain('new Tmapv2.Polyline');
    expect(html).toContain('"color":"#16A34A"');

    const evil = buildTmapHtml('k', { markers: [{ lat: 0, lng: 0, label: '</script><script>alert(1)</script>', color: '#000' }], lines: [], focus: [] });
    expect(evil.match(/<\/script>/g)).toHaveLength(2); // SDK 로더 + 인라인 스크립트의 닫는 태그만
  });

  it('긴 경로는 솎아내되 끝점은 유지한다', () => {
    const path = Array.from({ length: 1001 }, (_, i) => ({ latitude: i, longitude: i }));
    const thin = thinPath(path, 100);
    expect(thin.length).toBeLessThanOrEqual(101);
    expect(thin[0]).toEqual(path[0]);
    expect(thin[thin.length - 1]).toEqual(path[1000]);
  });
});

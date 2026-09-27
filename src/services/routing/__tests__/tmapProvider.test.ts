import type { Place } from '../../../types';
import { TmapRoutingProvider } from '../tmapProvider';

const a: Place = { id: 'a', name: 'A', address: '', coord: { latitude: 37.55, longitude: 126.97 } };
const b: Place = { id: 'b', name: 'B', address: '', coord: { latitude: 37.57, longitude: 126.98 } };

function mockFetch(status: number, body?: unknown) {
  const fn = jest.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body ?? ''),
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('TmapRoutingProvider (응답 파싱)', () => {
  const provider = new TmapRoutingProvider('test-key');

  it('POI 검색', async () => {
    const fetch = mockFetch(200, {
      searchPoiInfo: {
        pois: {
          poi: [
            {
              id: '123',
              name: '서울역',
              noorLat: '37.5547',
              noorLon: '126.9707',
              upperAddrName: '서울',
              middleAddrName: '용산구',
              lowerAddrName: '동자동',
              middleBizName: '기차역',
            },
          ],
        },
      },
    });
    const places = await provider.searchPlaces('서울역');
    expect(places).toEqual([
      { id: 'tmap:123', name: '서울역', address: '서울 용산구 동자동', category: '기차역', coord: { latitude: 37.5547, longitude: 126.9707 } },
    ]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/tmap/pois?');
    expect(init.headers.appKey).toBe('test-key');
  });

  it('검색 결과 없음(204)', async () => {
    mockFetch(204);
    await expect(provider.searchPlaces('없는장소')).resolves.toEqual([]);
  });

  it('자동차: 거리·시간·택시요금·경로 좌표', async () => {
    mockFetch(200, {
      features: [
        { geometry: { type: 'Point', coordinates: [126.97, 37.55] }, properties: { totalDistance: 3200, totalTime: 600, taxiFare: 7800 } },
        { geometry: { type: 'LineString', coordinates: [[126.97, 37.55], [126.975, 37.56], [126.98, 37.57]] }, properties: {} },
      ],
    });
    const leg = await provider.getLeg(a, b, 'car');
    expect(leg).toMatchObject({ distanceKm: 3.2, durationMin: 10, fareKrw: 7800, fareBasis: 'per-vehicle' });
    expect(leg.path).toHaveLength(3);
  });

  it('대중교통: 요금·세부 수단·노선 좌표', async () => {
    const fetch = mockFetch(200, {
      metaData: {
        plan: {
          itineraries: [
            {
              totalTime: 1500,
              totalDistance: 6100,
              fare: { regular: { totalFare: 1550 } },
              legs: [
                { mode: 'WALK', steps: [{ linestring: '126.97,37.55 126.971,37.551' }] },
                { mode: 'SUBWAY', passShape: { linestring: '126.971,37.551 126.98,37.57' } },
              ],
            },
          ],
        },
      },
    });
    const leg = await provider.getLeg(a, b, 'transit', { departAt: '202610030930' });
    expect(leg).toMatchObject({ distanceKm: 6.1, durationMin: 25, fareKrw: 1550, fareBasis: 'per-person', transitVehicles: ['subway'] });
    expect(leg.path).toHaveLength(4);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ searchDttm: '202610030930' });
  });

  it('대중교통 경로가 없으면(가까운 거리) 도보로 대체', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ result: { status: 11, message: '출발지/도착지 간 거리가 가까워서 탐색된 경로 없음' } }) })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ features: [{ geometry: { type: 'Point', coordinates: [0, 0] }, properties: { totalDistance: 500, totalTime: 420 } }] }),
      }) as unknown as typeof fetch;
    const leg = await provider.getLeg(a, b, 'transit');
    expect(leg).toMatchObject({ distanceKm: 0.5, durationMin: 7, fareKrw: 0, fareBasis: 'free' });
    expect(leg.note).toContain('가까워서');
  });

  it('HTTP 오류는 예외', async () => {
    mockFetch(403, { error: { message: 'INVALID_API_KEY' } });
    await expect(provider.getLeg(a, b, 'walk')).rejects.toThrow('403');
  });
});

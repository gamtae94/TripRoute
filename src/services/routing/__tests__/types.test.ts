import { DUMMY_PLACES } from '../../../data/dummyPlaces';
import type { LegInfo, Place, TransportMode } from '../../../types';
import { DummyRoutingProvider } from '../dummyProvider';
import { buildTravelMatrices, clearLegCache, type RoutingProvider } from '../types';

/** getLeg 호출의 동시 실행 개수를 세는 provider 래퍼 */
function trackConcurrency(inner: RoutingProvider) {
  let current = 0;
  let max = 0;
  const provider: RoutingProvider = {
    id: 'tracked',
    searchPlaces: (q) => inner.searchPlaces(q),
    async getLeg(from: Place, to: Place, mode: TransportMode): Promise<LegInfo> {
      current++;
      max = Math.max(max, current);
      await new Promise((r) => setTimeout(r, 5));
      try {
        return await inner.getLeg(from, to, mode);
      } finally {
        current--;
      }
    },
  };
  return { provider, getMax: () => max };
}

describe('buildTravelMatrices', () => {
  beforeEach(clearLegCache);

  it("'estimate' 전략은 API를 호출하지 않는다", async () => {
    const { provider, getMax } = trackConcurrency(new DummyRoutingProvider());
    await buildTravelMatrices(provider, DUMMY_PLACES.slice(0, 5), ['transit'], 'estimate');
    expect(getMax()).toBe(0);
  });

  it("'full' 전략은 모든 쌍을 채우되 동시 호출 수를 제한한다", async () => {
    const nodes = DUMMY_PLACES.slice(0, 6);
    const { provider, getMax } = trackConcurrency(new DummyRoutingProvider());
    const matrices = await buildTravelMatrices(provider, nodes, ['transit', 'car'], 'full');
    expect(getMax()).toBeGreaterThan(1); // 동시에 돌긴 함
    expect(getMax()).toBeLessThanOrEqual(3); // 하지만 한꺼번에 몰리지는 않음
    for (const mode of ['transit', 'car'] as const) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
          expect(matrices[mode]![i][j]).toBeTruthy();
        }
      }
    }
  });
});

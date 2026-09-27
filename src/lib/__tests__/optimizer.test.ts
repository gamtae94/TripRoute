import { DUMMY_ORIGINS, DUMMY_PLACES } from '../../data/dummyPlaces';
import { DummyRoutingProvider } from '../../services/routing/dummyProvider';
import { buildTravelMatrices } from '../../services/routing/types';
import { optimizeRoute, overrideLegMode, WALK_MAX_KM, type OptimizeInput } from '../optimizer';

const provider = new DummyRoutingProvider();
const nodes = [DUMMY_ORIGINS[0], ...DUMMY_PLACES.slice(0, 6)];

async function baseInput(overrides: Partial<OptimizeInput> = {}): Promise<OptimizeInput> {
  return {
    nodes,
    matrices: await buildTravelMatrices(provider, nodes),
    criterion: 'time',
    defaultMode: 'transit',
    allowMixedModes: false,
    returnToStart: false,
    keepManualOrder: false,
    ...overrides,
  };
}

describe('optimizeRoute', () => {
  it('모든 장소를 한 번씩 방문하고 구간 합계가 일치한다', async () => {
    const result = optimizeRoute(await baseInput());
    expect(result.order.map((p) => p.id).sort()).toEqual(nodes.slice(1).map((p) => p.id).sort());
    expect(result.legs).toHaveLength(nodes.length - 1);
    expect(result.legs[0].from.id).toBe(nodes[0].id);
    expect(result.legs.every((l) => l.mode === 'transit')).toBe(true);
    const sum = result.legs.reduce((acc, l) => acc + l.info.durationMin, 0);
    expect(result.totals.durationMin).toBe(sum);
    expect(result.algorithm).toBe('held-karp');
  });

  it('복귀 옵션이면 마지막 구간이 출발지로 돌아온다', async () => {
    const result = optimizeRoute(await baseInput({ returnToStart: true }));
    expect(result.legs).toHaveLength(nodes.length);
    expect(result.legs[result.legs.length - 1].to.id).toBe(nodes[0].id);
  });

  it('수동 순서 유지 시 입력 순서를 그대로 쓴다', async () => {
    const result = optimizeRoute(await baseInput({ keepManualOrder: true }));
    expect(result.algorithm).toBe('manual');
    expect(result.order.map((p) => p.id)).toEqual(nodes.slice(1).map((p) => p.id));
  });

  it('수단 혼합 + 최소 비용이면 가까운 구간은 도보, 먼 구간은 도보를 쓰지 않는다', async () => {
    const result = optimizeRoute(await baseInput({ allowMixedModes: true, criterion: 'cost' }));
    for (const leg of result.legs) {
      if (leg.mode === 'walk') expect(leg.info.distanceKm).toBeLessThanOrEqual(WALK_MAX_KM);
      else expect(leg.mode).toBe('transit');
    }
    expect(result.legs.some((l) => l.mode === 'walk')).toBe(true);
  });

  it('구간 수단을 바꾸면 합계가 다시 계산된다', async () => {
    const input = await baseInput();
    const result = optimizeRoute(input);
    const changed = overrideLegMode(result, input.matrices, 0, 'car');
    expect(changed.legs[0].mode).toBe('car');
    expect(changed.totals.costKrw).toBe(
      result.totals.costKrw - result.legs[0].info.costKrw + changed.legs[0].info.costKrw,
    );
  });
});

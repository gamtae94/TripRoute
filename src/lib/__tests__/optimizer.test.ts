import { DUMMY_ORIGINS, DUMMY_PLACES } from '../../data/dummyPlaces';
import { DummyRoutingProvider } from '../../services/routing/dummyProvider';
import { buildTravelMatrices } from '../../services/routing/types';
import { planRoute, researchSection, toDepartAt } from '../../services/routePlanner';
import type { Place } from '../../types';
import { DEFAULT_PASSENGERS } from '../fare';
import { buildNodes, optimizeRoute, WALK_MAX_KM, type TripSetup } from '../optimizer';

const provider = new DummyRoutingProvider();
const byId = (id: string) => [...DUMMY_ORIGINS, ...DUMMY_PLACES].find((p) => p.id === id) as Place;
const seoulStation = byId('seoulstation');
const places = DUMMY_PLACES.slice(0, 6);

function setup(overrides: Partial<TripSetup> = {}): TripSetup {
  return {
    origin: seoulStation,
    places,
    entryHubs: [],
    exitHubs: [],
    returnToStart: true,
    keepManualOrder: false,
    preferredModes: ['transit'],
    criterion: 'time',
    passengers: DEFAULT_PASSENGERS,
    ...overrides,
  };
}

async function optimize(s: TripSetup) {
  const nodes = buildNodes(s);
  const matrices = await buildTravelMatrices(provider, nodes, s.preferredModes, 'full');
  return optimizeRoute({ ...s, nodes, matrices });
}

describe('optimizeRoute', () => {
  it('기본값(복귀 포함): 모든 장소를 한 번씩 방문하고 출발지로 돌아온다', async () => {
    const result = await optimize(setup());
    expect(result.order.map((p) => p.id).sort()).toEqual(places.map((p) => p.id).sort());
    expect(result.legs).toHaveLength(places.length + 1);
    expect(result.stops[0].id).toBe(seoulStation.id);
    expect(result.stops[result.stops.length - 1].id).toBe(seoulStation.id);
    expect(result.legs.every((l) => l.mode === 'transit')).toBe(true);
    expect(result.totals.durationMin).toBe(result.legs.reduce((a, l) => a + l.info.durationMin, 0));
    expect(result.algorithm).toBe('held-karp');
  });

  it('복귀 끄면 마지막 장소에서 끝난다', async () => {
    const result = await optimize(setup({ returnToStart: false }));
    expect(result.legs).toHaveLength(places.length);
  });

  it('수동 순서 유지 시 입력 순서를 그대로 쓴다', async () => {
    const result = await optimize(setup({ keepManualOrder: true }));
    expect(result.algorithm).toBe('manual');
    expect(result.order.map((p) => p.id)).toEqual(places.map((p) => p.id));
  });

  it('거점: 대전 집 → 서울 도착 거점 → 장소들 → 복귀 거점(후보 중 최선) → 집', async () => {
    const home = byId('daejeon-home');
    const result = await optimize(
      setup({
        origin: home,
        entryHubs: [byId('seoulstation')],
        exitHubs: [byId('seoulstation'), byId('yeongdeungpostation')],
        places: [byId('hongdae'), byId('yeouido'), byId('gyeongbokgung')],
      }),
    );
    const ids = result.stops.map((p) => p.id);
    expect(ids[0]).toBe('daejeon-home');
    expect(ids[1]).toBe('seoulstation');
    expect(ids[ids.length - 1]).toBe('daejeon-home');
    expect(['seoulstation', 'yeongdeungpostation']).toContain(ids[ids.length - 2]);
    expect(result.exitHub?.id).toBe(ids[ids.length - 2]);
    // 홍대·여의도가 경복궁보다 영등포 쪽에 가까우므로, 경복궁을 먼저 들르고 서쪽에서 끝나는 경로가 나와야 함
    expect(result.order[0].id).toBe('gyeongbokgung');
    expect(result.exitHub?.id).toBe('yeongdeungpostation');
  });

  it('여러 수단 선호 + 최소 비용이면 가까운 구간은 도보, 먼 구간은 도보를 쓰지 않는다', async () => {
    const result = await optimize(setup({ preferredModes: ['walk', 'transit'], criterion: 'cost' }));
    for (const leg of result.legs) {
      if (leg.mode === 'walk') expect(leg.info.distanceKm).toBeLessThanOrEqual(WALK_MAX_KM);
      else expect(leg.mode).toBe('transit');
    }
    expect(result.legs.some((l) => l.mode === 'walk')).toBe(true);
  });

  it('인원 수와 분류가 비용에 반영된다', async () => {
    const one = await optimize(setup({ keepManualOrder: true }));
    const family = await optimize(
      setup({ keepManualOrder: true, passengers: { ...DEFAULT_PASSENGERS, adult: 2, child: 1, infant: 1 } }),
    );
    expect(family.totals.costKrw).toBeGreaterThan(one.totals.costKrw * 2);
    expect(family.totals.costKrw).toBeLessThan(one.totals.costKrw * 3);
  });
});

describe('planRoute / researchSection', () => {
  it('추정 후 확정 전략도 전체 조회와 같은 경로를 만든다 (더미 provider)', async () => {
    const full = await planRoute(setup(), provider, 'full');
    const estimated = await planRoute(setup(), provider, 'estimate');
    expect(estimated.result.stops.map((p) => p.id)).toEqual(full.result.stops.map((p) => p.id));
    expect(estimated.result.totals).toEqual(full.result.totals);
  });

  it('선택한 구간만 다른 수단으로 재검색하고 순서는 유지한다', async () => {
    const { nodes, result } = await planRoute(setup(), provider, 'estimate');
    const changed = await researchSection(provider, nodes, result, 1, 3, ['car'], 'time', DEFAULT_PASSENGERS);
    expect(changed.stops).toEqual(result.stops);
    expect(changed.legs.map((l) => l.mode)).toEqual(result.legs.map((l, k) => (k === 1 || k === 2 ? 'car' : l.mode)));
    expect(changed.legs.filter((l) => l.overridden)).toHaveLength(2);
    const diff = changed.legs[1].costKrw + changed.legs[2].costKrw - result.legs[1].costKrw - result.legs[2].costKrw;
    expect(changed.totals.costKrw).toBe(result.totals.costKrw + diff);
  });

  it('출발 일시 변환', () => {
    expect(toDepartAt('2026-10-03', '09:30')).toBe('202610030930');
    expect(toDepartAt('2026-10-3', '09:30')).toBeUndefined();
    expect(toDepartAt('', '')).toBeUndefined();
  });
});

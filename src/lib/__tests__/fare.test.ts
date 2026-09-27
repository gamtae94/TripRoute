import type { LegInfo } from '../../types';
import { DEFAULT_PASSENGERS, groupFareKrw } from '../fare';

const leg = (overrides: Partial<LegInfo>): LegInfo => ({
  distanceKm: 5,
  durationMin: 20,
  fareKrw: 1550,
  fareBasis: 'per-person',
  transitVehicles: ['subway'],
  path: [],
  ...overrides,
});

const passengers = (p: Partial<typeof DEFAULT_PASSENGERS>) => ({ ...DEFAULT_PASSENGERS, adult: 0, ...p });

describe('groupFareKrw', () => {
  it('수도권 교통카드 요금표와 일치 (성인 1,550 / 청소년 900 / 어린이 550 / 영유아 0)', () => {
    expect(groupFareKrw(leg({}), passengers({ adult: 1 }))).toBe(1550);
    expect(groupFareKrw(leg({}), passengers({ youth: 1 }))).toBe(900);
    expect(groupFareKrw(leg({}), passengers({ child: 1 }))).toBe(550);
    expect(groupFareKrw(leg({}), passengers({ infant: 2 }))).toBe(0);
  });

  it('경로·장애인은 지하철만 이용하면 무임, 버스가 섞이면 성인 요금', () => {
    expect(groupFareKrw(leg({}), passengers({ senior: 1, disabled: 1 }))).toBe(0);
    expect(groupFareKrw(leg({ transitVehicles: ['subway', 'bus'] }), passengers({ senior: 1 }))).toBe(1550);
  });

  it('기차 포함 구간은 광역 할인 규칙 적용', () => {
    const train = leg({ fareKrw: 23700, transitVehicles: ['subway', 'train'] });
    expect(groupFareKrw(train, passengers({ child: 1 }))).toBe(11850);
    expect(groupFareKrw(train, passengers({ senior: 1 }))).toBe(16590);
  });

  it('택시는 4명당 1대, 도보는 무료', () => {
    const taxi = leg({ fareKrw: 10000, fareBasis: 'per-vehicle' });
    expect(groupFareKrw(taxi, passengers({ adult: 4 }))).toBe(10000);
    expect(groupFareKrw(taxi, passengers({ adult: 3, child: 2 }))).toBe(20000);
    expect(groupFareKrw(leg({ fareBasis: 'free', fareKrw: 0 }), passengers({ adult: 3 }))).toBe(0);
  });
});

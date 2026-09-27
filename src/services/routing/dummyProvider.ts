import { DUMMY_ORIGINS, DUMMY_PLACES } from '../../data/dummyPlaces';
import { estimateLeg } from '../../lib/estimate';
import type { LegInfo, Place, TransportMode } from '../../types';
import type { RoutingProvider } from './types';

const LATENCY_MS = 150;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * API 키 없이 화면 흐름을 확인하기 위한 가짜 provider.
 * 거리·시간·요금은 직선거리 기반 추정, 경로 좌표는 곡선으로 흉내만 낸다.
 */
export class DummyRoutingProvider implements RoutingProvider {
  readonly id = 'dummy';

  async searchPlaces(query: string): Promise<Place[]> {
    await delay(LATENCY_MS);
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...DUMMY_ORIGINS, ...DUMMY_PLACES].filter((p) =>
      [p.name, p.address, p.category ?? ''].some((field) => field.toLowerCase().includes(q)),
    );
  }

  async getLeg(from: Place, to: Place, mode: TransportMode): Promise<LegInfo> {
    return estimateLeg(from, to, mode);
  }
}

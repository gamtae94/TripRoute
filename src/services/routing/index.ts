import { DummyRoutingProvider } from './dummyProvider';
import type { RoutingProvider } from './types';

export { buildTravelMatrices, clearLegCache } from './types';
export type { RoutingProvider } from './types';

/**
 * 현재 사용 중인 provider.
 * TODO(2단계): config의 API 키가 있으면 KakaoRoutingProvider / GoogleRoutingProvider로 교체
 */
export const routingProvider: RoutingProvider = new DummyRoutingProvider();

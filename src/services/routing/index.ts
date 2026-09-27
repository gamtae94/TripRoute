import { effectiveTmapAppKey, useSettingsStore } from '../../store/settingsStore';
import { DummyRoutingProvider } from './dummyProvider';
import { TmapRoutingProvider } from './tmapProvider';
import type { RoutingProvider } from './types';

export { buildTravelMatrices, cachedLeg, clearLegCache } from './types';
export type { LegQuery, MatrixStrategy, RoutingProvider } from './types';

const dummy = new DummyRoutingProvider();
let tmap: { key: string; provider: TmapRoutingProvider } | null = null;

/**
 * 설정에 따라 사용할 provider를 돌려준다.
 * TMAP을 골랐지만 키가 없으면 더미로 동작한다.
 * TODO(해외 확장): 좌표가 국외면 GoogleRoutingProvider 선택
 */
export function getRoutingProvider(): RoutingProvider {
  const settings = useSettingsStore.getState();
  if (settings.providerId === 'tmap') {
    const key = effectiveTmapAppKey(settings);
    if (key) {
      if (tmap?.key !== key) tmap = { key, provider: new TmapRoutingProvider(key) };
      return tmap.provider;
    }
  }
  return dummy;
}

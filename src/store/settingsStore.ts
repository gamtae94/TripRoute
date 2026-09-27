import { create } from 'zustand';

import { config } from '../config';
import { clearLegCache, type MatrixStrategy } from '../services/routing/types';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../services/secureStorage';

export type ProviderId = 'dummy' | 'tmap';

const KEYS = {
  tmapAppKey: 'triproute.tmapAppKey',
  prefs: 'triproute.prefs',
};

interface Prefs {
  providerId: ProviderId;
  matrixStrategy: MatrixStrategy;
}

const DEFAULT_PREFS: Prefs = { providerId: 'dummy', matrixStrategy: 'estimate' };

interface SettingsState extends Prefs {
  /** 설정 탭에서 입력한 키. 비어 있으면 .env의 EXPO_PUBLIC_TMAP_APP_KEY를 쓴다 */
  tmapAppKey: string;
  loaded: boolean;
  load: () => Promise<void>;
  saveTmapAppKey: (key: string) => Promise<void>;
  setProviderId: (id: ProviderId) => Promise<void>;
  setMatrixStrategy: (s: MatrixStrategy) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persistPrefs = async (patch: Partial<Prefs>) => {
    set(patch);
    const { providerId, matrixStrategy } = get();
    await setSecureItem(KEYS.prefs, JSON.stringify({ providerId, matrixStrategy }));
  };

  return {
    ...DEFAULT_PREFS,
    tmapAppKey: '',
    loaded: false,

    load: async () => {
      const [key, prefsJson] = await Promise.all([getSecureItem(KEYS.tmapAppKey), getSecureItem(KEYS.prefs)]);
      let prefs = DEFAULT_PREFS;
      try {
        if (prefsJson) prefs = { ...DEFAULT_PREFS, ...(JSON.parse(prefsJson) as Partial<Prefs>) };
      } catch {
        // 손상된 값은 기본값으로
      }
      set({ ...prefs, tmapAppKey: key ?? '', loaded: true });
    },

    saveTmapAppKey: async (key) => {
      const trimmed = key.trim();
      if (trimmed) await setSecureItem(KEYS.tmapAppKey, trimmed);
      else await deleteSecureItem(KEYS.tmapAppKey);
      clearLegCache();
      set({ tmapAppKey: trimmed });
    },

    setProviderId: async (providerId) => {
      clearLegCache();
      await persistPrefs({ providerId });
    },

    setMatrixStrategy: (matrixStrategy) => persistPrefs({ matrixStrategy }),
  };
});

/** 실제로 사용할 TMAP 키: 설정 탭 입력값 → .env 순 */
export function effectiveTmapAppKey(state: Pick<SettingsState, 'tmapAppKey'>): string {
  return state.tmapAppKey || config.tmapAppKey;
}

import { create } from 'zustand';

import { optimizeRoute, overrideLegMode } from '../lib/optimizer';
import { buildTravelMatrices, routingProvider } from '../services/routing';
import type { Criterion, Place, RouteResult, TransportMode, TravelMatrices } from '../types';

interface TripState {
  origin: Place | null;
  /** 출발 예정 일시 (선택, 대중교통 시간표 연동 시 사용) — 'YYYY-MM-DD', 'HH:mm' */
  departureDate: string;
  departureTime: string;

  places: Place[];

  defaultMode: TransportMode;
  allowMixedModes: boolean;
  criterion: Criterion;
  returnToStart: boolean;
  keepManualOrder: boolean;

  /** 결과 계산에 사용한 노드 목록과 행렬 (구간 수단 변경 시 재사용) */
  nodes: Place[];
  matrices: TravelMatrices | null;
  result: RouteResult | null;
  computing: boolean;
  error: string | null;

  setOrigin: (origin: Place | null) => void;
  setDeparture: (date: string, time: string) => void;
  addPlace: (place: Place) => void;
  removePlace: (id: string) => void;
  movePlace: (index: number, delta: -1 | 1) => void;
  setDefaultMode: (mode: TransportMode) => void;
  setAllowMixedModes: (value: boolean) => void;
  setCriterion: (criterion: Criterion) => void;
  setReturnToStart: (value: boolean) => void;
  setKeepManualOrder: (value: boolean) => void;
  computeRoute: () => Promise<void>;
  setLegMode: (legIndex: number, mode: TransportMode) => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  origin: null,
  departureDate: '',
  departureTime: '',
  places: [],
  defaultMode: 'transit',
  allowMixedModes: false,
  criterion: 'time',
  returnToStart: false,
  keepManualOrder: false,
  nodes: [],
  matrices: null,
  result: null,
  computing: false,
  error: null,

  setOrigin: (origin) => set({ origin }),
  setDeparture: (departureDate, departureTime) => set({ departureDate, departureTime }),
  addPlace: (place) =>
    set((s) => (s.places.some((p) => p.id === place.id) ? s : { places: [...s.places, place] })),
  removePlace: (id) => set((s) => ({ places: s.places.filter((p) => p.id !== id) })),
  movePlace: (index, delta) =>
    set((s) => {
      const target = index + delta;
      if (target < 0 || target >= s.places.length) return s;
      const places = [...s.places];
      [places[index], places[target]] = [places[target], places[index]];
      return { places };
    }),
  setDefaultMode: (defaultMode) => set({ defaultMode }),
  setAllowMixedModes: (allowMixedModes) => set({ allowMixedModes }),
  setCriterion: (criterion) => set({ criterion }),
  setReturnToStart: (returnToStart) => set({ returnToStart }),
  setKeepManualOrder: (keepManualOrder) => set({ keepManualOrder }),

  computeRoute: async () => {
    const { origin, places, criterion, defaultMode, allowMixedModes, returnToStart, keepManualOrder } = get();
    if (!origin || places.length === 0) {
      set({ error: '출발지와 방문 장소를 먼저 설정해 주세요.' });
      return;
    }
    set({ computing: true, error: null });
    try {
      const nodes = [origin, ...places];
      const matrices = await buildTravelMatrices(routingProvider, nodes);
      const result = optimizeRoute({
        nodes,
        matrices,
        criterion,
        defaultMode,
        allowMixedModes,
        returnToStart,
        keepManualOrder,
      });
      set({ nodes, matrices, result, computing: false });
    } catch (e) {
      set({ computing: false, error: e instanceof Error ? e.message : '경로 계산에 실패했습니다.' });
    }
  },

  setLegMode: (legIndex, mode) => {
    const { result, matrices } = get();
    if (!result || !matrices) return;
    set({ result: overrideLegMode(result, matrices, legIndex, mode) });
  },
}));

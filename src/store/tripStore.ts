import { create } from 'zustand';

import { DEFAULT_PASSENGERS } from '../lib/fare';
import { getRoutingProvider } from '../services/routing';
import { planRoute, researchSection, toDepartAt } from '../services/routePlanner';
import type { Criterion, PassengerCategory, Passengers, Place, RouteResult, TransportMode } from '../types';
import { useSettingsStore } from './settingsStore';

type HubKind = 'entry' | 'exit';

interface TripState {
  origin: Place | null;
  /** 출발 예정 일시 (선택, 대중교통 시간표 반영) — 'YYYY-MM-DD', 'HH:mm' */
  departureDate: string;
  departureTime: string;
  returnToStart: boolean;
  entryHubs: Place[];
  exitHubs: Place[];

  places: Place[];

  preferredModes: TransportMode[];
  criterion: Criterion;
  keepManualOrder: boolean;
  passengers: Passengers;

  /** 결과 계산에 사용한 노드 목록 (구간 재검색 시 재사용) */
  nodes: Place[];
  result: RouteResult | null;
  computing: boolean;
  error: string | null;

  setOrigin: (origin: Place | null) => void;
  setDeparture: (date: string, time: string) => void;
  setReturnToStart: (value: boolean) => void;
  addHub: (kind: HubKind, place: Place) => void;
  removeHub: (kind: HubKind, id: string) => void;
  addPlace: (place: Place) => void;
  removePlace: (id: string) => void;
  movePlace: (index: number, delta: -1 | 1) => void;
  reorderPlace: (from: number, to: number) => void;
  togglePreferredMode: (mode: TransportMode) => void;
  setCriterion: (criterion: Criterion) => void;
  setKeepManualOrder: (value: boolean) => void;
  setPassengerCount: (category: PassengerCategory, count: number) => void;
  computeRoute: () => Promise<boolean>;
  researchSection: (fromStop: number, toStop: number, modes: TransportMode[]) => Promise<void>;
}

const hubKey = (kind: HubKind) => (kind === 'entry' ? 'entryHubs' : 'exitHubs');

export const useTripStore = create<TripState>((set, get) => ({
  origin: null,
  departureDate: '',
  departureTime: '',
  returnToStart: true,
  entryHubs: [],
  exitHubs: [],
  places: [],
  preferredModes: ['transit'],
  criterion: 'time',
  keepManualOrder: false,
  passengers: DEFAULT_PASSENGERS,
  nodes: [],
  result: null,
  computing: false,
  error: null,

  setOrigin: (origin) => set({ origin }),
  setDeparture: (departureDate, departureTime) => set({ departureDate, departureTime }),
  setReturnToStart: (returnToStart) => set({ returnToStart }),
  addHub: (kind, place) =>
    set((s) => {
      const list = s[hubKey(kind)];
      return list.some((p) => p.id === place.id) ? s : { [hubKey(kind)]: [...list, place] };
    }),
  removeHub: (kind, id) => set((s) => ({ [hubKey(kind)]: s[hubKey(kind)].filter((p) => p.id !== id) })),
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
  reorderPlace: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || to < 0 || from >= s.places.length || to >= s.places.length) return s;
      const places = [...s.places];
      const [moved] = places.splice(from, 1);
      places.splice(to, 0, moved);
      return { places };
    }),
  togglePreferredMode: (mode) =>
    set((s) => {
      const has = s.preferredModes.includes(mode);
      if (has && s.preferredModes.length === 1) return s; // 최소 1개
      return { preferredModes: has ? s.preferredModes.filter((m) => m !== mode) : [...s.preferredModes, mode] };
    }),
  setCriterion: (criterion) => set({ criterion }),
  setKeepManualOrder: (keepManualOrder) => set({ keepManualOrder }),
  setPassengerCount: (category, count) =>
    set((s) => {
      const passengers = { ...s.passengers, [category]: Math.max(0, Math.min(20, count)) };
      return Object.values(passengers).some((n) => n > 0) ? { passengers } : s; // 최소 1명
    }),

  computeRoute: async () => {
    const s = get();
    if (!s.origin || s.places.length === 0) {
      set({ error: '출발지와 방문 장소를 먼저 설정해 주세요.' });
      return false;
    }
    set({ computing: true, error: null });
    try {
      const { nodes, result } = await planRoute(
        {
          origin: s.origin,
          places: s.places,
          entryHubs: s.entryHubs,
          exitHubs: s.returnToStart ? s.exitHubs : [],
          returnToStart: s.returnToStart,
          keepManualOrder: s.keepManualOrder,
          preferredModes: s.preferredModes,
          criterion: s.criterion,
          passengers: s.passengers,
        },
        getRoutingProvider(),
        useSettingsStore.getState().matrixStrategy,
        { departAt: toDepartAt(s.departureDate, s.departureTime) },
      );
      set({ nodes, result, computing: false });
      return true;
    } catch (e) {
      set({ computing: false, error: e instanceof Error ? e.message : '경로 계산에 실패했습니다.' });
      return false;
    }
  },

  researchSection: async (fromStop, toStop, modes) => {
    const s = get();
    if (!s.result || modes.length === 0 || fromStop >= toStop) return;
    set({ computing: true, error: null });
    try {
      const result = await researchSection(
        getRoutingProvider(),
        s.nodes,
        s.result,
        fromStop,
        toStop,
        modes,
        s.criterion,
        s.passengers,
        { departAt: toDepartAt(s.departureDate, s.departureTime) },
      );
      set({ result, computing: false });
    } catch (e) {
      set({ computing: false, error: e instanceof Error ? e.message : '구간 재검색에 실패했습니다.' });
    }
  },
}));

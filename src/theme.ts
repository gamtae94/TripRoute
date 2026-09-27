import type { TransportMode } from './types';

export const colors = {
  primary: '#2563EB',
  primaryText: '#FFFFFF',
  text: '#111827',
  subText: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
  card: '#FFFFFF',
  danger: '#DC2626',
  start: '#111827',
  mapBackground: '#EEF2F7',
};

export const MODE_COLOR: Record<TransportMode, string> = {
  walk: '#16A34A',
  transit: '#2563EB',
  car: '#EA580C',
};

export const MODE_ICON: Record<TransportMode, string> = {
  walk: '🚶',
  transit: '🚇',
  car: '🚕',
};

export function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}시간 ${rest}분` : `${h}시간`;
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function formatKrw(krw: number): string {
  return `${Math.round(krw).toLocaleString('ko-KR')}원`;
}

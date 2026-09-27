import * as Location from 'expo-location';

import { DummyRoutingProvider } from '../routing/dummyProvider';
import { getCurrentPlace, LocationError } from '../location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;

describe('getCurrentPlace', () => {
  beforeEach(() => jest.resetAllMocks());

  it('권한이 없으면 안내 오류', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    await expect(getCurrentPlace(new DummyRoutingProvider())).rejects.toBeInstanceOf(LocationError);
  });

  it('provider 역지오코딩 주소를 우선 사용', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mocked.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 37.5547, longitude: 126.9707 } } as never);
    const provider = Object.assign(new DummyRoutingProvider(), {
      reverseGeocode: jest.fn().mockResolvedValue('서울 용산구 한강대로 405'),
    });
    const place = await getCurrentPlace(provider);
    expect(place).toMatchObject({
      id: 'current:37.55470,126.97070',
      name: '현재 위치',
      address: '서울 용산구 한강대로 405',
      coord: { latitude: 37.5547, longitude: 126.9707 },
    });
  });

  it('주소를 못 얻으면 기기 역지오코딩, 그것도 없으면 좌표', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mocked.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 37.1, longitude: 127.2 } } as never);
    mocked.reverseGeocodeAsync.mockResolvedValueOnce([{ formattedAddress: '경기 어딘가' }] as never);
    expect((await getCurrentPlace(new DummyRoutingProvider())).address).toBe('경기 어딘가');
    mocked.reverseGeocodeAsync.mockRejectedValueOnce(new Error('x'));
    expect((await getCurrentPlace(new DummyRoutingProvider())).address).toBe('37.10000, 127.20000');
  });
});

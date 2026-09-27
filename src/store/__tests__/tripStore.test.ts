import { DUMMY_PLACES } from '../../data/dummyPlaces';
import { useTripStore } from '../tripStore';

describe('tripStore 장소 순서', () => {
  beforeEach(() => useTripStore.setState({ places: DUMMY_PLACES.slice(0, 4) }));
  const ids = () => useTripStore.getState().places.map((p) => p.id);

  it('드래그: 앞 → 뒤, 뒤 → 앞으로 옮긴다', () => {
    useTripStore.getState().reorderPlace(0, 2);
    expect(ids()).toEqual(['changdeokgung', 'bukchon', 'gyeongbokgung', 'insadong']);
    useTripStore.getState().reorderPlace(3, 0);
    expect(ids()).toEqual(['insadong', 'changdeokgung', 'bukchon', 'gyeongbokgung']);
  });

  it('범위를 벗어난 이동은 무시한다', () => {
    useTripStore.getState().reorderPlace(0, 9);
    expect(ids()).toEqual(['gyeongbokgung', 'changdeokgung', 'bukchon', 'insadong']);
  });

  it('출발지 복귀는 기본값이 켜짐', () => {
    expect(useTripStore.getState().returnToStart).toBe(true);
  });
});

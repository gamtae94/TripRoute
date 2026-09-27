import { mapWithConcurrency } from '../concurrency';

describe('mapWithConcurrency', () => {
  it('결과 순서를 입력 순서대로 보존한다', async () => {
    const items = [5, 1, 4, 2, 3];
    const results = await mapWithConcurrency(items, 2, async (n) => {
      await new Promise((r) => setTimeout(r, n));
      return n * 10;
    });
    expect(results).toEqual([50, 10, 40, 20, 30]);
  });

  it('동시에 실행되는 개수가 limit을 넘지 않는다', async () => {
    let current = 0;
    let max = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
      current++;
      max = Math.max(max, current);
      await new Promise((r) => setTimeout(r, 10));
      current--;
    });
    expect(max).toBeLessThanOrEqual(3);
    expect(max).toBeGreaterThan(1); // 순차 실행이 아니라 실제로 동시에 돌았는지 확인
  });

  it('limit이 items 수보다 많아도 정상 동작', async () => {
    expect(await mapWithConcurrency([1, 2], 10, async (n) => n + 1)).toEqual([2, 3]);
  });

  it('빈 배열', async () => {
    expect(await mapWithConcurrency([], 3, async (n) => n)).toEqual([]);
  });
});

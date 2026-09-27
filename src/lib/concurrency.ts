/**
 * items를 한 번에 최대 `limit`개씩만 동시에 처리한다 (결과 순서는 입력 순서를 보존).
 *
 * TMAP 등 외부 API는 무료/평가판 등급에서 초당 호출 수 제한(burst rate limit)이 낮은 경우가 많다.
 * 구간을 `Promise.all`로 한꺼번에 다 쏘면 그 순간 요청이 몰려 429(QUOTA_EXCEEDED)를 만날 수 있어서,
 * 구간·거점 API 호출은 이 함수로 동시 요청 수를 제한한다.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

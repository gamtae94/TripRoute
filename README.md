# TripRoute

여행지에서 갈 곳은 많은데 어디부터 가야 할지 모를때, 경로를 알려주는 앱

출발지와 방문할 장소들을 고르면 **최단 거리 / 최단 시간 / 최소 비용** 기준으로 최적 방문 순서(TSP)를 계산해 지도 위에 보여줍니다.

## 현재 단계: 1단계 (더미 데이터)

지도 API 연동 없이 화면 흐름과 최적화 로직을 먼저 완성한 상태입니다.

| 화면 | 파일 | 내용 |
| --- | --- | --- |
| 1. 출발지 설정 | `src/app/index.tsx` | 현재 위치(더미) 또는 검색, 출발 일시(선택) |
| 2. 장소 추가 | `src/app/places.tsx` | 자동완성 검색, 리스트 추가/삭제, ↑↓ 순서 조정 |
| 3. 수단·기준 | `src/app/options.tsx` | 기본 수단, 구간별 수단 혼합, 기준, 복귀·수동 순서 |
| 4. 결과 | `src/app/result.tsx` | 경로 미리보기 지도, 합계, 구간별 안내, 구간 수단 변경, 다시 계산 |

## 실행

```bash
npm install
npx expo start        # Expo Go 앱으로 QR 스캔, 또는 w 키로 웹 실행
npm run typecheck     # 타입 검사
npm test              # TSP·최적화 로직 테스트
```

## 구조

```
src/
  app/                    # Expo Router 화면 (파일 = 화면)
  components/             # PlaceSearch(자동완성), RouteMap(더미 지도), 공통 UI
  lib/
    tsp.ts                # Held-Karp(≤10곳) / Nearest Neighbor + 2-opt(>10곳)
    optimizer.ts          # 기준별 비용 행렬 생성, 구간별 수단 선택, 결과 조립
    fare.ts               # 평균 요금표 (대중교통/택시, 서울 기준)
  services/routing/
    types.ts              # RoutingProvider 인터페이스 + N×N 행렬 수집/캐싱
    dummyProvider.ts      # 1단계용 가짜 provider (직선거리 기반 추정)
  store/tripStore.ts      # Zustand 전역 상태
  data/dummyPlaces.ts     # 서울 명소 더미 데이터
```

### 최적화 방식

- 노드 0 = 출발지 고정. "출발지로 복귀"는 옵션.
- 기준(거리/시간/비용)에 따라 **구간 비용 행렬만 바꿔** 같은 알고리즘을 재사용합니다.
- "구간별로 다른 수단 허용"을 켜면 각 구간마다 기준상 가장 유리한 수단을 고른 뒤 그 값으로 행렬을 만듭니다 (도보는 2km 이내 구간만).
- 방문 장소 10곳 이하는 Held-Karp로 정확해, 초과 시 Nearest Neighbor + 2-opt 근사해.

## 미결정 사항에 대한 1단계 기본값

명세서 8장의 질문은 아래처럼 가정하고 진행했습니다. 바꾸려면 알려주세요.

- **대상 지역:** 국내(서울 더미 데이터)부터. provider 인터페이스로 분리해 두어 해외(Google) 추가 가능.
- **지도 API:** 2단계에서 카카오맵(REST: 키워드 검색·길찾기, 지도: WebView + JS SDK)로 시작하는 것을 가정.
- **복귀 여부:** 사용자가 토글로 선택 (기본값: 복귀 안 함).
- **요금:** 평균 요금표로 추정 (`src/lib/fare.ts`). 실시간 요금 API는 추후.

## 다음 단계 (API 연동)

1. `.env.example`을 `.env`로 복사하고 API 키 입력 (`src/config.ts`에서 읽음, 하드코딩 금지).
2. `RoutingProvider` 구현체 추가 (예: `KakaoRoutingProvider`) 후 `src/services/routing/index.ts`에서 교체.
   - `searchPlaces` → 키워드 장소 검색 API
   - `getLeg` → 길찾기 API. **`path`에 API가 반환한 실제 경로 좌표를 넣을 것** (현재는 더미 곡선)
3. `RouteMap`을 실제 지도 컴포넌트(카카오맵 WebView 또는 `react-native-maps`)로 교체.
4. 출발지 "현재 위치"를 `expo-location`으로 교체, 장소 리스트 드래그 정렬 추가.

> 참고: `EXPO_PUBLIC_` 환경변수는 앱 번들에 포함됩니다. 과금되는 REST API 키는 추후 백엔드 프록시를 두는 것을 권장합니다.

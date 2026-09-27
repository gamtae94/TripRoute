# TripRoute

여행지에서 갈 곳은 많은데 어디부터 가야 할지 모를때, 경로를 알려주는 앱

출발지와 가고 싶은 장소들을 고르면 **최단 거리 / 최단 시간 / 최소 비용** 기준으로 방문 순서를 최적화하고, 구간별 이동 수단·시간·요금을 지도와 함께 보여줍니다.

> 서비스 대상: **국내** (경로 데이터: TMAP). 해외 확장 계획은 [아래](#해외-확장-계획) 참고.

## 주요 기능

- **출발·복귀 설정** — 출발지로 복귀(기본값)하거나 마지막 장소에서 끝내기. 다른 도시로 가는 여행이면 **경유 거점**(기차역·터미널)을 후보로 넣어, 가는 길과 돌아오는 길에 서로 다른 거점을 자동으로 고르게 할 수 있습니다.
  예) 대전 집 → 대전역 → **서울역** → 서울 여행 → **영등포역** → 서대전역 → 집
- **장소 검색** — 키워드 자동완성으로 방문할 장소를 추가하고 순서를 직접 조정
- **선호 이동 수단 (1~3개)** — 도보 / 대중교통 / 택시·자동차 중 원하는 것만 골라, 구간마다 그 안에서 가장 유리한 수단을 사용
- **인원·분류별 요금** — 성인·청소년·어린이·영유아·경로·장애인 인원을 넣으면 API 요금에 할인 규칙을 적용해 일행 전체 비용을 계산
- **결과 화면** — 방문 순서, 경로 미리보기, 총 시간·거리·비용, 구간별 안내
- **구간 재검색** — 결과에서 특정 지점부터 특정 지점까지 골라, 그 구간만 다른 수단으로 다시 검색
- **설정 탭** — 경로 데이터(더미/TMAP) 선택, TMAP 키 입력(기기 보안 저장소에 저장), API 호출 방식 선택

## 실행

```bash
npm install
npx expo start        # Expo Go 앱으로 QR 스캔, 또는 w 키로 웹 실행
npm run lint          # 린트
npm run typecheck     # 타입 검사
npm test              # 최적화·요금·TMAP 응답 파싱 테스트
```

API 키 없이도 **더미 데이터**(서울 명소, 서울·대전 주요 역)로 전체 흐름을 확인할 수 있습니다.

## API 키 설정

1. [SK open API](https://openapi.sk.com)에서 TMAP 앱을 등록하고 appKey를 발급받습니다. 대중교통 API는 별도 사용 신청이 필요합니다.
2. 앱의 **설정 탭 → 경로 데이터: TMAP → appKey 입력 → 연결 테스트**.

키는 iOS Keychain / Android Keystore(expo-secure-store)에 저장되고, 코드나 앱 번들에는 들어가지 않습니다.
개발 중에는 `.env.example`을 `.env`로 복사해 `EXPO_PUBLIC_TMAP_APP_KEY`에 넣어 둘 수도 있습니다 (설정 탭 입력값이 우선).
공개 배포 시에는 키를 서버에 두는 프록시 방식으로 전환할 계획입니다 → [docs/api-key-management.md](docs/api-key-management.md)

## 프로젝트 구조

```
src/
  app/                      # Expo Router 화면 (파일 = 화면)
    _layout.tsx             # 하단 탭: 경로 만들기 / 설정
    (plan)/                 # 출발·복귀 → 장소 추가 → 수단·인원 → 결과
    settings.tsx
  components/               # PlaceSearch(자동완성), RouteMap(경로 미리보기), 공통 UI
  lib/
    tsp.ts                  # Held-Karp(≤10곳) / Nearest Neighbor + 2-opt
    optimizer.ts            # 거점 조합·수단 선택·비용 행렬·결과 조립
    fare.ts                 # 인원·분류별 요금 규칙
    estimate.ts             # 직선거리 기반 추정 (더미·추정 전략용)
  services/
    routing/                # RoutingProvider 인터페이스, TMAP·더미 구현, 캐싱
    routePlanner.ts         # 경로 계산·구간 재검색 흐름
    secureStorage.ts
  store/                    # Zustand (여행 설정, 앱 설정)
docs/                       # 설계·결정 문서
```

## 해외 확장 계획

현재는 국내 전용이지만, 확장을 고려해 아래처럼 나눠 두었습니다.

- 지도·경로 API는 `RoutingProvider` 인터페이스 뒤에 있어, 해외용 구현체(예: Google Maps Platform의 Places / Routes API)를 추가하고 `getRoutingProvider()`에서 좌표·국가에 따라 고르면 됩니다.
- 요금 할인 규칙(`lib/fare.ts`)은 국내 기준이므로, 해외 지원 시 국가별 규칙 테이블과 통화 단위(현재 원화 고정)를 분리해야 합니다.
- 화면 문구는 한국어로 하드코딩되어 있어, 다국어 지원 시 i18n 도입이 필요합니다.

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/api-selection.md](docs/api-selection.md) | 네이버·TMAP·카카오 API 비교와 TMAP 선정 이유 |
| [docs/routing.md](docs/routing.md) | 최적화 알고리즘, 거점, 수단 선택, 구간 재검색, 요금 계산 규칙 |
| [docs/api-key-management.md](docs/api-key-management.md) | API 키 입력 방식 검토 (설정 탭 / .env / 프록시 서버) |

> **README 작성 원칙**: README에는 처음 보는 사람이 알아야 할 것(무엇을 하는 앱인지, 주요 기능 요약, 실행·설정 방법, 구조)만 두고,
> 알고리즘·API 비교·설계 결정 같은 상세 내용은 `docs/`로 분리합니다. 주요 기능을 README에 요약하는 것은 일반적인 관행이지만,
> 기능이 늘수록 README가 명세서처럼 길어지지 않게 유지하는 것이 목적입니다.

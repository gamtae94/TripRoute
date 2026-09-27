# 경로 API 선정: TMAP

## 필요한 기능

| 기능 | 용도 |
| --- | --- |
| 장소 키워드 검색 | 출발지·거점·방문 장소 자동완성 |
| 도보 경로 | 가까운 구간 |
| 대중교통 경로 + 요금 | 시내 버스·지하철, 도시 간 기차·고속버스 (거점 경유 여행) |
| 자동차 경로 + 택시 요금 | 택시·자동차 구간 |
| 실제 경로 좌표 | 지도에 도로·노선을 따라 경로선 그리기 |

## 비교 (2026-09 조사)

| | 네이버 (NAVER Cloud Maps) | **TMAP (SK open API)** | 카카오 (Kakao / 카카오모빌리티) |
| --- | --- | --- | --- |
| 장소 검색 | 별도 검색 API (지역 검색) | POI 통합검색 | 로컬 API 키워드 검색 |
| 자동차 경로 | Directions 5/15 | 자동차 경로안내 (택시 요금 포함) | 자동차 길찾기 |
| 도보 경로 | **미제공** | 보행자 경로안내 | 제휴 파트너 전용 |
| 대중교통 경로 | **미제공** | 대중교통 API (요금 포함, 버스·지하철·기차·고속/시외버스·항공·해운) | 일반 개발자 공개 API로는 확인되지 않음 |
| 지도 표시 | Web/모바일 SDK | Web(JS) / 모바일 SDK | Web(JS) SDK |

- **네이버**: Directions API가 자동차 경로만 제공해 도보·대중교통 비교가 필요한 이 앱에는 **부적합**.
- **TMAP**: 필요한 기능을 모두 한 키(appKey)로 제공해 **가능**. 대중교통 API는 기차·고속버스까지 포함하므로 "대전 집 → 서울역" 같은 도시 간 구간도 한 번에 조회된다.
- **카카오**: 자동차 길찾기는 공개돼 있지만, 도보는 제휴 전용이고 대중교통 공개 API는 확인되지 않아 TMAP보다 불리.

→ 조건("네이버 또는 TMAP이 가능하면 사용, 불가능하면 카카오")에 따라 **TMAP으로 결정**.

## 사용하는 TMAP 엔드포인트

`src/services/routing/tmapProvider.ts`

| 기능 | 요청 |
| --- | --- |
| 장소 검색 | `GET https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=…` |
| 자동차 | `POST https://apis.openapi.sk.com/tmap/routes?version=1` → `totalDistance`, `totalTime`, `taxiFare` |
| 도보 | `POST https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1` |
| 대중교통 | `POST https://apis.openapi.sk.com/transit/routes` → `itineraries[].fare.regular.totalFare`, `legs[].mode` |

인증은 모든 요청에 `appKey` 헤더. 좌표계는 WGS84.

## 주의 사항

- **호출량·요금제**: 무료 제공량과 초과 과금은 상품별로 다르고 바뀔 수 있음. 특히 대중교통 API는 별도 신청·요금제가 있으므로 콘솔에서 반드시 확인할 것.
  이 앱은 호출 수를 줄이려고 기본값으로 "추정 후 확정" 방식을 쓴다 ([routing.md](routing.md#api-호출-전략)).
- **응답 형식 검증**: 파서는 공개 문서·예제를 바탕으로 작성했고 모의 응답으로 테스트했다. 실제 키로 처음 연동할 때 응답을 한 번 확인해야 한다.
- **요금 분류**: TMAP 대중교통 요금은 성인 기준 값만 준다. 청소년·어린이 등 분류별 요금은 앱에서 할인 규칙으로 계산한다 ([routing.md](routing.md#요금-계산)).

## 참고

- [TMAP 대중교통 API 가이드](https://transit.tmapmobility.com/)
- [SK open API — TMAP](https://openapi.sk.com/products/detail?svcSeq=4)
- [NAVER Cloud — Directions 5 API 참조서](https://apidocs.ncloud.com/ko/ai-naver/maps_directions/)
- [카카오모빌리티 — 길찾기 API](https://developers.kakaomobility.com/product/naviapi.html)

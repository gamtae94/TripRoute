# API 키 입력 방식 검토

## 후보

| 방식 | 장점 | 단점 |
| --- | --- | --- |
| **A. `.env` (`EXPO_PUBLIC_*`)** | 설정이 간단함 | 빌드할 때 앱 번들에 **평문으로 포함**되어 추출 가능. 키를 바꾸려면 다시 빌드해야 함 |
| **B. 앱 설정 탭에서 입력** | 번들에 키가 없음. 기기 보안 저장소(Keychain/Keystore)에 저장. 키를 바꿔도 재빌드 불필요 | 사용자가 직접 키를 발급받아야 함 → 일반 사용자 대상 서비스에는 맞지 않음 |
| **C. 백엔드 프록시** | 키가 서버에만 있음. 호출량 제한·캐싱·과금 관리를 서버에서 할 수 있음 | 서버를 만들고 운영해야 함 |

## 결정

- **지금 (개발·개인 사용 단계)**: **B. 설정 탭**을 적용했다. `.env`는 개발 편의용으로만 두고, 설정 탭 입력값이 우선한다.
  - 저장: `expo-secure-store` (iOS Keychain / Android Keystore). 웹에서는 보안 저장소를 쓸 수 없어 `localStorage`를 쓴다 (개발 확인용).
  - "연결 테스트" 버튼으로 키가 유효한지 바로 확인한다.
- **공개 배포 시**: **C. 프록시**가 더 나은 방식이다. 사용자가 키를 입력할 필요가 없고, 키도 노출되지 않는다. 전환할 때는:
  1. 서버(예: Expo Router API Routes + EAS Hosting, 또는 Cloudflare Workers)에 TMAP 호출을 중계하는 엔드포인트를 만든다.
  2. 같은 `RoutingProvider` 인터페이스로 `ProxyRoutingProvider`를 구현한다.
  3. 설정 탭의 키 입력은 개발자 옵션으로 옮긴다.

  화면·최적화 코드는 provider 인터페이스만 쓰므로 바꿀 필요가 없다.

## 구현 위치

- `src/app/settings.tsx` — 설정 화면
- `src/store/settingsStore.ts` — 키·설정 로드/저장, 우선순위(설정 탭 → `.env`)
- `src/services/secureStorage.ts` — 보안 저장소 래퍼
- `src/services/routing/index.ts` — 설정에 따라 provider 선택

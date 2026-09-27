/**
 * 개발용 기본 API 키 (.env, .env.example 참고). 코드에 하드코딩 금지.
 * 앱에서는 설정 탭에 입력한 키가 우선한다.
 * EXPO_PUBLIC_ 변수는 빌드 시 앱 번들에 그대로 포함되므로 배포 빌드에는 넣지 않는다.
 */
export const config = {
  tmapAppKey: process.env.EXPO_PUBLIC_TMAP_APP_KEY ?? '',
};

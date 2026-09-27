/**
 * API 키는 .env 파일에서 읽는다 (.env.example 참고). 코드에 하드코딩 금지.
 * EXPO_PUBLIC_ 접두사 변수는 앱 번들에 포함되므로, 과금 API의 REST 키는
 * 추후 백엔드 프록시를 두는 것을 권장한다.
 */
export const config = {
  kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '',
  kakaoJsKey: process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '',
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
};

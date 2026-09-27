import type { Place } from '../types';

/** 1단계(API 미연동)용 더미 장소 데이터 — 서울 주요 명소 */
export const DUMMY_PLACES: Place[] = [
  { id: 'gyeongbokgung', name: '경복궁', address: '서울 종로구 사직로 161', category: '관광명소', coord: { latitude: 37.5796, longitude: 126.977 } },
  { id: 'changdeokgung', name: '창덕궁', address: '서울 종로구 율곡로 99', category: '관광명소', coord: { latitude: 37.5794, longitude: 126.991 } },
  { id: 'bukchon', name: '북촌한옥마을', address: '서울 종로구 계동길 37', category: '관광명소', coord: { latitude: 37.5826, longitude: 126.9831 } },
  { id: 'insadong', name: '인사동', address: '서울 종로구 인사동길', category: '쇼핑', coord: { latitude: 37.574, longitude: 126.985 } },
  { id: 'ikseondong', name: '익선동 한옥거리', address: '서울 종로구 익선동', category: '카페거리', coord: { latitude: 37.5743, longitude: 126.9897 } },
  { id: 'cheonggyecheon', name: '청계천', address: '서울 종로구 창신동', category: '산책', coord: { latitude: 37.5696, longitude: 126.9784 } },
  { id: 'gwangjang', name: '광장시장', address: '서울 종로구 창경궁로 88', category: '시장', coord: { latitude: 37.57, longitude: 126.9996 } },
  { id: 'ddp', name: '동대문디자인플라자', address: '서울 중구 을지로 281', category: '문화시설', coord: { latitude: 37.5665, longitude: 127.0092 } },
  { id: 'myeongdong', name: '명동', address: '서울 중구 명동길', category: '쇼핑', coord: { latitude: 37.5636, longitude: 126.9827 } },
  { id: 'namsan', name: 'N서울타워', address: '서울 용산구 남산공원길 105', category: '관광명소', coord: { latitude: 37.5512, longitude: 126.9882 } },
  { id: 'itaewon', name: '이태원', address: '서울 용산구 이태원로', category: '음식점', coord: { latitude: 37.5345, longitude: 126.9946 } },
  { id: 'hongdae', name: '홍대입구', address: '서울 마포구 양화로', category: '거리', coord: { latitude: 37.5572, longitude: 126.9245 } },
  { id: 'yeouido', name: '여의도 한강공원', address: '서울 영등포구 여의동로 330', category: '공원', coord: { latitude: 37.5284, longitude: 126.934 } },
  { id: 'seoulforest', name: '서울숲', address: '서울 성동구 뚝섬로 273', category: '공원', coord: { latitude: 37.5444, longitude: 127.0374 } },
  { id: 'garosugil', name: '가로수길', address: '서울 강남구 신사동', category: '쇼핑', coord: { latitude: 37.5205, longitude: 127.023 } },
  { id: 'coex', name: '코엑스', address: '서울 강남구 영동대로 513', category: '문화시설', coord: { latitude: 37.5116, longitude: 127.0595 } },
  { id: 'lotteworldtower', name: '롯데월드타워', address: '서울 송파구 올림픽로 300', category: '관광명소', coord: { latitude: 37.5125, longitude: 127.1025 } },
];

/** 출발지로 자주 쓰이는 지점 (역·공항 등) */
export const DUMMY_ORIGINS: Place[] = [
  { id: 'seoulstation', name: '서울역', address: '서울 용산구 한강대로 405', category: '기차역', coord: { latitude: 37.5547, longitude: 126.9707 } },
  { id: 'gangnamstation', name: '강남역', address: '서울 강남구 강남대로 396', category: '지하철역', coord: { latitude: 37.4979, longitude: 127.0276 } },
  { id: 'gimpoairport', name: '김포공항', address: '서울 강서구 하늘길 112', category: '공항', coord: { latitude: 37.5586, longitude: 126.7944 } },
  { id: 'express-terminal', name: '서울고속버스터미널', address: '서울 서초구 신반포로 194', category: '터미널', coord: { latitude: 37.5049, longitude: 127.0049 } },
];

/** GPS 연동 전 "현재 위치" 버튼이 반환하는 더미 좌표 */
export const DUMMY_CURRENT_LOCATION: Place = {
  id: 'current-location',
  name: '현재 위치',
  address: '서울 중구 세종대로 110 (더미)',
  coord: { latitude: 37.5663, longitude: 126.9779 },
};

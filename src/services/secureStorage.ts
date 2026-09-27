import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * API 키 등 민감한 설정 저장소.
 * - iOS/Android: expo-secure-store (Keychain / Keystore 암호화 저장)
 * - Web: SecureStore 미지원 → localStorage (개발 확인용, 암호화되지 않음)
 */
const isWeb = Platform.OS === 'web';

export async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // 저장 불가 환경(시크릿 모드 등)은 무시
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // 무시
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorageIsEncrypted = !isWeb;

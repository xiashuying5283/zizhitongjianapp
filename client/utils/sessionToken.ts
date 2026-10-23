import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'zizhitongjian_session_token';

export function getSessionToken(): Promise<string | null> {
  return Platform.OS === 'web' ? AsyncStorage.getItem(KEY) : SecureStore.getItemAsync(KEY);
}

export function setSessionToken(token: string): Promise<void> {
  return Platform.OS === 'web' ? AsyncStorage.setItem(KEY, token) : SecureStore.setItemAsync(KEY, token);
}

export function removeSessionToken(): Promise<void> {
  return Platform.OS === 'web' ? AsyncStorage.removeItem(KEY) : SecureStore.deleteItemAsync(KEY);
}

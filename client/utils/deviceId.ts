import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'zizhitongjian_device_id';

// 内存缓存，避免每次都读取 AsyncStorage
let cachedDeviceId: string | null = null;

/**
 * 获取或创建设备ID
 * 首次调用时生成UUID并存储，后续调用从缓存中读取
 */
export async function getDeviceId(): Promise<string> {
  // 优先使用内存缓存
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    // 尝试从存储中获取
    const storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (storedId) {
      cachedDeviceId = storedId; // 缓存到内存
      return storedId;
    }

    // 生成新的设备ID
    const newId = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    cachedDeviceId = newId; // 缓存到内存
    return newId;
  } catch (error) {
    console.error('获取设备ID失败:', error);
    // 降级：返回临时ID
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

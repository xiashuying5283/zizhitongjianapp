import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device_id';

// 获取设备ID（首次生成后存储）
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return Crypto.randomUUID(); // 临时返回
  }
}

// 批注数据结构
export interface Annotation {
  id: number;
  volume_number: number;
  paragraph_id: number;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  annotation: string;
  device_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnotationParams {
  volume_number: number;
  paragraph_id: number;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  annotation: string;
}

/**
 * 服务端文件：server/src/routes/annotations.ts
 * 接口：GET /api/v1/annotations
 * Query 参数：deviceId: string, volumeNumber?: number, paragraphId?: number
 */
export async function fetchAnnotations(params: {
  deviceId: string;
  volumeNumber?: number;
  paragraphId?: number;
}): Promise<Annotation[]> {
  const queryParams = new URLSearchParams({ deviceId: params.deviceId });
  if (params.volumeNumber) {
    queryParams.append('volumeNumber', params.volumeNumber.toString());
  }
  if (params.paragraphId) {
    queryParams.append('paragraphId', params.paragraphId.toString());
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/annotations?${queryParams.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch annotations');
  }

  const result = await response.json();
  return result.data;
}

/**
 * 服务端文件：server/src/routes/annotations.ts
 * 接口：POST /api/v1/annotations
 * Body 参数：volume_number: number, paragraph_id: number, selected_text: string, start_offset: number, end_offset: number, annotation: string, device_id: string
 */
export async function createAnnotation(
  params: CreateAnnotationParams,
  deviceId: string
): Promise<Annotation> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/annotations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        device_id: deviceId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create annotation');
  }

  const result = await response.json();
  return result.data;
}

/**
 * 服务端文件：server/src/routes/annotations.ts
 * 接口：PUT /api/v1/annotations/:id
 * Path 参数：id: number
 * Body 参数：annotation: string
 */
export async function updateAnnotation(
  id: number,
  annotation: string
): Promise<Annotation> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/annotations/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotation }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update annotation');
  }

  const result = await response.json();
  return result.data;
}

/**
 * 服务端文件：server/src/routes/annotations.ts
 * 接口：DELETE /api/v1/annotations/:id
 * Path 参数：id: number
 * Query 参数：deviceId: string
 */
export async function deleteAnnotation(
  id: number,
  deviceId: string
): Promise<void> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/annotations/${id}?deviceId=${deviceId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete annotation');
  }
}

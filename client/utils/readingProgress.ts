import { getDeviceId } from './deviceId';
import { getStoredUser } from './auth';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export interface RecentRead {
  id: number;
  volume: number;
  name: string;
  era: string;
  year: string;
  progress: number;
  lastParagraphIndex: number;
  lastReadAt: string;
}

export interface ReadingRecord {
  volumeNumber: number;
  progress: number;
  lastParagraphIndex: number;
  lastReadAt: string;
  status: 'unread' | 'reading' | 'read';
  volumeInfo: {
    id: number;
    name: string;
    era: string;
    emperor: string;
    year: string;
  } | null;
}

export interface ReadingStatus {
  status: 'unread' | 'reading' | 'read';
  progress: number;
}

/**
 * 获取用户标识（优先用户ID，其次设备ID）
 */
async function getUserIdentity(): Promise<{ userId?: number; deviceId?: string }> {
  const user = await getStoredUser();
  if (user) {
    return { userId: user.id };
  }
  const deviceId = await getDeviceId();
  return { deviceId };
}

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：GET /api/v1/reading-progress/recent
 * Query 参数：userId?: number, deviceId?: string
 */
export async function getRecentRead(): Promise<RecentRead | null> {
  try {
    const { userId, deviceId } = await getUserIdentity();
    const params = new URLSearchParams();
    if (userId) params.append('userId', String(userId));
    if (deviceId) params.append('deviceId', deviceId);

    const response = await fetch(
      `${BASE_URL}/api/v1/reading-progress/recent?${params.toString()}`
    );
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('获取最近阅读失败:', error);
    return null;
  }
}

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：GET /api/v1/reading-progress
 * Query 参数：userId?: number, deviceId?: string
 */
export async function getReadingRecords(): Promise<ReadingRecord[]> {
  try {
    const { userId, deviceId } = await getUserIdentity();
    const params = new URLSearchParams();
    if (userId) params.append('userId', String(userId));
    if (deviceId) params.append('deviceId', deviceId);

    const response = await fetch(
      `${BASE_URL}/api/v1/reading-progress?${params.toString()}`
    );
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('获取阅读记录失败:', error);
    return [];
  }
}

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：POST /api/v1/reading-progress
 * Body 参数：userId?: number, deviceId?: string, volumeNumber: number, progress?: number, lastParagraphIndex?: number
 */
export async function updateReadingProgress(
  volumeNumber: number,
  progress: number,
  lastParagraphIndex: number = 0
): Promise<boolean> {
  try {
    const { userId, deviceId } = await getUserIdentity();

    const response = await fetch(`${BASE_URL}/api/v1/reading-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        deviceId,
        volumeNumber,
        progress,
        lastParagraphIndex,
      }),
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('更新阅读进度失败:', error);
    return false;
  }
}

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：GET /api/v1/reading-progress/status
 * Query 参数：userId?: number, deviceId?: string, volumeNumbers: string
 */
export async function getReadingStatus(
  volumeNumbers: number[]
): Promise<Record<number, ReadingStatus>> {
  try {
    const { userId, deviceId } = await getUserIdentity();
    const params = new URLSearchParams();
    if (userId) params.append('userId', String(userId));
    if (deviceId) params.append('deviceId', deviceId);
    params.append('volumeNumbers', volumeNumbers.join(','));

    const response = await fetch(
      `${BASE_URL}/api/v1/reading-progress/status?${params.toString()}`
    );
    const result = await response.json();
    return result.success ? result.data : {};
  } catch (error) {
    console.error('获取阅读状态失败:', error);
    return {};
  }
}

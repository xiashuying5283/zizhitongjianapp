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
  volumeId: number;
  paraId: number;
  charIndex: number;
  contentType: number;
  readPercent: number;
  updateTime: string;
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
 * 需要登录用户，未登录返回 null
 */
export async function getRecentRead(): Promise<RecentRead | null> {
  try {
    const { userId } = await getUserIdentity();
    if (!userId) return null;

    const params = new URLSearchParams({ userId: String(userId) });
    const response = await fetch(`${BASE_URL}/api/v1/reading-progress/recent?${params.toString()}`);
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
 * 需要登录用户，未登录返回空数组
 */
export async function getReadingRecords(): Promise<ReadingRecord[]> {
  try {
    const { userId } = await getUserIdentity();
    if (!userId) return [];

    const params = new URLSearchParams({ userId: String(userId) });
    const response = await fetch(`${BASE_URL}/api/v1/reading-progress?${params.toString()}`);
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
 * Body: { userId, volumeNumber, paraId, charIndex, contentType, readPercent }
 * 需要登录用户，未登录不保存
 */
export async function updateReadingProgress(params: {
  volumeNumber: number;
  paraId: number;
  readPercent: number;
  charIndex?: number;
  contentType?: number;
}): Promise<boolean> {
  try {
    const { userId } = await getUserIdentity();
    if (!userId) return false;

    const response = await fetch(`${BASE_URL}/api/v1/reading-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        volumeNumber: params.volumeNumber,
        paraId: params.paraId,
        charIndex: params.charIndex ?? 0,
        contentType: params.contentType ?? 0,
        readPercent: params.readPercent,
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
 * 需要登录用户，未登录返回空对象
 */
export async function getReadingStatus(
  volumeNumbers: number[]
): Promise<Record<number, ReadingStatus>> {
  try {
    const { userId } = await getUserIdentity();
    if (!userId) return {};

    const params = new URLSearchParams({
      userId: String(userId),
      volumeNumbers: volumeNumbers.join(','),
    });

    const response = await fetch(`${BASE_URL}/api/v1/reading-progress/status?${params.toString()}`);
    const result = await response.json();
    return result.success ? result.data : {};
  } catch (error) {
    console.error('获取阅读状态失败:', error);
    return {};
  }
}

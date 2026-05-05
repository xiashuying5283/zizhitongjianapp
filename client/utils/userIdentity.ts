import { getStoredUser } from './auth';
import { getDeviceId } from './deviceId';

/**
 * 获取用户标识（优先用户ID，其次设备ID）
 */
export async function getUserIdentity(): Promise<{ userId?: number; deviceId?: string }> {
  const user = await getStoredUser();
  if (user) {
    return { userId: user.id };
  }

  const deviceId = await getDeviceId();
  return { deviceId };
}

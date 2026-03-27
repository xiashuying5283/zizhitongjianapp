import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'zizhitongjian_user';

// 内存缓存，避免每次都读取 AsyncStorage
let cachedUser: User | null | undefined = undefined; // undefined 表示未初始化

export interface User {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  createdAt: string;
}

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：POST /api/v1/auth/register
 * Body 参数：username: string, password: string, nickname?: string
 */
export async function register(
  username: string,
  password: string,
  nickname?: string
): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, nickname }),
    });
    const result = await response.json();

    if (result.success && result.data) {
      await saveUser(result.data);
      return { success: true, user: result.data };
    }
    return { success: false, message: result.message || '注册失败' };
  } catch (error) {
    console.error('注册失败:', error);
    return { success: false, message: '网络错误，请稍后重试' };
  }
}

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：POST /api/v1/auth/login
 * Body 参数：username: string, password: string
 */
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();

    if (result.success && result.data) {
      await saveUser(result.data);
      return { success: true, user: result.data };
    }
    return { success: false, message: result.message || '登录失败' };
  } catch (error) {
    console.error('登录失败:', error);
    return { success: false, message: '网络错误，请稍后重试' };
  }
}

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：GET /api/v1/auth/check-username
 * Query 参数：username: string
 */
export async function checkUsername(username: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${BASE_URL}/api/v1/auth/check-username?username=${encodeURIComponent(username)}`
    );
    const result = await response.json();
    return result.data?.available ?? false;
  } catch (error) {
    console.error('检查用户名失败:', error);
    return true;
  }
}

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：PUT /api/v1/auth/profile
 * Body 参数：userId: number, nickname?: string, avatar?: string
 */
export async function updateProfile(
  userId: number,
  data: { nickname?: string; avatar?: string }
): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    });
    const result = await response.json();

    if (result.success && result.data) {
      await saveUser(result.data);
      return { success: true, user: result.data };
    }
    return { success: false, message: result.message || '更新失败' };
  } catch (error) {
    console.error('更新用户资料失败:', error);
    return { success: false, message: '网络错误，请稍后重试' };
  }
}

/**
 * 保存用户信息到本地存储
 */
export async function saveUser(user: User): Promise<void> {
  cachedUser = user; // 更新缓存
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * 获取本地存储的用户信息
 */
export async function getStoredUser(): Promise<User | null> {
  // 优先使用内存缓存
  if (cachedUser !== undefined) {
    return cachedUser;
  }

  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (userStr) {
      const parsed = JSON.parse(userStr) as User;
      cachedUser = parsed;
      return parsed;
    }
    cachedUser = null;
    return null;
  } catch {
    cachedUser = null;
    return null;
  }
}

/**
 * 清除本地存储的用户信息（登出）
 */
export async function clearUser(): Promise<void> {
  cachedUser = null; // 清除缓存
  await AsyncStorage.removeItem(USER_KEY);
}

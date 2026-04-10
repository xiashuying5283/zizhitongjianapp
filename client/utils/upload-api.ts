import { createFormDataFile } from '@/utils';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export interface UploadResult {
  success: boolean;
  data?: {
    url: string;
    key?: string;
  };
  message?: string;
}

/**
 * 上传图片到服务器
 * @param uri 本地图片URI
 * @param userId 用户ID
 */
export async function uploadImage(uri: string, userId: string): Promise<UploadResult> {
  try {
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    // 正确映射 MIME 类型（jpg -> jpeg）
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

    // 使用 createFormDataFile 创建跨平台兼容的文件对象
    const file = await createFormDataFile(uri, filename, mimeType);
    const formData = new FormData();
    formData.append('file', file as any);
    formData.append('userId', userId);

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/upload/image`, {
      method: 'POST',
      body: formData,
    });

    return response.json();
  } catch (error) {
    console.error('Upload image error:', error);
    return { success: false, message: '上传失败' };
  }
}

/**
 * 上传头像
 * @param uri 本地图片URI
 * @param userId 用户ID
 */
export async function uploadAvatar(uri: string, userId: string): Promise<UploadResult> {
  try {
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    // 正确映射 MIME 类型（jpg -> jpeg）
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

    // 使用 createFormDataFile 创建跨平台兼容的文件对象
    const file = await createFormDataFile(uri, filename, mimeType);
    const formData = new FormData();
    formData.append('file', file as any);
    formData.append('userId', userId);

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/upload/avatar`, {
      method: 'POST',
      body: formData,
    });

    return response.json();
  } catch (error) {
    console.error('Upload avatar error:', error);
    return { success: false, message: '上传失败' };
  }
}

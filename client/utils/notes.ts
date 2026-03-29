import { getDeviceId } from './deviceId';
import { getStoredUser } from './auth';

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

// 用户笔记数据结构
export interface UserNote {
  id: number;
  volumeNumber: number;
  paragraphId: number;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  noteContent: string | null;
  color: string;
  markType: 'background' | 'underline' | 'wavy';
  createdAt: string;
  updatedAt: string;
  volumeInfo?: {
    eraName: string;
    dynasty: string;
    volumeName: string;
  } | null;
}

export interface CreateUserNoteParams {
  volumeNumber: number;
  paragraphId: number;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  noteContent?: string;
  color?: string;
  markType?: 'background' | 'underline' | 'wavy';
}

export interface TextSelection {
  paragraphId: number | null;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  menuPosition?: {
    top: number;
    left: number;
    width: number;
  };
}

// 用于 WebView 渲染的简化标注数据
export interface NoteMarker {
  id: number;
  paragraphId: number;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  noteContent: string | null;
  color: string;
  markType: 'background' | 'underline' | 'wavy';
}

/**
 * 创建用户笔记（标注）
 * 服务端文件：server/src/routes/notes.ts
 * 接口：POST /api/v1/notes
 */
export async function createUserNote(
  params: CreateUserNoteParams
): Promise<UserNote> {
  const identity = await getUserIdentity();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...identity,
        volumeNumber: params.volumeNumber,
        paragraphId: params.paragraphId,
        startOffset: params.startOffset,
        endOffset: params.endOffset,
        highlightedText: params.highlightedText,
        noteContent: params.noteContent || null,
        color: params.color || '#FECACA',
        markType: params.markType || 'background',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create note');
  }

  const result = await response.json();
  return result.data;
}

/**
 * 获取用户笔记列表
 * 服务端文件：server/src/routes/notes.ts
 * 接口：GET /api/v1/notes
 */
export async function fetchUserNotes(params?: {
  volumeNumber?: number;
  paragraphId?: number;
}): Promise<UserNote[]> {
  const identity = await getUserIdentity();

  const queryParams = new URLSearchParams();
  if (identity.userId) {
    queryParams.append('userId', identity.userId.toString());
  } else if (identity.deviceId) {
    queryParams.append('deviceId', identity.deviceId);
  }

  if (params?.volumeNumber) {
    queryParams.append('volumeNumber', params.volumeNumber.toString());
  }
  if (params?.paragraphId) {
    queryParams.append('paragraphId', params.paragraphId.toString());
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notes?${queryParams.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch notes');
  }

  const result = await response.json();
  return result.data;
}

/**
 * 更新用户笔记
 * 服务端文件：server/src/routes/notes.ts
 * 接口：PUT /api/v1/notes/:id
 */
export async function updateUserNote(
  id: number,
  params: { noteContent?: string; color?: string; markType?: 'background' | 'underline' | 'wavy' }
): Promise<void> {
  const identity = await getUserIdentity();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notes/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...identity,
        ...params,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update note');
  }
}

/**
 * 删除用户笔记
 * 服务端文件：server/src/routes/notes.ts
 * 接口：DELETE /api/v1/notes/:id
 */
export async function deleteUserNote(
  id: number
): Promise<void> {
  const identity = await getUserIdentity();

  const queryParams = new URLSearchParams();
  if (identity.userId) {
    queryParams.append('userId', identity.userId.toString());
  } else if (identity.deviceId) {
    queryParams.append('deviceId', identity.deviceId);
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notes/${id}?${queryParams.toString()}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete note');
  }
}

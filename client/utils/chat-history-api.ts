/**
 * 聊天记录管理
 * 从数据库获取/保存聊天记录
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

// 获取设备ID
async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    await AsyncStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

export interface ChatRoom {
  id: string;
  topicId: string;
  topicTitle: string;
  characterIds: string[];
  status: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  characterId: string | null;
  characterName: string;
  content: string;
  isUser: boolean;
  createdAt: string;
}

// 获取聊天记录列表
export async function fetchChatHistoryList(): Promise<ChatRoom[]> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat-history`, {
      headers: {
        'X-Device-Id': deviceId,
      },
    });
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('获取聊天记录列表失败:', error);
    return [];
  }
}

// 创建新会话
export async function createChatRoom(topicId: string, topicTitle: string, characterIds: string[]): Promise<ChatRoom | null> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({
        topicId,
        topicTitle,
        characterIds,
      }),
    });
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('创建会话失败:', error);
    return null;
  }
}

// 获取会话详情和消息
export async function fetchChatRoomDetail(roomId: string): Promise<{ room: ChatRoom; messages: ChatMessage[] } | null> {
  try {
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat-history/${roomId}`);
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('获取会话详情失败:', error);
    return null;
  }
}

// 添加消息
export async function addChatMessage(
  roomId: string,
  characterId: string | null,
  characterName: string,
  content: string,
  isUser: boolean
): Promise<ChatMessage | null> {
  try {
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat-history/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        characterId,
        characterName,
        content,
        isUser,
      }),
    });
    
    // 检查响应状态
    if (!response.ok) {
      console.error('添加消息失败：HTTP', response.status, response.statusText);
      return null;
    }
    
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('添加消息失败：', error);
    return null;
  }
}

// 删除会话
export async function deleteChatRoom(roomId: string): Promise<boolean> {
  try {
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat-history/${roomId}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('删除会话失败:', error);
    return false;
  }
}

// 清空消息
export async function clearChatMessages(roomId: string): Promise<boolean> {
  try {
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat-history/${roomId}/messages`, {
      method: 'DELETE',
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('清空消息失败:', error);
    return false;
  }
}

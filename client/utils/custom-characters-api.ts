/**
 * 自定义角色 API
 */
import { Character } from './characters-api';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

// 自定义角色类型
export interface CustomCharacter {
    id: string;
    name: string;
    dynasty: string;
    title: string;
    personality: string;
    speaking_style: string;
    avatar: string;
    owner_id: string;
    created_at: string;
}

// 获取所有自定义角色
export async function fetchCustomCharacters(): Promise<CustomCharacter[]> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/custom-characters`);
        const result = await response.json();

        if (result.success && result.data) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error('获取自定义角色失败:', error);
        return [];
    }
}

// 获取单个自定义角色
export async function fetchCustomCharacter(id: string): Promise<CustomCharacter | null> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/custom-characters/${id}`);
        const result = await response.json();

        if (result.success && result.data) {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error('获取自定义角色失败:', error);
        return null;
    }
}

// 创建自定义角色
export async function createCustomCharacter(data: {
    name: string;
    dynasty?: string;
    title?: string;
    personality?: string;
    speaking_style?: string;
}): Promise<CustomCharacter | null> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/custom-characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();

        if (result.success && result.data) {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error('创建自定义角色失败:', error);
        return null;
    }
}

// 更新自定义角色
export async function updateCustomCharacter(
    id: string,
    data: {
        name?: string;
        dynasty?: string;
        title?: string;
        personality?: string;
        speaking_style?: string;
    }
): Promise<CustomCharacter | null> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/custom-characters/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();

        if (result.success && result.data) {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error('更新自定义角色失败:', error);
        return null;
    }
}

// 删除自定义角色
export async function deleteCustomCharacter(id: string): Promise<boolean> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/custom-characters/${id}`, {
            method: 'DELETE',
        });
        const result = await response.json();

        return result.success;
    } catch (error) {
        console.error('删除自定义角色失败:', error);
        return false;
    }
}

// 将自定义角色转换为群聊格式
export function convertToChatCharacter(customChar: CustomCharacter): Character {
    return {
        id: customChar.id,
        name: customChar.name,
        dynasty: customChar.dynasty,
        title: customChar.title,
        personality: customChar.personality || '性格随和',
        speakingStyle: customChar.speaking_style || '说话直率',
        avatar: customChar.avatar,
        relatedTopics: [],
        skillData: {
            constraints: customChar.personality ? [] : ['积极参与讨论'],
        },
    };
}

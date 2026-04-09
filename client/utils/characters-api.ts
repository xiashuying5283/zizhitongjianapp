/**
 * 人物数据管理
 * 从数据库获取人物信息
 */
const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export interface Character {
    id: string;
    name: string;
    dynasty: string;
    title: string;
    personality: string;
    speakingStyle: string;
    avatar: string;
    relatedTopics: string[];
    skillData?: {
        constraints: string[];
    };
}

// 从数据库获取所有人物
export async function fetchCharacters(): Promise<Character[]> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/historical-characters`);
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error('获取人物失败:', error);
        return [];
    }
}

// 根据话题获取相关人物
export async function fetchCharactersByTopic(topicId: string): Promise<Character[]> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/historical-characters/by-topic/${topicId}`);
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error('获取话题人物失败:', error);
        return [];
    }
}

// 获取单个人物详情
export async function fetchCharacterDetail(id: string): Promise<Character | null> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/characters/${id}`);
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error('获取人物详情失败:', error);
        return null;
    }
}

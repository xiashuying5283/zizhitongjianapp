import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Alert,
    ActivityIndicator,
    Image,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { PRESET_TOPICS, MAX_CONTEXT_MESSAGES } from '@/constants/character-skills';
import { fetchCharacters, Character, fetchCharactersByTopic } from '@/utils/characters-api';
import { fetchCustomCharacters, CustomCharacter, convertToChatCharacter } from '@/utils/custom-characters-api';
import { uploadImage } from '@/utils/upload-api';
import { getDeviceId } from '@/utils/deviceId';
import {
    createChatRoom,
    addChatMessage,
    clearChatMessages,
    fetchChatRoomDetail,
    updateSceneState,
    ChatMessage as DbChatMessage,
} from '@/utils/chat-history-api';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type ChatPhase = 'setup' | 'chatting';

// 预设头像颜色
const AVATAR_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

// 获取名字最后一个字作为头像文字
const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.charAt(name.length - 1);
};

// 获取预设颜色
const getAvatarColor = (name: string): string => {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// 判断是否是图片URL
const isImageUrl = (avatar: string): boolean => {
    return !!(avatar && (avatar.startsWith('http://') || avatar.startsWith('https://')));
};

export default function GroupChatScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();
    const params = useSafeSearchParams<{ roomId?: string }>();

    const [phase, setPhase] = useState<ChatPhase>('setup');
    const [autoMode, setAutoMode] = useState(false); // 自动推演模式
    const [autoRound, setAutoRound] = useState(0); // 自动推演轮次
    const [roundInfo, setRoundInfo] = useState<{ round: number; speaker: number } | null>(null); // 轮次详情
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [customTopic, setCustomTopic] = useState('');
    const [isResuming, setIsResuming] = useState(false);
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
    const [allCharacters, setAllCharacters] = useState<Character[]>([]);
    const [customCharacters, setCustomCharacters] = useState<CustomCharacter[]>([]);
    const [relatedCharacters, setRelatedCharacters] = useState<Character[]>([]);
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<DbChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 场景状态
    const [currentScene, setCurrentScene] = useState<{
        sceneId: string;
        sceneName: string;
        sequence: number;
        totalScenes: number;
        isLastScene: boolean;
    } | null>(null);
    const [eventEnded, setEventEnded] = useState(false);
    const [showSceneSelector, setShowSceneSelector] = useState(false); // 场景选择器
    const [sceneList, setSceneList] = useState<Array<{
        id: string;
        name: string;
        sequence: number;
    }>>([]); // 场景列表

    // @功能相关
    const [showAtPicker, setShowAtPicker] = useState(false);
    const [showMorePanel, setShowMorePanel] = useState(false); // 更多面板
    const [showEmojiPicker, setShowEmojiPicker] = useState(false); // emoji选择器
    const [inputFocused, setInputFocused] = useState(false); // 输入框焦点状态
    const prevInputRef = useRef(''); // 追踪上一次输入内容
    const completedMentionsRef = useRef<Set<string>>(new Set()); // 已完成的@提及

    const flatListRef = useRef<FlatList>(null);
    const isGeneratingRef = useRef(false);
    const autoModeRef = useRef(false); // 自动推演状态追踪

    // 页面加载
    useEffect(() => {
        loadAllCharacters();
    }, []);

    // 如果有 roomId，加载历史记录
    useEffect(() => {
        if (params.roomId) {
            resumeChat(params.roomId);
        }
    }, [params.roomId]);

    // 键盘弹出时滚动到底部（提前响应，无动画）
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener('keyboardWillShow', () => {
            // 立即滚动，不等键盘动画完成
            requestAnimationFrame(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            });
        });
        return () => keyboardWillShow.remove();
    }, []);

    // 加载所有人物
    const loadAllCharacters = async () => {
        const data = await fetchCharacters();
        const customChars = await fetchCustomCharacters();
        setAllCharacters(data);
        setCustomCharacters(customChars);
        return { data, customChars };
    };

    // 恢复历史群聊
    const resumeChat = async (roomId: string) => {
        setIsResuming(true);
        try {
            // 先加载角色数据（确保 getFinalCharacters 有值）
            await loadAllCharacters();

            // 清理 roomId（去掉 URL 参数污染）
            const cleanRoomId = roomId.split('?')[0].trim();

            const data = await fetchChatRoomDetail(cleanRoomId);
            if (data) {
                setSelectedTopicId(data.room.topicId);
                setCustomTopic(data.room.topicId === 'custom' ? data.room.topicTitle : '');
                setSelectedCharacters(new Set(data.room.characterIds));
                setMessages(data.messages);
                setCurrentRoomId(cleanRoomId);

                // 恢复场景状态
                if (data.room.sceneState) {
                    setCurrentScene({
                        sceneId: data.room.sceneState.sceneId,
                        sceneName: data.room.sceneState.sceneName,
                        sequence: data.room.sceneState.sequence,
                        totalScenes: data.room.sceneState.totalScenes,
                        isLastScene: data.room.sceneState.isLastScene,
                    });
                }

                setPhase('chatting');
            } else {
                Alert.alert('错误', '无法加载该房间');
            }
        } catch (error) {
            Alert.alert('错误', `加载失败: ${error}`);
            router.replace('/group-chat');
        } finally {
            setIsResuming(false);
        }
    };

    // 当前话题
    const currentTopic = useMemo(() => {
        if (customTopic.trim()) return customTopic.trim();
        const topic = PRESET_TOPICS.find(t => t.id === selectedTopicId);
        return topic?.title || '';
    }, [selectedTopicId, customTopic]);

    // 选择话题
    const handleSelectTopic = async (topicId: string) => {
        setSelectedTopicId(topicId);
        setCustomTopic('');
        setSelectedCharacters(new Set());

        const relatedChars = await fetchCharactersByTopic(topicId);
        setRelatedCharacters(relatedChars);
    };

    // 自定义话题
    const handleCustomTopicChange = (text: string) => {
        setCustomTopic(text);
        setSelectedTopicId(null);
        setSelectedCharacters(new Set());
        setRelatedCharacters([]);
    };

    // 切换角色选中状态
    const toggleCharacter = (characterId: string) => {
        const newSet = new Set(selectedCharacters);
        if (newSet.has(characterId)) {
            newSet.delete(characterId);
        } else {
            if (newSet.size >= 8) {
                Alert.alert('提示', '最多选择8人');
                return;
            }
            newSet.add(characterId);
        }
        setSelectedCharacters(newSet);
    };

    // 获取选中的人物详情（包括预设和自定义）
    const getFinalCharacters = useMemo(() => {
        const presetChars = allCharacters.filter(c => selectedCharacters.has(c.id));
        const customChars = customCharacters.filter(c => selectedCharacters.has(c.id));
        return [
            ...presetChars.map(c => ({
                id: c.id,
                name: c.name,
                dynasty: c.dynasty,
                title: c.title,
                personality: c.personality,
                speakingStyle: c.speakingStyle,
                avatar: c.avatar,
                relatedTopics: c.relatedTopics || [],
                skillData: c.skillData ?? { constraints: [] },
            })),
            ...customChars.map(c => convertToChatCharacter(c))
        ] as Character[];
    }, [allCharacters, customCharacters, selectedCharacters]);

    // 同步场景状态到后端
    useEffect(() => {
        if (currentRoomId && currentScene) {
            updateSceneState(currentRoomId, currentScene);
        }
    }, [currentScene, currentRoomId]);

    // 获取话题对应的场景列表
    const fetchSceneList = async (topicId: string) => {
        try {
            const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/group-chat/scenes/${topicId}`);
            const result = await response.json();
            if (result.success && result.data) {
                setSceneList(result.data);
            }
        } catch (error) {
            console.error('获取场景列表失败:', error);
        }
    };

    // 打开场景选择器时获取场景列表
    useEffect(() => {
        if (showSceneSelector && selectedTopicId) {
            // 将话题名称转换为 topicId
            const topicIdMap: Record<string, string> = {
                '鸿门宴': 'hongmen',
                '鸿门宴对峙': 'hongmen',
                '贞观之治': 'zhenguan',
                '夷陵之战': 'yiling',
            };
            const topicId = topicIdMap[currentTopic] || selectedTopicId;
            fetchSceneList(topicId);
        }
    }, [showSceneSelector, selectedTopicId, currentTopic]);

    // 可选人物列表（混入自定义角色）
    const availableCharacters = useMemo(() => {
        const presetList = customTopic.trim()
            ? allCharacters
            : relatedCharacters;

        // 合并自定义角色
        const mergedList = [...presetList];
        customCharacters.forEach(custom => {
            if (!mergedList.find(c => c.id === custom.id)) {
                mergedList.push({
                    id: custom.id,
                    name: custom.name,
                    dynasty: custom.dynasty,
                    title: custom.title,
                    personality: custom.personality,
                    speakingStyle: custom.speaking_style,
                    avatar: custom.avatar,
                    relatedTopics: [],
                    skillData: { constraints: [] as string[] },
                });
            }
        });

        return mergedList;
    }, [customTopic, relatedCharacters, allCharacters, customCharacters]);

    // 获取人物名字
    const getCharacterName = (characterId: string | null): string => {
        if (!characterId) return '';
        const character = allCharacters.find(c => c.id === characterId);
        if (character) return character.name;
        const customChar = customCharacters.find(c => c.id === characterId);
        return customChar?.name || '';
    };

    // 获取头像URL
    const getCharacterAvatar = (characterId: string | null): string => {
        if (!characterId) return '';
        const character = allCharacters.find(c => c.id === characterId);
        if (character) return character.avatar;
        const customChar = customCharacters.find(c => c.id === characterId);
        return customChar?.avatar || '';
    };

    // 处理@选择
    const handleAtCharacter = (character: Character) => {
        // 移除末尾的@，替换为@人物名
        const mention = `@${character.name}`;
        const newText = userInput.replace(/@([^@\s]*)$/, mention);
        // 记录已完成的提及
        completedMentionsRef.current.add(mention);
        setUserInput(newText);
        prevInputRef.current = newText;
        setShowAtPicker(false);
    };

    // 解析消息中的@提及
    const parseAtMentions = (text: string): { mentionedId: string | null; content: string } => {
        const atMatch = text.match(/@([^@\s]+)/);
        if (atMatch) {
            const mentionedName = atMatch[1];
            const character = getFinalCharacters.find(c => c.name === mentionedName);
            if (character) {
                // 去掉@提及部分，只保留内容
                const content = text.replace(/@([^@\s]+)\s*/, '').trim() || '说';
                return { mentionedId: character.id, content };
            }
        }
        return { mentionedId: null, content: text };
    };

    // 生成AI回复（手动模式：最多2条）
    const generateAndDisplayMessages = useCallback(async (
        userMessageContent: string,
        mentionedId?: string
    ) => {
        if (isGeneratingRef.current || !currentRoomId) return;

        isGeneratingRef.current = true;
        setIsLoading(true);

        try {
            const finalCharacters = getFinalCharacters;
            const MAX_REPLIES = 2; // 手动模式：最多2条回复

            // 用局部变量追踪消息列表
            const localMessages = [...messages];

            // 加入用户消息
            localMessages.push({
                id: Date.now().toString(),
                characterId: null,
                characterName: '用户',
                content: userMessageContent,
                isUser: true,
                createdAt: new Date().toISOString(),
            });

            let replyCount = 0;

            while (replyCount < MAX_REPLIES) {
                // 构建发送给后端的消息列表
                const currentMessages = localMessages.map(m => ({
                    role: m.isUser ? 'user' : 'assistant',
                    characterName: m.characterName,
                    content: m.content,
                }));

                const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/group-chat/generate-next`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: currentTopic,
                        characters: finalCharacters.map(c => ({
                            id: c.id,
                            name: c.name,
                            dynasty: c.dynasty,
                            title: c.title,
                            personality: c.personality,
                            speakingStyle: c.speakingStyle,
                            constraints: c.skillData?.constraints || [],
                            avatar: c.avatar,
                        })),
                        messages: currentMessages,
                        mentionedId: replyCount === 0 ? mentionedId : undefined,
                        replyCount: replyCount,
                        currentSceneId: currentScene?.sceneId,
                        currentSequence: currentScene?.sequence,
                    }),
                });

                const result = await response.json();

                // 处理司马光控场消息（即使 done=true 也要显示）
                if (result.success && result.data?.isControlMessage && result.data.content) {
                    const { speakerId, speakerName, content } = result.data;
                    const controlMsg: DbChatMessage = {
                        id: 'control-' + Date.now(),
                        characterId: speakerId || 'simaguang',
                        characterName: speakerName || '司马光',
                        content: content,
                        isUser: false,
                        createdAt: new Date().toISOString(),
                    };
                    localMessages.push(controlMsg);
                    setMessages(prev => [...prev, controlMsg]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    break; // 控场后暂停
                }

                // done=true 表示结束
                if (result.success && result.data?.done) {
                    console.log(`[手动模式] 回复结束: ${result.data.message}`);
                    break;
                }

                // 有消息返回
                if (result.success && result.data && !result.data.done) {
                    const { speakerId, speakerName, content, sceneUpdate, eventEnded, chenGuangYueMessage } = result.data;

                    replyCount++;

                    // 处理场景更新
                    if (sceneUpdate) {
                        setCurrentScene({
                            sceneId: sceneUpdate.currentSceneId,
                            sceneName: sceneUpdate.currentSceneName,
                            sequence: sceneUpdate.currentSequence,
                            totalScenes: sceneUpdate.totalScenes,
                            isLastScene: sceneUpdate.isLastScene,
                        });

                        // 添加场景切换提示
                        const sceneMsg: DbChatMessage = {
                            id: 'scene-' + Date.now(),
                            characterId: 'system',
                            characterName: '系统',
                            content: `【场景推进】${sceneUpdate.currentSceneName}`,
                            isUser: false,
                            createdAt: new Date().toISOString(),
                        };
                        localMessages.push(sceneMsg);
                        setMessages(prev => [...prev, sceneMsg]);
                    }

                    // 处理事件结束
                    if (eventEnded) {
                        setEventEnded(true);
                    }

                    // 保存并显示消息
                    const savedMsg = await addChatMessage(
                        currentRoomId,
                        speakerId,
                        speakerName,
                        content,
                        false
                    );

                    if (savedMsg) {
                        // 更新局部消息列表
                        localMessages.push({
                            id: savedMsg.id,
                            characterId: savedMsg.characterId,
                            characterName: savedMsg.characterName,
                            content: savedMsg.content,
                            isUser: false,
                            createdAt: savedMsg.createdAt,
                        });

                        setMessages(prev => [...prev, savedMsg]);

                        setTimeout(() => {
                            flatListRef.current?.scrollToEnd({ animated: true });
                        }, 100);

                        // 处理臣光曰消息
                        if (chenGuangYueMessage) {
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            const chenGuangMsg: DbChatMessage = {
                                id: chenGuangYueMessage.id || 'chenguangyue-' + Date.now(),
                                characterId: chenGuangYueMessage.speakerId,
                                characterName: chenGuangYueMessage.speakerName,
                                content: chenGuangYueMessage.content,
                                isUser: false,
                                createdAt: new Date().toISOString(),
                            };

                            localMessages.push(chenGuangMsg);
                            setMessages(prev => [...prev, chenGuangMsg]);

                            setTimeout(() => {
                                flatListRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                        }

                        // 每条消息间隔1.5秒
                        if (replyCount < MAX_REPLIES) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                } else {
                    console.error('生成消息失败:', result);
                    break;
                }
            }

            console.log(`[手动模式] 共回复 ${replyCount} 条`);
        } catch (error) {
            console.error('生成消息失败:', error);
        } finally {
            setIsLoading(false);
            isGeneratingRef.current = false;
        }
    }, [currentRoomId, messages, getFinalCharacters, currentTopic, currentScene]);

    // 自动推演模式：AI自主对话
    const startAutoMode = useCallback(async () => {
        if (isGeneratingRef.current || !currentRoomId) return;

        setAutoMode(true);
        autoModeRef.current = true;  // 同步更新 ref
        setAutoRound(0);
        isGeneratingRef.current = true;

        const MAX_AUTO_ROUNDS = 5; // 最多5轮
        let round = 0;
        let sceneChanged = false; // 追踪场景是否切换过
        const initialSceneId = currentScene?.sceneId; // 记录初始场景ID

        // 用局部变量追踪消息列表（解决闭包问题）
        const localMessages = [...messages];

        while (round < MAX_AUTO_ROUNDS && autoModeRef.current) {  // 使用 ref 检查
            round++;
            setAutoRound(round);

            const finalCharacters = getFinalCharacters;

            // 每轮最多3个角色发言
            for (let i = 0; i < 3 && autoModeRef.current; i++) {  // 使用 ref 检查
                // 更新轮次详情
                setRoundInfo({ round, speaker: i + 1 });

                // 使用局部变量构建当前消息列表
                const currentMessages = localMessages.slice(-10).map(m => ({
                    role: m.isUser ? 'user' : 'assistant',
                    characterName: m.characterName,
                    content: m.content,
                }));

                const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/group-chat/generate-next`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: currentTopic,
                        characters: finalCharacters.map(c => ({
                            id: c.id,
                            name: c.name,
                            dynasty: c.dynasty,
                            title: c.title,
                            personality: c.personality,
                            speakingStyle: c.speakingStyle,
                            constraints: c.skillData?.constraints || [],
                            avatar: c.avatar,
                        })),
                        messages: currentMessages,
                        replyCount: i,
                        autoMode: true,
                        currentSceneId: currentScene?.sceneId,
                        currentSequence: currentScene?.sequence,
                        forceAdvance: round === MAX_AUTO_ROUNDS && !sceneChanged, // 最后一轮且场景未切换，强制推进
                    }),
                });

                const result = await response.json();

                // 处理暂停提示
                if (result.success && result.data?.needPause) {
                    // 添加暂停提示消息
                    const pauseMsg: DbChatMessage = {
                        id: 'pause-' + Date.now(),
                        characterId: 'system',
                        characterName: '系统',
                        content: '自动推演已进行3轮，请点击"继续推演"按钮继续',
                        isUser: false,
                        createdAt: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, pauseMsg]);
                    break; // 退出自动推演循环
                }

                // 处理司马光控场消息（即使 done=true 也要显示）
                if (result.success && result.data?.isControlMessage && result.data.content) {
                    const { speakerId, speakerName, content } = result.data;
                    const controlMsg: DbChatMessage = {
                        id: 'control-' + Date.now(),
                        characterId: speakerId || 'simaguang',
                        characterName: speakerName || '司马光',
                        content: content,
                        isUser: false,
                        createdAt: new Date().toISOString(),
                    };
                    localMessages.push(controlMsg);
                    setMessages(prev => [...prev, controlMsg]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    break; // 控场后暂停，等待用户发言
                }

                // done=true 表示结束
                if (result.success && result.data?.done) {
                    console.log(`[自动推演] 回复结束: ${result.data.message}`);
                    break;
                }

                if (result.success && result.data && !result.data.done) {
                    const { speakerId, speakerName, content, sceneUpdate, eventEnded, chenGuangYueMessage } = result.data;

                    // 处理场景更新
                    if (sceneUpdate) {
                        sceneChanged = true;
                        setCurrentScene({
                            sceneId: sceneUpdate.currentSceneId,
                            sceneName: sceneUpdate.currentSceneName,
                            sequence: sceneUpdate.currentSequence,
                            totalScenes: sceneUpdate.totalScenes,
                            isLastScene: sceneUpdate.isLastScene,
                        });

                        // 添加场景切换提示
                        const sceneMsg: DbChatMessage = {
                            id: 'scene-' + Date.now(),
                            characterId: 'system',
                            characterName: '系统',
                            content: `【场景推进】${sceneUpdate.currentSceneName}`,
                            isUser: false,
                            createdAt: new Date().toISOString(),
                        };
                        localMessages.push(sceneMsg);
                        setMessages(prev => [...prev, sceneMsg]);
                    }

                    // 处理事件结束
                    if (eventEnded) {
                        setEventEnded(true);
                        console.log('[自动推演] 事件已结束，终止推演');
                    }

                    // 保存并显示消息
                    const savedMsg = await addChatMessage(currentRoomId, speakerId, speakerName, content, false);

                    if (savedMsg) {
                        // 更新局部消息列表
                        localMessages.push({
                            id: savedMsg.id,
                            characterId: savedMsg.characterId,
                            characterName: savedMsg.characterName,
                            content: savedMsg.content,
                            isUser: false,
                            createdAt: savedMsg.createdAt,
                        });

                        setMessages(prev => [...prev, savedMsg]);
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    }

                    // 处理臣光曰消息
                    if (chenGuangYueMessage) {
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const chenGuangMsg: DbChatMessage = {
                            id: chenGuangYueMessage.id || 'chenguangyue-' + Date.now(),
                            characterId: chenGuangYueMessage.speakerId || 'simaguang',
                            characterName: chenGuangYueMessage.speakerName || '司马光',
                            content: chenGuangYueMessage.content,
                            isUser: false,
                            createdAt: new Date().toISOString(),
                        };

                        localMessages.push(chenGuangMsg);
                        setMessages(prev => [...prev, chenGuangMsg]);
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

                        // 臣光曰发表后，终止自动推演
                        console.log('[自动推演] 臣光曰已发表，终止推演');
                        break;
                    }

                    // 事件结束后，终止自动推演
                    if (eventEnded) {
                        break;
                    }
                }

                // 每条消息间隔1.5秒
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // 轮次间隔2秒
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 5轮结束后场景仍未切换，强制推进
        if (!sceneChanged && initialSceneId) {
            const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/group-chat/advance-scene`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: currentTopic,
                    currentSceneId: initialSceneId,
                }),
            });

            const result = await response.json();
            if (result.success && result.data?.sceneUpdate) {
                const sceneUpdate = result.data.sceneUpdate;
                setCurrentScene({
                    sceneId: sceneUpdate.currentSceneId,
                    sceneName: sceneUpdate.currentSceneName,
                    sequence: sceneUpdate.currentSequence,
                    totalScenes: sceneUpdate.totalScenes,
                    isLastScene: sceneUpdate.isLastScene,
                });

                const sceneMsg: DbChatMessage = {
                    id: 'scene-force-' + Date.now(),
                    characterId: 'system',
                    characterName: '系统',
                    content: `【场景推进】${sceneUpdate.currentSceneName}`,
                    isUser: false,
                    createdAt: new Date().toISOString(),
                };
                setMessages(prev => [...prev, sceneMsg]);
            }
        }

        setAutoMode(false);
        autoModeRef.current = false;  // 同步更新 ref
        setRoundInfo(null);  // 清除轮次信息
        isGeneratingRef.current = false;
        setIsLoading(false);
    }, [currentRoomId, messages, getFinalCharacters, currentTopic, currentScene]);

    // 停止自动推演
    const stopAutoMode = useCallback(() => {
        setAutoMode(false);
        autoModeRef.current = false;  // 同步更新 ref
        setRoundInfo(null);  // 清除轮次信息
        isGeneratingRef.current = false;
        setIsLoading(false);
    }, []);

    // 开始群聊（调用 /start 接口获取系统公告和开场）
    const handleStartChat = async () => {
        const finalCharacters = getFinalCharacters;
        if (!currentTopic || finalCharacters.length < 3) return;

        setIsLoading(true);
        try {
            const room = await createChatRoom(
                selectedTopicId || 'custom',
                currentTopic,
                Array.from(selectedCharacters)
            );

            if (room) {
                setCurrentRoomId(room.id);
                setPhase('chatting');

                // 调用 /start 接口获取开局消息
                const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/group-chat/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: currentTopic,
                        characters: finalCharacters.map(c => ({
                            id: c.id,
                            name: c.name,
                            dynasty: c.dynasty,
                            title: c.title,
                            personality: c.personality,
                            speakingStyle: c.speakingStyle,
                            constraints: c.skillData?.constraints || [],
                            avatar: c.avatar,
                        })),
                    }),
                });

                const result = await response.json();

                if (result.success && result.data) {
                    const msgs: DbChatMessage[] = [];

                    // 系统公告（包含引导提示）
                    if (result.data.systemMessage) {
                        const sysMsg = result.data.systemMessage;
                        msgs.push({
                            id: sysMsg.id || 'sys-' + Date.now(),
                            characterId: 'system',
                            characterName: '系统',
                            content: sysMsg.content,
                            isUser: false,
                            createdAt: sysMsg.createdAt || new Date().toISOString(),
                        });
                    }

                    // 不再有AI自动开场白，等待用户提问
                    // 这样确保"用户是群聊的绝对主导者"

                    setMessages(msgs);

                    // 保存初始场景状态
                    if (result.data.sceneState) {
                        setCurrentScene({
                            sceneId: result.data.sceneState.currentSceneId,
                            sceneName: result.data.sceneState.currentSceneName,
                            sequence: result.data.sceneState.currentSequence,
                            totalScenes: result.data.sceneState.totalScenes,
                            isLastScene: result.data.sceneState.isLastScene,
                        });
                    }

                    // 滚动到底部
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        } catch (error) {
            Alert.alert('错误', '创建会话失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 手动切换场景并触发AI回复
    const handleSceneChange = async (scene: { id: string; name: string; sequence: number }) => {
        if (!currentRoomId || isGeneratingRef.current) return;
        if (currentScene?.sceneId === scene.id) {
            setShowSceneSelector(false);
            return;
        }

        // 更新场景状态
        const newSceneState = {
            sceneId: scene.id,
            sceneName: scene.name,
            sequence: scene.sequence,
            totalScenes: sceneList.length,
            isLastScene: scene.sequence === sceneList.length,
        };
        setCurrentScene(newSceneState);
        setShowSceneSelector(false);

        // 添加场景切换的系统消息
        const sceneMsg: DbChatMessage = {
            id: 'scene-' + Date.now(),
            characterId: 'system',
            characterName: '系统',
            content: `【场景推进】${scene.name}`,
            isUser: false,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, sceneMsg]);

        // 同步场景状态到后端
        try {
            await updateSceneState(currentRoomId, newSceneState);
        } catch (e) {
            console.warn('场景状态同步失败，继续处理:', e);
        }

        // 触发AI根据新场景说话
        setIsLoading(true);
        isGeneratingRef.current = true;

        try {
            const finalCharacters = getFinalCharacters;
            if (finalCharacters.length < 2) {
                console.warn('角色数量不足，跳过AI回复');
                return;
            }

            // 构建消息（包含刚添加的场景切换消息）
            const currentMessages = [
                ...messages.slice(-10).map(m => ({
                    role: m.isUser ? 'user' : 'assistant',
                    characterName: m.characterName,
                    content: m.content,
                })),
                {
                    role: 'assistant' as const,
                    characterName: '系统',
                    content: sceneMsg.content,
                },
            ];

            const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/group-chat/generate-next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: currentTopic,
                    characters: finalCharacters.map(c => ({
                        id: c.id,
                        name: c.name,
                        dynasty: c.dynasty,
                        title: c.title,
                        personality: c.personality,
                        speakingStyle: c.speakingStyle,
                        constraints: c.skillData?.constraints || [],
                        avatar: c.avatar,
                    })),
                    messages: currentMessages,
                    currentSceneId: scene.id,
                    currentSequence: scene.sequence,
                }),
            });

            const result = await response.json();

            if (result.success && result.data) {
                const { speakerId, speakerName, content, eventEnded, chenGuangYueMessage, done, isControlMessage } = result.data;

                // 处理司马光控场消息（即使 done=true 也要显示）
                if (isControlMessage && content) {
                    const controlMsg: DbChatMessage = {
                        id: 'control-' + Date.now(),
                        characterId: speakerId || 'simaguang',
                        characterName: speakerName || '司马光',
                        content: content,
                        isUser: false,
                        createdAt: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, controlMsg]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    return;
                }

                // done: true 且无内容 表示没有AI回复（可能是校验不通过或限制）
                if (done && !content) {
                    console.log('[场景切换] 后端返回 done=true，无AI回复');
                    return;
                }

                // 保存并显示AI消息
                if (content && speakerId && speakerName) {
                    const savedMsg = await addChatMessage(currentRoomId, speakerId, speakerName, content, false);
                    if (savedMsg) {
                        setMessages(prev => [...prev, savedMsg]);
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    }
                }

                // 处理事件结束
                if (eventEnded) {
                    setEventEnded(true);
                }

                // 处理臣光曰消息
                if (chenGuangYueMessage) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const chenGuangMsg: DbChatMessage = {
                        id: chenGuangYueMessage.id || 'chenguangyue-' + Date.now(),
                        characterId: chenGuangYueMessage.speakerId || 'simaguang',
                        characterName: chenGuangYueMessage.speakerName || '司马光',
                        content: chenGuangYueMessage.content,
                        isUser: false,
                        createdAt: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, chenGuangMsg]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            } else {
                console.warn('[场景切换] 后端返回失败:', result.message);
            }
        } catch (error) {
            console.error('[场景切换] AI回复请求失败:', error);
        } finally {
            setIsLoading(false);
            isGeneratingRef.current = false;
        }
    };

    // 用户发送消息
    const handleSendMessage = async () => {
        if (!userInput.trim() || !currentRoomId || isGeneratingRef.current) return;

        const content = userInput.trim();
        const { mentionedId, content: finalContent } = parseAtMentions(content);

        // 用户打断自动推演模式
        if (autoModeRef.current) {
            stopAutoMode();
        }

        // 添加用户消息
        const userMsg: DbChatMessage = {
            id: Date.now().toString(),
            characterId: null,
            characterName: '我',
            content: content,
            isUser: true,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);

        // 清理 roomId（去掉 URL 参数污染）
        const cleanRoomId = currentRoomId.split('?')[0].trim();
        const savedMsg = await addChatMessage(cleanRoomId, null, '我', content, true);
        if (!savedMsg) {
            Alert.alert('错误', '保存消息失败');
            return;
        }

        setUserInput('');
        prevInputRef.current = '';
        completedMentionsRef.current.clear();
        flatListRef.current?.scrollToEnd({ animated: true });

        // 让AI角色们回应（最多2条）
        await generateAndDisplayMessages(content, mentionedId || undefined);
    };

    // 清空对话
    const handleClearChat = () => {
        if (!currentRoomId) return;
        clearChatMessages(currentRoomId);
        setMessages([]);
    };

    // 结束群聊
    const handleEndChat = () => {
        setCurrentRoomId(null);
        setMessages([]);
        setPhase('setup');
    };

    // 选择图片
    const handlePickImage = async () => {
        setShowMorePanel(false);

        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('提示', '需要相册权限才能选择图片');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const imageUri = result.assets[0].uri;

            // 获取设备ID作为用户标识
            const userId = await getDeviceId();

            // 上传图片
            const uploadResult = await uploadImage(imageUri, userId);

            if (uploadResult.success && uploadResult.data?.url) {
                // 发送图片消息
                if (currentRoomId && !isGeneratingRef.current) {
                    const imageUrl = uploadResult.data.url;

                    // 用户打断自动推演模式
                    if (autoModeRef.current) {
                        stopAutoMode();
                    }

                    // 添加用户图片消息
                    const userMsg: DbChatMessage = {
                        id: Date.now().toString(),
                        characterId: null,
                        characterName: '我',
                        content: `[图片] ${imageUrl}`,
                        isUser: true,
                        createdAt: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, userMsg]);

                    // 保存到数据库
                    const cleanRoomId = currentRoomId.split('?')[0].trim();
                    await addChatMessage(cleanRoomId, null, '我', `[图片] ${imageUrl}`, true);

                    flatListRef.current?.scrollToEnd({ animated: true });

                    // 让AI角色们回应
                    await generateAndDisplayMessages('[用户发送了一张图片]', undefined);
                }
            } else {
                Alert.alert('上传失败', uploadResult.message || '图片上传失败，请重试');
            }
        }
    };

    // 渲染消息
    const renderMessage = ({ item }: { item: DbChatMessage }) => {
        const isUser = item.isUser;
        const avatarUrl = getCharacterAvatar(item.characterId);
        const characterName = getCharacterName(item.characterId);
        const showAvatar = isUser || item.characterId;

        // 长按头像@该角色
        const handleLongPressAvatar = () => {
            if (!isUser && item.characterId && characterName) {
                const mention = `@${characterName}`;
                const newText = userInput + mention;
                completedMentionsRef.current.add(mention);
                setUserInput(newText);
                prevInputRef.current = newText;
            }
        };

        return (
            <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
                {showAvatar && (
                    <TouchableOpacity
                        style={[styles.avatar, isUser ? styles.avatarUser : styles.avatarAI]}
                        onLongPress={handleLongPressAvatar}
                        delayLongPress={500}
                    >
                        {isUser ? (
                            <View style={[styles.avatar, { backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }]}>
                                <ThemedText variant="h4" color="#FFFFFF">我</ThemedText>
                            </View>
                        ) : isImageUrl(avatarUrl) ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: getAvatarColor(characterName), alignItems: 'center', justifyContent: 'center' }]}>
                                <ThemedText variant="h4" color="#FFFFFF">{getInitials(characterName)}</ThemedText>
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                <View style={styles.messageContentArea}>
                    {!isUser && (
                        <ThemedText variant="caption" color={theme.textMuted} style={styles.messageSenderName}>
                            {item.characterName}
                        </ThemedText>
                    )}
                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
                        {item.content.startsWith('[图片] ') ? (
                            <Image
                                source={{ uri: item.content.replace('[图片] ', '') }}
                                style={styles.messageImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <ThemedText variant="body" style={[styles.messageText, isUser && styles.messageTextUser]}>
                                {item.content}
                            </ThemedText>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // ==================== 设置阶段 ====================
    if (phase === 'setup') {
        return (
            <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <ThemedView level="root" style={styles.header}>
                        <ThemedText variant="h2" color={theme.textPrimary} style={styles.headerTitle}>
                            历史群聊
                        </ThemedText>
                        <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
                            与历史人物对话，探讨历史话题
                        </ThemedText>
                    </ThemedView>

                    {/* 话题选择 */}
                    <View style={styles.topicSection}>
                        <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
                            选择话题
                        </ThemedText>
                        <View style={styles.topicTagsContainer}>
                            {PRESET_TOPICS.map(topic => (
                                <TouchableOpacity
                                    key={topic.id}
                                    style={[styles.topicTag, selectedTopicId === topic.id && styles.topicTagActive]}
                                    onPress={() => handleSelectTopic(topic.id)}
                                >
                                    <ThemedText
                                        variant="small"
                                        color={selectedTopicId === topic.id ? '#FFFFFF' : theme.textSecondary}
                                    >
                                        {topic.title}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.customTopicContainer}>
                            <TextInput
                                style={[styles.customTopicInput, { color: theme.textPrimary }]}
                                placeholder="或输入自定义话题..."
                                placeholderTextColor={theme.textMuted}
                                value={customTopic}
                                onChangeText={handleCustomTopicChange}
                                maxLength={20}
                            />
                        </View>
                    </View>

                    {/* 人物选择 */}
                    <View style={styles.characterSection}>
                        <View style={styles.characterCount}>
                            <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
                                选择人物
                            </ThemedText>
                            <ThemedText variant="caption" color={theme.textMuted}>
                                {selectedCharacters.size}/8（至少3人）
                            </ThemedText>
                        </View>

                        {!selectedTopicId && !customTopic.trim() && (
                            <View style={styles.emptyState}>
                                <ThemedText variant="body" color={theme.textMuted}>
                                    请先选择话题，再选择人物
                                </ThemedText>
                            </View>
                        )}

                        {selectedCharacters.size > 0 && (
                            <View style={[styles.characterGrid, { marginBottom: Spacing.md }]}>
                                {getFinalCharacters.map(character => (
                                    <TouchableOpacity
                                        key={character.id}
                                        style={[styles.characterCard, styles.characterCardSelected]}
                                        onPress={() => toggleCharacter(character.id)}
                                    >
                                        {isImageUrl(character.avatar) ? (
                                            <Image source={{ uri: character.avatar }} style={styles.characterAvatar} />
                                        ) : (
                                            <View style={[styles.characterAvatar, { backgroundColor: getAvatarColor(character.name), alignItems: 'center', justifyContent: 'center' }]}>
                                                <ThemedText variant="body" color="#FFFFFF">{getInitials(character.name)}</ThemedText>
                                            </View>
                                        )}
                                        <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.characterName}>
                                            {character.name}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {(selectedTopicId || customTopic.trim()) && availableCharacters.length > 0 && (
                            <View>
                                <ThemedText variant="caption" color={theme.textMuted} style={{ marginBottom: Spacing.sm }}>
                                    点击选择参与话题的人物
                                </ThemedText>
                                <View style={styles.characterSelectGrid}>
                                    {availableCharacters.map(character => {
                                        const isSelected = selectedCharacters.has(character.id);
                                        return (
                                            <TouchableOpacity
                                                key={character.id}
                                                style={[
                                                    styles.characterSelectCard,
                                                    isSelected && styles.characterSelectCardActive,
                                                ]}
                                                onPress={() => toggleCharacter(character.id)}
                                            >
                                                <View style={styles.characterSelectContent}>
                                                    {isImageUrl(character.avatar) ? (
                                                        <Image source={{ uri: character.avatar }} style={styles.characterSelectAvatar} />
                                                    ) : (
                                                        <View style={[styles.characterSelectAvatar, { backgroundColor: getAvatarColor(character.name), alignItems: 'center', justifyContent: 'center' }]}>
                                                            <ThemedText variant="caption" color="#FFFFFF">{getInitials(character.name)}</ThemedText>
                                                        </View>
                                                    )}
                                                    <ThemedText
                                                        variant="smallMedium"
                                                        color={isSelected ? theme.primary : theme.textPrimary}
                                                        style={styles.characterSelectName}
                                                        numberOfLines={1}
                                                    >
                                                        {character.name}
                                                    </ThemedText>
                                                    <ThemedText
                                                        variant="tiny"
                                                        color={theme.textMuted}
                                                        style={styles.characterSelectDynasty}
                                                        numberOfLines={1}
                                                    >
                                                        {character.dynasty}
                                                    </ThemedText>
                                                </View>
                                                {isSelected && (
                                                    <View style={styles.checkMark}>
                                                        <FontAwesome6 name="check" size={12} color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* 创建角色按钮 */}
                                <TouchableOpacity
                                    style={styles.createCharacterButton}
                                    onPress={() => router.push('/create-character')}
                                >
                                    <FontAwesome6 name="plus" size={16} color={theme.primary} />
                                    <ThemedText variant="small" color={theme.primary} style={{ marginLeft: Spacing.xs }}>
                                        创建自定义角色
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* 开始按钮 */}
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                (currentTopic.length === 0 || selectedCharacters.size < 3 || isLoading) && styles.primaryButtonDisabled,
                            ]}
                            onPress={handleStartChat}
                            disabled={currentTopic.length === 0 || selectedCharacters.size < 3 || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <FontAwesome6 name="comment" size={18} color="#FFFFFF" />
                                    <ThemedText variant="smallMedium" color="#FFFFFF">
                                        开始聊天
                                    </ThemedText>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Screen>
        );
    }

    // ==================== 聊天阶段 ====================
    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                {/* 聊天头部 */}
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={handleEndChat} style={{ position: 'absolute', left: Spacing.md }}>
                        <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary} style={styles.chatTitleText}>
                        {currentTopic}
                    </ThemedText>
                    {isLoading && (
                        <ActivityIndicator size="small" color={theme.primary} style={{ position: 'absolute', right: Spacing.md }} />
                    )}
                </View>

                {/* 自动推演轮次信息 */}
                {autoMode && roundInfo && (
                    <View style={{
                        backgroundColor: theme.primaryLight || (theme.primary === '#FAFAF9' ? '#2A2A2A' : '#F0EEE8'),
                        paddingVertical: Spacing.sm,
                        paddingHorizontal: Spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <FontAwesome6 name="robot" size={14} color={theme.primary} style={{ marginRight: Spacing.sm }} />
                        <ThemedText variant="body" color={theme.text} style={{ fontWeight: '500' }}>
                            自动推演 · 第 {roundInfo.round} 轮 · 第 {roundInfo.speaker}/3 人
                        </ThemedText>
                    </View>
                )}

                {/* 场景推演状态 */}
                {currentScene && (
                    <TouchableOpacity
                        style={{
                            backgroundColor: theme.primaryLight || (theme.primary === '#FAFAF9' ? '#2A2A2A' : '#F0EEE8'),
                            paddingVertical: Spacing.sm + 2,
                            paddingHorizontal: Spacing.md,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                        }}
                        onPress={() => setShowSceneSelector(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome6 name="film" size={16} color={theme.primary} style={{ marginRight: Spacing.sm }} />
                            <ThemedText variant="body" color={theme.text} style={{ fontWeight: '500' }}>
                                {currentScene.sceneName}
                            </ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ThemedText variant="body" color={theme.text} style={{ marginRight: Spacing.sm, fontWeight: '500' }}>
                                {currentScene.sequence}/{currentScene.totalScenes}
                            </ThemedText>
                            <FontAwesome6 name="chevron-down" size={14} color={theme.text} />
                        </View>
                    </TouchableOpacity>
                )}

                {/* 场景选择器 Modal */}
                <Modal
                    visible={showSceneSelector}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowSceneSelector(false)}
                >
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                        activeOpacity={1}
                        onPress={() => setShowSceneSelector(false)}
                    >
                        <View style={{
                            backgroundColor: theme.backgroundDefault,
                            borderTopLeftRadius: BorderRadius.xl,
                            borderTopRightRadius: BorderRadius.xl,
                            maxHeight: '70%',
                            paddingBottom: Spacing.xl,
                        }}>
                            {/* 标题 */}
                            <View style={{
                                padding: Spacing.md,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.border,
                                alignItems: 'center',
                            }}>
                                <ThemedText variant="h4" color={theme.text}>场景流程</ThemedText>
                                <ThemedText variant="small" color={theme.textSecondary}>点击切换到任意场景</ThemedText>
                            </View>

                            {/* 场景列表 */}
                            <ScrollView style={{ padding: Spacing.md }}>
                                {sceneList.length > 0 ? (
                                    sceneList.map((scene) => {
                                        const isActive = currentScene?.sceneId === scene.id;
                                        return (
                                            <TouchableOpacity
                                                key={scene.id}
                                                style={{
                                                    padding: Spacing.md,
                                                    borderRadius: BorderRadius.md,
                                                    backgroundColor: isActive
                                                        ? (theme.primary === '#FAFAF9' ? '#3A3A3A' : '#E0E0E0')
                                                        : theme.backgroundSecondary,
                                                    marginBottom: Spacing.sm,
                                                    borderWidth: isActive ? 2 : 1,
                                                    borderColor: isActive ? theme.primary : theme.border,
                                                }}
                                                onPress={() => handleSceneChange(scene)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 16,
                                                        backgroundColor: isActive ? theme.primary : theme.border,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: Spacing.md,
                                                    }}>
                                                        <ThemedText variant="body" color={isActive ? (theme.primary === '#FAFAF9' ? '#121212' : '#FFFFFF') : theme.textSecondary} style={{ fontWeight: '600' }}>
                                                            {scene.sequence}
                                                        </ThemedText>
                                                    </View>
                                                    <ThemedText
                                                        variant="body"
                                                        color={isActive ? theme.primary : theme.text}
                                                        style={{ fontWeight: isActive ? '600' : 'normal', fontSize: 16 }}
                                                    >
                                                        {scene.name}
                                                    </ThemedText>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <ThemedText variant="body" color={theme.textSecondary} style={{ textAlign: 'center', padding: Spacing.lg }}>
                                        该话题暂无场景数据
                                    </ThemedText>
                                )}
                            </ScrollView>

                            {/* 关闭按钮 */}
                            <TouchableOpacity
                                style={{
                                    marginHorizontal: Spacing.md,
                                    marginTop: Spacing.sm,
                                    padding: Spacing.md,
                                    borderRadius: BorderRadius.md,
                                    backgroundColor: theme.backgroundSecondary,
                                    alignItems: 'center',
                                }}
                                onPress={() => setShowSceneSelector(false)}
                            >
                                <ThemedText variant="body" color={theme.text}>关闭</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* 事件结束提示 */}
                {eventEnded && (
                    <View style={{
                        backgroundColor: theme.success || '#10B981',
                        paddingVertical: Spacing.sm,
                        paddingHorizontal: Spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <FontAwesome6 name="flag-checkered" size={14} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
                        <ThemedText variant="small" color="#FFFFFF">
                            事件演绎完毕
                        </ThemedText>
                    </View>
                )}

                {/* 消息列表 */}
                <View style={styles.chatSection}>
                    {isResuming ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.md }}>
                                加载历史记录...
                            </ThemedText>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.messageList}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                            onScrollBeginDrag={() => Keyboard.dismiss()}
                        />
                    )}
                </View>

                {/* 输入区域容器 */}
                <View style={styles.inputContainer}>
                    {/* 悬浮的自动推演按钮 */}
                    {!autoMode && (
                        <View style={styles.floatingAutoButton}>
                            <TouchableOpacity
                                style={styles.floatingAutoButtonInner}
                                onPress={startAutoMode}
                                disabled={isLoading || isGeneratingRef.current}
                            >
                                <FontAwesome6 name="play" size={14} color="#505050" />
                                <ThemedText variant="small" color="#505050" style={{ fontWeight: '500' }}>自动推演</ThemedText>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 自动推演激活时的状态栏 */}
                    {autoMode && (
                        <View style={styles.bottomActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.autoModeActive]}
                                onPress={stopAutoMode}
                            >
                                <FontAwesome6 name="pause" size={14} color="#FFFFFF" />
                                <ThemedText variant="small" color="#FFFFFF">
                                    暂停推演 ({autoRound}/5)
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 输入区域 */}
                    <View style={styles.inputSection}>
                        {/* 语音按钮 */}
                        <TouchableOpacity style={styles.iconButton}>
                            <FontAwesome6 name="microphone" size={20} color="#646464" />
                        </TouchableOpacity>

                        <View style={[styles.inputWrapper, inputFocused && styles.inputWrapperFocused]}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="回复角色..."
                                placeholderTextColor="#B4B4B4"
                                value={userInput}
                                onChangeText={(text) => {
                                    const prevText = prevInputRef.current;

                                    // 检测删除操作
                                    if (text.length < prevText.length) {
                                        // 检查是否有已完成的提及被部分删除
                                        for (const mention of completedMentionsRef.current) {
                                            // 如果文本中包含提及的一部分（但不是完整的提及）
                                            if (text.includes(mention) || text.includes(mention.slice(0, -1))) {
                                                const fullMatch = text.includes(mention);
                                                const partialMatch = !fullMatch && mention.startsWith(text.slice(-mention.length + 1));

                                                // 检查是否在删除提及的过程中
                                                const mentionIndex = text.indexOf(mention);
                                                if (mentionIndex !== -1) {
                                                    // 文本中还有完整的提及，跳过
                                                    continue;
                                                }

                                                // 检查是否有部分提及
                                                for (let i = 1; i < mention.length; i++) {
                                                    const partial = mention.slice(0, mention.length - i);
                                                    if (text.endsWith(partial)) {
                                                        // 整体删除这个部分提及和后面的空格
                                                        text = text.slice(0, text.length - partial.length).replace(/\s+$/, '');
                                                        completedMentionsRef.current.delete(mention);
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    prevInputRef.current = text;
                                    setUserInput(text);

                                    // 只有新输入的@才弹出选择器（不在已完成提及中的@）
                                    const atMatches = text.match(/@[^\s@]*/g) || [];
                                    const lastAtMatch = text.match(/@([^@\s]*)$/);

                                    if (lastAtMatch) {
                                        const potentialMention = '@' + lastAtMatch[1];
                                        // 检查这个@是否是已完成的提及的一部分
                                        let isCompletedMention = false;
                                        for (const mention of completedMentionsRef.current) {
                                            if (mention.startsWith(potentialMention)) {
                                                isCompletedMention = true;
                                                break;
                                            }
                                        }

                                        if (!isCompletedMention && !showAtPicker) {
                                            setShowAtPicker(true);
                                        }
                                    } else if (showAtPicker) {
                                        setShowAtPicker(false);
                                    }

                                    // 输入内容时关闭更多面板
                                    if (showMorePanel && text.trim()) {
                                        setShowMorePanel(false);
                                    }
                                }}
                                onFocus={() => {
                                    setInputFocused(true);
                                    setShowMorePanel(false);
                                    setShowEmojiPicker(false);
                                }}
                                onBlur={() => setInputFocused(false)}
                                multiline
                                maxLength={200}
                                editable={!isLoading}
                            />
                        </View>

                        {/* emoji按钮 */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => {
                                Keyboard.dismiss();
                                setShowEmojiPicker(!showEmojiPicker);
                            }}
                        >
                            <FontAwesome6
                                name="face-smile"
                                size={20}
                                color={showEmojiPicker ? theme.primary : '#646464'}
                            />
                        </TouchableOpacity>

                        {/* 发送按钮或更多按钮 */}
                        <TouchableOpacity
                            style={[
                                styles.circleButton,
                                userInput.trim() ? styles.sendButton : styles.moreButton,
                                showMorePanel && !userInput.trim() && styles.moreButtonActive,
                            ]}
                            onPress={userInput.trim() ? handleSendMessage : () => setShowMorePanel(!showMorePanel)}
                            disabled={isLoading && !!userInput.trim()}
                        >
                            <FontAwesome6
                                name={userInput.trim() ? 'arrow-up' : 'plus'}
                                size={userInput.trim() ? 18 : 22}
                                color={userInput.trim() ? '#1E1E1E' : '#646464'}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* 展开的更多面板 */}
                    <View style={[styles.morePanel, showMorePanel ? { maxHeight: 180, opacity: 1 } : { maxHeight: 0, opacity: 0 }]}>
                        <View style={styles.morePanelContent}>
                            {/* 发送图片 */}
                            <TouchableOpacity style={styles.morePanelItem} onPress={handlePickImage}>
                                <View style={styles.morePanelButton}>
                                    <FontAwesome6 name="image" size={24} color="#646464" />
                                </View>
                                <ThemedText variant="tiny" color="#787878">发送图片</ThemedText>
                            </TouchableOpacity>

                            {/* 清空记录 */}
                            <TouchableOpacity style={styles.morePanelItem} onPress={() => { setShowMorePanel(false); handleClearChat(); }}>
                                <View style={styles.morePanelButton}>
                                    <FontAwesome6 name="trash" size={24} color="#646464" />
                                </View>
                                <ThemedText variant="tiny" color="#787878">清空记录</ThemedText>
                            </TouchableOpacity>

                            {/* 结束推演 */}
                            <TouchableOpacity style={styles.morePanelItem} onPress={() => { setShowMorePanel(false); handleEndChat(); }}>
                                <View style={styles.morePanelButton}>
                                    <FontAwesome6 name="door-open" size={24} color="#646464" />
                                </View>
                                <ThemedText variant="tiny" color="#787878">结束推演</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* emoji选择器面板 */}
                    {showEmojiPicker && (
                        <View style={[styles.emojiPicker, { backgroundColor: theme.backgroundDefault }]}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.emojiGrid}>
                                    {['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😜', '🤔', '😅', '😭', '😱', '😈', '👻', '👍', '👎', '👏', '🙏', '💪', '❤️', '💔', '💯', '🔥', '⭐', '🌟', '✨', '🎉', '🎊', '🎁', '🏆', '👑', '💐', '🌹', '☀️', '🌙', '⚡', '🌈', '🍎', '🍕', '🍦', '🎂', '🏠', '🚗', '✈️', '🎵', '🎸', '🎮', '📱', '💻'].map((emoji, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.emojiItem}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setUserInput(prev => prev + emoji);
                                                prevInputRef.current = userInput + emoji;
                                            }}
                                        >
                                            <ThemedText variant="h2">{emoji}</ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* @角色选择弹窗 */}
                <Modal
                    visible={showAtPicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowAtPicker(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowAtPicker(false)}>
                        <View style={styles.atPickerOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={[styles.atPickerContent, { backgroundColor: theme.backgroundDefault }]}>
                                    <View style={[styles.atPickerHeader, { borderBottomColor: theme.border }]}>
                                        <ThemedText variant="h4" color={theme.text}>@选择角色</ThemedText>
                                        <TouchableOpacity onPress={() => setShowAtPicker(false)}>
                                            <FontAwesome6 name="xmark" size={20} color={theme.text} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView style={styles.atPickerList}>
                                        {getFinalCharacters.map(character => (
                                            <TouchableOpacity
                                                key={character.id}
                                                style={[styles.atPickerItem, { borderBottomColor: theme.border }]}
                                                onPress={() => handleAtCharacter(character)}
                                            >
                                                {isImageUrl(character.avatar) ? (
                                                    <Image source={{ uri: character.avatar }} style={styles.atPickerAvatar} />
                                                ) : (
                                                    <View style={[styles.atPickerAvatar, { backgroundColor: getAvatarColor(character.name), alignItems: 'center', justifyContent: 'center' }]}>
                                                        <ThemedText variant="caption" color="#FFFFFF">{getInitials(character.name)}</ThemedText>
                                                    </View>
                                                )}
                                                <View style={styles.atPickerInfo}>
                                                    <ThemedText variant="body" color={theme.text} style={{ fontWeight: '500' }}>
                                                        @{character.name}
                                                    </ThemedText>
                                                    <ThemedText variant="small" color={theme.textSecondary}>
                                                        {character.dynasty} · {character.title}
                                                    </ThemedText>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </KeyboardAvoidingView>
        </Screen>
    );
}

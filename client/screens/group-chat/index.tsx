import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    Image,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
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
import {
    createChatRoom,
    addChatMessage,
    clearChatMessages,
    fetchChatRoomDetail,
    ChatMessage as DbChatMessage,
} from '@/utils/chat-history-api';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type ChatPhase = 'setup' | 'chatting';

// 预设头像颜色
const AVATAR_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

// 获取名字首字
const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.charAt(0);
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
    return avatar && (avatar.startsWith('http://') || avatar.startsWith('https://'));
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

    // @功能相关
    const [showAtPicker, setShowAtPicker] = useState(false);
    const [atCharacter, setAtCharacter] = useState<Character | null>(null);

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
        return [...presetChars.map(c => ({
            ...c,
            personality: c.personality,
            speakingStyle: c.speakingStyle,
            skillData: c.skillData,
        })), ...customChars.map(c => convertToChatCharacter(c))];
    }, [allCharacters, customCharacters, selectedCharacters]);

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
                    skillData: { constraints: [] },
                } as Character);
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
        setAtCharacter(character);
        setUserInput(prev => prev + `@${character.name} `);
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
            let localMessages = [...messages];

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

        // 用局部变量追踪消息列表（解决闭包问题）
        let localMessages = [...messages];

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
                    }),
                });

                const result = await response.json();

                if (result.success && result.data && !result.data.done) {
                    const { speakerId, speakerName, content } = result.data;

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
                }

                // 每条消息间隔1.5秒
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // 轮次间隔2秒
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setAutoMode(false);
        autoModeRef.current = false;  // 同步更新 ref
        setRoundInfo(null);  // 清除轮次信息
        isGeneratingRef.current = false;
        setIsLoading(false);
    }, [currentRoomId, messages, getFinalCharacters, currentTopic]);

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

                    // 系统公告
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

                    // 核心人物开场
                    if (result.data.openingMessage) {
                        const openMsg = result.data.openingMessage;
                        msgs.push({
                            id: openMsg.id || 'open-' + Date.now(),
                            characterId: openMsg.characterId,
                            characterName: openMsg.characterName,
                            content: openMsg.content,
                            isUser: false,
                            createdAt: openMsg.createdAt || new Date().toISOString(),
                        });

                        // 保存开场消息到数据库
                        await addChatMessage(room.id, openMsg.characterId, openMsg.characterName, openMsg.content, false);
                    }

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
        setAtCharacter(null);
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

    // 渲染消息
    const renderMessage = ({ item }: { item: DbChatMessage }) => {
        const isUser = item.isUser;
        const avatarUrl = getCharacterAvatar(item.characterId);
        const characterName = getCharacterName(item.characterId);
        const showAvatar = isUser || item.characterId;

        return (
            <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
                {showAvatar && (
                    <View style={[styles.avatar, isUser ? styles.avatarUser : styles.avatarAI]}>
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
                    </View>
                )}

                <View style={styles.messageContentArea}>
                    {!isUser && (
                        <ThemedText variant="caption" color={theme.textMuted} style={styles.messageSenderName}>
                            {item.characterName}
                        </ThemedText>
                    )}
                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
                        <ThemedText variant="body" style={[styles.messageText, isUser && styles.messageTextUser]}>
                            {item.content}
                        </ThemedText>
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
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark" noPadding>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                {/* 聊天头部 */}
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={handleEndChat} style={{ position: 'absolute', left: Spacing.md }}>
                        <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <ThemedText variant="medium" color={theme.textPrimary} style={styles.chatTitleText}>
                        {currentTopic}
                    </ThemedText>
                    {isLoading && (
                        <ActivityIndicator size="small" color={theme.primary} style={{ position: 'absolute', right: Spacing.md }} />
                    )}
                </View>

                {/* 自动推演轮次信息 */}
                {autoMode && roundInfo && (
                    <View style={{
                        backgroundColor: theme.primaryLight || `${theme.primary}15`,
                        paddingVertical: Spacing.xs,
                        paddingHorizontal: Spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <FontAwesome6 name="robot" size={12} color={theme.primary} style={{ marginRight: Spacing.xs }} />
                        <ThemedText variant="small" color={theme.primary}>
                            自动推演 · 第 {roundInfo.round} 轮 · 第 {roundInfo.speaker}/3 人
                        </ThemedText>
                    </View>
                )}

                {/* 场景推演状态 */}
                {currentScene && (
                    <View style={{
                        backgroundColor: theme.backgroundSecondary,
                        paddingVertical: Spacing.sm,
                        paddingHorizontal: Spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome6 name="film" size={14} color={theme.primary} style={{ marginRight: Spacing.sm }} />
                            <ThemedText variant="small" color={theme.text}>
                                {currentScene.sceneName}
                            </ThemedText>
                        </View>
                        <ThemedText variant="small" color={theme.textMuted}>
                            {currentScene.sequence}/{currentScene.totalScenes}
                        </ThemedText>
                    </View>
                )}

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
                        />
                    )}
                </View>

                {/* 输入区域 */}
                <View style={styles.inputSection}>
                    {/* @按钮 */}
                    <TouchableOpacity
                        style={styles.atButton}
                        onPress={() => setShowAtPicker(true)}
                    >
                        <FontAwesome6 name="at" size={22} color={theme.primary} />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.textInput}
                        placeholder="输入消息，可@角色..."
                        placeholderTextColor="#999999"
                        value={userInput}
                        onChangeText={setUserInput}
                        multiline
                        maxLength={200}
                        editable={!isLoading}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (isLoading || !userInput.trim()) && styles.sendButtonDisabled]}
                        onPress={handleSendMessage}
                        disabled={isLoading || !userInput.trim()}
                    >
                        <ThemedText variant="small" color="#FFFFFF" style={styles.sendButtonText}>
                            发送
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* 底部操作 */}
                <View style={styles.bottomActions}>
                    {/* 自动推演模式按钮 */}
                    {autoMode ? (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.autoModeActive]}
                            onPress={stopAutoMode}
                        >
                            <FontAwesome6 name="pause" size={14} color="#FFFFFF" />
                            <ThemedText variant="small" color="#FFFFFF">
                                暂停推演 ({autoRound}/5)
                            </ThemedText>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={startAutoMode}
                            disabled={isLoading || isGeneratingRef.current}
                        >
                            <FontAwesome6 name="play" size={14} color={theme.textSecondary} />
                            <ThemedText variant="small" color={theme.textSecondary}>自动推演</ThemedText>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionButton} onPress={handleClearChat}>
                        <FontAwesome6 name="trash" size={14} color={theme.textSecondary} />
                        <ThemedText variant="small" color={theme.textSecondary}>清空</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={handleEndChat}>
                        <FontAwesome6 name="door-open" size={14} color={theme.textSecondary} />
                        <ThemedText variant="small" color={theme.textSecondary}>结束</ThemedText>
                    </TouchableOpacity>
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
                                <View style={[styles.atPickerContent, { backgroundColor: theme.backgroundSecondary }]}>
                                    <View style={styles.atPickerHeader}>
                                        <ThemedText variant="medium" color={theme.textPrimary}>@选择角色</ThemedText>
                                        <TouchableOpacity onPress={() => setShowAtPicker(false)}>
                                            <FontAwesome6 name="xmark" size={18} color={theme.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView style={styles.atPickerList}>
                                        {getFinalCharacters.map(character => (
                                            <TouchableOpacity
                                                key={character.id}
                                                style={[styles.atPickerItem, { borderBottomColor: theme.borderLight }]}
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
                                                    <ThemedText variant="smallMedium" color={theme.textPrimary}>
                                                        @{character.name}
                                                    </ThemedText>
                                                    <ThemedText variant="tiny" color={theme.textMuted}>
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

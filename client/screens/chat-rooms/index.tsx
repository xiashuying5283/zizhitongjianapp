import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import { createStyles } from './styles';
import { fetchChatHistoryList, deleteChatRoom, ChatRoom } from '@/utils/chat-history-api';
import { fetchCharacters, Character } from '@/utils/characters-api';

export default function ChatRoomsScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();

    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // 加载数据
    const loadData = async () => {
        try {
            const [roomsData, charsData] = await Promise.all([
                fetchChatHistoryList(),
                fetchCharacters(),
            ]);
            setChatRooms(roomsData);
            setCharacters(charsData);
        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // 下拉刷新
    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // 删除群聊
    const handleDelete = (room: ChatRoom) => {
        Alert.alert(
            '删除群聊',
            `确定删除「${room.topicTitle}」吗？删除后无法恢复。`,
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteChatRoom(room.id);
                        if (success) {
                            setChatRooms(prev => prev.filter(r => r.id !== room.id));
                        }
                    },
                },
            ]
        );
    };

    // 进入群聊
    const handleEnter = (room: ChatRoom) => {
        router.push(`/group-chat?roomId=${room.id}`);
    };

    // 新建群聊
    const handleNew = () => {
        router.push('/group-chat');
    };

    // 获取人物头像
    const getCharacterAvatars = (characterIds: string[]) => {
        return characterIds.slice(0, 4).map(id => {
            const char = characters.find(c => c.id === id);
            return char?.avatar || '👤';
        });
    };

    // 获取人物名称
    const getCharacterNames = (characterIds: string[]) => {
        return characterIds.slice(0, 3).map(id => {
            const char = characters.find(c => c.id === id);
            return char?.name || '未知';
        }).join('、');
    };

    // 格式化日期
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (dayDiff === 0) return '今天';
        if (dayDiff === 1) return '昨天';
        if (dayDiff < 7) return `${dayDiff}天前`;

        return `${date.getMonth() + 1}月${date.getDate()}日`;
    };

    // 按日期分组
    const groupedRooms = useMemo(() => {
        const groups: { [key: string]: ChatRoom[] } = {};
        chatRooms.forEach(room => {
            const dateKey = formatDate(room.updatedAt);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(room);
        });
        return groups;
    }, [chatRooms]);

    // 渲染空状态
    if (!loading && chatRooms.length === 0) {
        return (
            <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
                <View style={styles.emptyState}>
                    <ThemedText variant="h1" style={styles.emptyIcon}>💬</ThemedText>
                    <ThemedText variant="h4" color={theme.textPrimary} style={styles.emptyTitle}>
                        暂无群聊记录
                    </ThemedText>
                    <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                        选择话题和历史人物，开启一场精彩的群聊吧！
                    </ThemedText>
                    <TouchableOpacity style={styles.emptyButton} onPress={handleNew}>
                        <ThemedText variant="smallMedium" color="#FFFFFF">
                            开始新群聊
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </Screen>
        );
    }

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitle}>
                        <ThemedText variant="h2" color={theme.textPrimary}>
                            我的群聊
                        </ThemedText>
                    </View>
                    <TouchableOpacity style={styles.newButton} onPress={handleNew}>
                        <FontAwesome6 name="plus" size={14} color="#FFFFFF" />
                        <ThemedText variant="small" color="#FFFFFF" style={styles.newButtonText}>
                            新建
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* 群聊列表 */}
                <View style={styles.listContainer}>
                    {Object.entries(groupedRooms).map(([dateLabel, rooms]) => (
                        <View key={dateLabel} style={styles.dateGroup}>
                            <ThemedText variant="caption" color={theme.textMuted} style={styles.dateTitle}>
                                {dateLabel}
                            </ThemedText>

                            {rooms.map(room => (
                                <TouchableOpacity
                                    key={room.id}
                                    style={styles.roomCard}
                                    onPress={() => handleEnter(room)}
                                >
                                    <View style={styles.roomHeader}>
                                        <View style={styles.roomTitle}>
                                            <ThemedText variant="medium" color={theme.textPrimary} style={styles.roomTitleText}>
                                                {room.topicTitle}
                                            </ThemedText>
                                            <View style={styles.roomMeta}>
                                                <ThemedText variant="tiny" color={theme.textMuted}>
                                                    {getCharacterNames(room.characterIds)}等{room.characterIds.length}人
                                                </ThemedText>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDelete(room)}
                                        >
                                            <FontAwesome6 name="trash" size={16} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.roomFooter}>
                                        <View style={styles.roomCharacters}>
                                            <View style={styles.characterAvatars}>
                                                {getCharacterAvatars(room.characterIds).map((avatar, index) => (
                                                    <View
                                                        key={index}
                                                        style={[styles.characterAvatar, { backgroundColor: theme.backgroundTertiary }]}
                                                    >
                                                        <ThemedText variant="caption" color={theme.textPrimary} style={styles.characterAvatarText}>
                                                            {avatar}
                                                        </ThemedText>
                                                    </View>
                                                ))}
                                            </View>
                                            {room.characterIds.length > 4 && (
                                                <ThemedText variant="tiny" color={theme.textMuted} style={styles.moreCharacters}>
                                                    +{room.characterIds.length - 4}
                                                </ThemedText>
                                            )}
                                        </View>

                                        <View style={styles.roomStats}>
                                            <View style={styles.statItem}>
                                                <FontAwesome6 name="comment" size={12} color={theme.textMuted} />
                                                <ThemedText variant="tiny" color={theme.textMuted}>
                                                    {room.messageCount}条
                                                </ThemedText>
                                            </View>
                                            <View style={[
                                                styles.statusBadge,
                                                room.status === 'active' ? styles.statusActive : styles.statusEnded
                                            ]}>
                                                <ThemedText
                                                    variant="tiny"
                                                    color={room.status === 'active' ? theme.primary : theme.textMuted}
                                                    style={styles.statusText}
                                                >
                                                    {room.status === 'active' ? '进行中' : '已结束'}
                                                </ThemedText>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </Screen>
    );
}

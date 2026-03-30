import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import { createStyles } from './styles';
import { getNotifications, markNotificationsRead, Notification } from '@/utils/community';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const result = await getNotifications({ userId: user.id, limit: 50 });
      if (result.success) {
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unreadCount);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // 标记为已读
    if (!notification.isRead && user) {
      await markNotificationsRead(user.id, [notification.id]);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // 跳转到帖子详情，定位到评论
    router.push('/post-detail', { id: notification.postId, commentId: notification.commentId });
  };

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      await markNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getNotificationText = (notification: Notification) => {
    const fromName = notification.fromUser?.nickname || '有人';
    if (notification.type === 'post_comment') {
      return `${fromName} 评论了你的帖子`;
    } else {
      return `${fromName} 回复了你的评论`;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <FontAwesome6
          name={item.type === 'post_comment' ? 'comment' : 'reply'}
          size={20}
          color={item.isRead ? theme.textMuted : theme.primary}
        />
      </View>
      <View style={styles.notificationContent}>
        <ThemedText
          variant="body"
          color={item.isRead ? theme.textSecondary : theme.textPrimary}
        >
          {getNotificationText(item)}
        </ThemedText>
        {item.postTitle && (
          <ThemedText variant="small" color={theme.textMuted} style={styles.postTitle}>
            「{item.postTitle}」
          </ThemedText>
        )}
        {item.content && (
          <ThemedText variant="caption" color={theme.textMuted} style={styles.preview} numberOfLines={2}>
            {item.content}
          </ThemedText>
        )}
        <ThemedText variant="caption" color={theme.textMuted}>
          {formatTime(item.createdAt)}
        </ThemedText>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="title" color={theme.textPrimary}>消息通知</ThemedText>
          <View style={{ width: 40 }} />
        </ThemedView>
        <View style={styles.emptyContainer}>
          <ThemedText variant="body" color={theme.textMuted}>请先登录查看通知</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="title" color={theme.textPrimary}>消息通知</ThemedText>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markReadButton} onPress={handleMarkAllRead}>
            <ThemedText variant="small" color={theme.primary}>全部已读</ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </ThemedView>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="bell-slash" size={48} color={theme.textMuted} />
          <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.lg }}>
            暂无通知
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </Screen>
  );
}

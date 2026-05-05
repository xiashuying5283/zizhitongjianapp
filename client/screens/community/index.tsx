import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';
import { getPosts, deletePost, getNotifications, Post } from '@/utils/community';

type Category = 'all' | 'discussion' | 'question' | 'sharing' | 'notice';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

// 提取内容中的所有图片URL
const extractImages = (content: string): string[] => {
  const imgRegex = /\[img\](.*?)\[\/img\]/g;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1]);
  }
  return images;
};

// 移除内容中的图片标记，返回纯文本
const stripImages = (content: string): string => {
  return content.replace(/\[img\].*?\[\/img\]/g, '').trim();
};

const CATEGORY_LABELS: Record<Category, string> = {
  all: '全部',
  discussion: '讨论',
  question: '提问',
  sharing: '分享',
  notice: '公告',
};

export default function CommunityScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchPosts = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const params: { category?: string; page: number; limit: number; userId?: number } = {
        page: pageNum,
        limit: 20,
      };

      if (activeCategory !== 'all') {
        params.category = activeCategory;
      }

      if (showMyPosts && user) {
        params.userId = user.id;
      }

      /**
       * 服务端文件：server/src/routes/posts.ts
       * 接口：GET /api/v1/posts
       * Query 参数：category?: string, page?: number, limit?: number
       */
      const result = await getPosts(params);

      if (result.success) {
        if (refresh || pageNum === 1) {
          setPosts(result.data.posts);
        } else {
          setPosts(prev => [...prev, ...result.data.posts]);
        }
        setHasMore(pageNum < result.data.totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('获取帖子列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, showMyPosts, user]);

  // 获取未读通知数
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getNotifications({ userId: user.id, limit: 1 });
      if (result?.success && result?.data) {
        setUnreadCount(result.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('获取未读通知数失败:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1);
      fetchUnreadCount();
    }, [fetchPosts, fetchUnreadCount])
  );

  const handleRefresh = () => {
    fetchPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1);
    }
  };

  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
    setPage(1);
    setPosts([]);
    setHasMore(true);
  };

  const handleToggleMyPosts = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setShowMyPosts(prev => !prev);
    setPage(1);
    setPosts([]);
    setHasMore(true);
  };

  const handleEditPost = (postId: number) => {
    router.push('/edit-post', { id: postId });
  };

  const handleDeletePost = (post: Post) => {
    if (!user) return;

    Alert.alert(
      '确认删除',
      '删除后无法恢复，确定要删除这篇帖子吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deletePost(post.id, user.id);
              if (result.success) {
                setPosts(prev => prev.filter(p => p.id !== post.id));
              }
            } catch (error) {
              console.error('删除帖子失败:', error);
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
  };

  const handlePostPress = (postId: number) => {
    router.push('/post-detail', { id: postId });
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push('/create-post');
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

  const isOwner = (post: Post) => user && post.user.id === user.id;

  const renderImageGrid = (images: string[]) => {
    if (images.length === 0) return null;
    
    const imageCount = images.length;
    
    // 单张图片：大图展示
    if (imageCount === 1) {
      return (
        <Image
          source={{ uri: images[0].startsWith('http') ? images[0] : `${BASE_URL}${images[0]}` }}
          style={styles.singleImage}
          resizeMode="cover"
        />
      );
    }
    
    // 2张图片：并排显示
    if (imageCount === 2) {
      return (
        <View style={styles.grid2}>
          {images.map((img, index) => (
            <Image
              key={index}
              source={{ uri: img.startsWith('http') ? img : `${BASE_URL}${img}` }}
              style={styles.gridImage2}
              resizeMode="cover"
            />
          ))}
        </View>
      );
    }
    
    // 3张及以上：九宫格布局（最多显示9张）
    const displayImages = images.slice(0, 9);
    
    return (
      <View style={styles.imageGrid}>
        {displayImages.map((img, index) => (
          <View key={index} style={styles.gridItem}>
            <Image
              source={{ uri: img.startsWith('http') ? img : `${BASE_URL}${img}` }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            {index === 8 && imageCount > 9 && (
              <View style={styles.moreImagesOverlay}>
                <ThemedText variant="bodyMedium" color="#fff">+{imageCount - 9}</ThemedText>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
    const images = extractImages(item.content);
    const textContent = stripImages(item.content);
    
    return (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => handlePostPress(item.id)}
      activeOpacity={0.7}
    >
      {/* 用户信息 */}
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          <ThemedText variant="captionMedium" color={theme.buttonPrimaryText}>
            {item.user.nickname.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.postMeta}>
          <ThemedText variant="smallMedium" color={theme.textPrimary}>
            {item.user.nickname}
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            {formatTime(item.created_at)} · {CATEGORY_LABELS[item.category as Category] || item.category}
          </ThemedText>
        </View>
        {item.is_pinned && (
          <View style={styles.pinnedTag}>
            <ThemedText variant="tiny" color={theme.primary}>置顶</ThemedText>
          </View>
        )}
        {/* 自己的帖子显示编辑删除按钮 */}
        {isOwner(item) && (
          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleEditPost(item.id)}
            >
              <FontAwesome6 name="pen" size={14} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeletePost(item)}
            >
              <FontAwesome6 name="trash" size={14} color={theme.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 帖子内容 */}
      <ThemedText variant="h4" color={theme.textPrimary} style={styles.postTitle}>
        {item.title}
      </ThemedText>
      
      {/* 图片网格 */}
      {renderImageGrid(images)}
      
      {/* 文字内容 */}
      {textContent && (
        <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2} style={styles.postContent}>
          {textContent}
        </ThemedText>
      )}

      {/* 底部统计 */}
      <View style={styles.postFooter}>
        <View style={styles.statItem}>
          <FontAwesome6 name="heart" size={14} color={theme.textMuted} />
          <ThemedText variant="caption" color={theme.textMuted}>{item.like_count}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <FontAwesome6 name="comment" size={14} color={theme.textMuted} />
          <ThemedText variant="caption" color={theme.textMuted}>{item.comment_count}</ThemedText>
        </View>
        <View style={styles.categoryTag}>
          <ThemedText variant="tiny" color={theme.accent}>
            {CATEGORY_LABELS[item.category as Category] || item.category}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
  };

  const categories: Category[] = ['all', 'discussion', 'question', 'sharing', 'notice'];

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerMainRow}>
          <View style={styles.headerTitleWrap}>
            <ThemedText variant="h1" color={theme.textPrimary}>读书社区</ThemedText>
            <ThemedText variant="small" color={theme.textMuted} style={styles.headerSubtitle}>
              讨论、提问、分享、公告与读书互助
            </ThemedText>
          </View>
          <View style={styles.headerIconActions}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <FontAwesome6 name="bell" size={18} color={theme.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <ThemedText variant="tiny" color={theme.buttonPrimaryText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.createButton} onPress={handleCreatePost}>
              <FontAwesome6 name="pen-to-square" size={16} color={theme.buttonPrimaryText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerUtilityRow}>
          <TouchableOpacity
            style={[styles.myPostsButton, showMyPosts && styles.myPostsButtonActive]}
            onPress={handleToggleMyPosts}
          >
            <FontAwesome6
              name="user"
              size={14}
              color={showMyPosts ? theme.buttonPrimaryText : theme.textMuted}
            />
            <ThemedText
              variant="small"
              color={showMyPosts ? theme.buttonPrimaryText : theme.textMuted}
            >
              我的帖子
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              activeCategory === category && styles.categoryTabActive,
            ]}
            onPress={() => handleCategoryChange(category)}
            activeOpacity={0.8}
          >
            <ThemedText
              variant="small"
              color={activeCategory === category ? theme.buttonPrimaryText : theme.textSecondary}
              numberOfLines={1}
            >
              {CATEGORY_LABELS[category]}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          hasMore && posts.length > 0 ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="comments" size={48} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                暂无帖子，快来发表你的见解吧
              </ThemedText>
            </View>
          )
        }
      />
    </Screen>
  );
}

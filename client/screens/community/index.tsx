import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getPosts, Post } from '@/utils/community';

type Category = 'all' | 'discussion' | 'question' | 'sharing' | 'notice';

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
  const [showMyPosts, setShowMyPosts] = useState(false); // 是否只显示我的帖子
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const params: { category?: string; userId?: number; page: number; limit: number } = {
        page: pageNum,
        limit: 20,
      };

      if (activeCategory !== 'all') {
        params.category = activeCategory;
      }

      // 如果开启了"我的帖子"且用户已登录，则只显示自己的帖子
      if (showMyPosts && isAuthenticated && user) {
        params.userId = user.id;
      }

      /**
       * 服务端文件：server/src/routes/posts.ts
       * 接口：GET /api/v1/posts
       * Query 参数：category?: string, userId?: number, page?: number, limit?: number
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
  }, [activeCategory, showMyPosts, isAuthenticated, user]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1);
    }, [fetchPosts])
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
    setShowMyPosts(!showMyPosts);
    setPage(1);
    setPosts([]);
    setHasMore(true);
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

  const renderPost = ({ item }: { item: Post }) => (
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
            {formatTime(item.created_at)}
          </ThemedText>
        </View>
        {item.is_pinned && (
          <View style={styles.pinnedTag}>
            <ThemedText variant="tiny" color={theme.buttonPrimaryText}>置顶</ThemedText>
          </View>
        )}
      </View>

      {/* 帖子内容 */}
      <ThemedText variant="h4" color={theme.textPrimary} style={styles.postTitle}>
        {item.title}
      </ThemedText>
      <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2} style={styles.postContent}>
        {item.content}
      </ThemedText>

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

  const categories: Category[] = ['all', 'discussion', 'question', 'sharing', 'notice'];

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* 头部 */}
      <ThemedView level="root" style={styles.header}>
        <ThemedText variant="h2" color={theme.textPrimary}>读书社区</ThemedText>
        <TouchableOpacity style={styles.createButton} onPress={handleCreatePost}>
          <FontAwesome6 name="pen-to-square" size={18} color={theme.buttonPrimaryText} />
        </TouchableOpacity>
      </ThemedView>

      {/* 分类筛选 */}
      <View style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              activeCategory === category && styles.categoryTabActive,
            ]}
            onPress={() => handleCategoryChange(category)}
          >
            <ThemedText
              variant="small"
              color={activeCategory === category ? theme.buttonPrimaryText : theme.textSecondary}
            >
              {CATEGORY_LABELS[category]}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* 我的帖子切换按钮 */}
      <View style={styles.myPostsContainer}>
        <TouchableOpacity
          style={[
            styles.myPostsButton,
            showMyPosts && styles.myPostsButtonActive,
          ]}
          onPress={handleToggleMyPosts}
        >
          <FontAwesome6
            name="user"
            size={14}
            color={showMyPosts ? theme.buttonPrimaryText : theme.textSecondary}
          />
          <ThemedText
            variant="small"
            color={showMyPosts ? theme.buttonPrimaryText : theme.textSecondary}
            style={styles.myPostsButtonText}
          >
            {showMyPosts ? '我的帖子' : '全部帖子'}
          </ThemedText>
          {showMyPosts && (
            <TouchableOpacity onPress={() => setShowMyPosts(false)}>
              <FontAwesome6
                name="xmark"
                size={12}
                color={theme.buttonPrimaryText}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* 帖子列表 */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="comments" size={48} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                {showMyPosts
                  ? '你还没有发表过帖子，快去发表吧'
                  : '暂无帖子，快来发表你的见解吧'
                }
              </ThemedText>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

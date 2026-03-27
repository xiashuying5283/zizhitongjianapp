import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getPost, getComments, createComment, likePost, likeComment, Post, Comment } from '@/utils/community';

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated } = useAuth();
  const params = useSafeSearchParams<{ id: number }>();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);

  const postId = params.id;

  const fetchData = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);

      /**
       * 服务端文件：server/src/routes/posts.ts
       * 接口：GET /api/v1/posts/:id
       * Path 参数：id: number
       */
      const postResult = await getPost(postId);
      if (postResult.success) {
        setPost(postResult.data);
      }

      /**
       * 服务端文件：server/src/routes/comments.ts
       * 接口：GET /api/v1/comments/post/:postId
       * Path 参数：postId: number
       * Query 参数：page?: number, limit?: number
       */
      const commentsResult = await getComments(postId, { limit: 100 });
      if (commentsResult.success) {
        setComments(commentsResult.data.comments);
      }
    } catch (error) {
      console.error('获取帖子详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLike = async () => {
    if (!isAuthenticated || !user || !post) {
      router.push('/login');
      return;
    }

    try {
      /**
       * 服务端文件：server/src/routes/posts.ts
       * 接口：POST /api/v1/posts/:id/like
       * Path 参数：id: number
       * Body 参数：userId: number
       */
      const result = await likePost(post.id, user.id);
      if (result.success) {
        setLiked(result.data.liked);
        setPost(prev => prev ? {
          ...prev,
          like_count: prev.like_count + (result.data.liked ? 1 : -1),
        } : null);
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated || !user || !post) {
      router.push('/login');
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('提示', '请输入评论内容');
      return;
    }

    try {
      setSubmitting(true);

      /**
       * 服务端文件：server/src/routes/comments.ts
       * 接口：POST /api/v1/comments
       * Body 参数：postId: number, content: string, parentId?: number, userId: number
       */
      const result = await createComment({
        postId: post.id,
        content: commentText.trim(),
        parentId: replyTo?.id,
        userId: user.id,
      });

      if (result.success) {
        setCommentText('');
        setReplyTo(null);
        // 重新获取评论列表
        fetchData();
      }
    } catch (error) {
      console.error('发表评论失败:', error);
      Alert.alert('错误', '发表评论失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    try {
      /**
       * 服务端文件：server/src/routes/comments.ts
       * 接口：POST /api/v1/comments/:id/like
       * Path 参数：id: number
       * Body 参数：userId: number
       */
      await likeComment(comment.id, user.id);
      fetchData();
    } catch (error) {
      console.error('点赞评论失败:', error);
    }
  };

  const handleReply = (comment: Comment) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setReplyTo(comment);
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

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <View
      key={comment.id}
      style={[styles.commentItem, isReply && styles.replyItem]}
    >
      <View style={styles.commentHeader}>
        <View style={[styles.avatar, isReply && styles.smallAvatar]}>
          <ThemedText variant="tiny" color={theme.buttonPrimaryText}>
            {comment.user.nickname.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.commentMeta}>
          <ThemedText variant="smallMedium" color={theme.textPrimary}>
            {comment.user.nickname}
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            {formatTime(comment.created_at)}
          </ThemedText>
        </View>
      </View>
      <ThemedText variant="body" color={theme.textSecondary} style={styles.commentContent}>
        {comment.content}
      </ThemedText>
      <View style={styles.commentActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLikeComment(comment)}
        >
          <FontAwesome6 name="heart" size={14} color={theme.textMuted} />
          <ThemedText variant="caption" color={theme.textMuted}>{comment.like_count || 0}</ThemedText>
        </TouchableOpacity>
        {!isReply && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleReply(comment)}
          >
            <FontAwesome6 name="reply" size={14} color={theme.textMuted} />
            <ThemedText variant="caption" color={theme.textMuted}>回复</ThemedText>
          </TouchableOpacity>
        )}
      </View>
      {/* 回复列表 */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map(reply => renderComment(reply, true))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color={theme.textMuted}>帖子不存在</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 头部导航 */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="title" color={theme.textPrimary}>帖子详情</ThemedText>
          <View style={{ width: 40 }} />
        </ThemedView>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 帖子内容 */}
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              <View style={styles.avatar}>
                <ThemedText variant="captionMedium" color={theme.buttonPrimaryText}>
                  {post.user.nickname.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.postMeta}>
                <ThemedText variant="smallMedium" color={theme.textPrimary}>
                  {post.user.nickname}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  {formatTime(post.created_at)}
                </ThemedText>
              </View>
            </View>

            <ThemedText variant="h3" color={theme.textPrimary} style={styles.postTitle}>
              {post.title}
            </ThemedText>

            <ThemedText variant="body" color={theme.textSecondary} style={styles.postContent}>
              {post.content}
            </ThemedText>

            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <FontAwesome6
                  name={liked ? "heart" : "heart"}
                  size={18}
                  color={liked ? theme.error : theme.textMuted}
                  solid={liked}
                />
                <ThemedText variant="small" color={liked ? theme.error : theme.textMuted}>
                  {post.like_count}
                </ThemedText>
              </TouchableOpacity>
              <View style={styles.actionButton}>
                <FontAwesome6 name="comment" size={18} color={theme.textMuted} />
                <ThemedText variant="small" color={theme.textMuted}>{post.comment_count}</ThemedText>
              </View>
            </View>
          </View>

          {/* 评论区 */}
          <View style={styles.commentsSection}>
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.commentsTitle}>
              评论 ({comments.length})
            </ThemedText>

            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <ThemedText variant="body" color={theme.textMuted}>暂无评论，快来发表你的见解吧</ThemedText>
              </View>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
          </View>
        </ScrollView>

        {/* 评论输入框 */}
        <View style={styles.commentInputContainer}>
          {replyTo && (
            <View style={styles.replyingTo}>
              <ThemedText variant="caption" color={theme.textMuted}>
                回复 @{replyTo.user.nickname}
              </ThemedText>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <FontAwesome6 name="xmark" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInput}>
            <TextInput
              style={styles.input}
              placeholder={isAuthenticated ? "写下你的评论..." : "登录后发表评论"}
              placeholderTextColor={theme.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              editable={isAuthenticated}
            />
            <TouchableOpacity
              style={[styles.submitButton, !commentText.trim() && styles.submitButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submitting || !isAuthenticated}
            >
              <ThemedText
                variant="smallMedium"
                color={commentText.trim() ? theme.buttonPrimaryText : theme.textMuted}
              >
                发送
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

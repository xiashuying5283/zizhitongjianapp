import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, Image, Modal, FlatList, Dimensions } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getPost, getComments, createComment, likePost, likeComment, deleteComment, Post, Comment } from '@/utils/community';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 解析内容中的文本和图片
function parseContent(content: string): { type: 'text' | 'image'; value: string }[] {
  const parts: { type: 'text' | 'image'; value: string }[] = [];
  const regex = /\[img\](.*?)\[\/img\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // 添加图片前的文本
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        parts.push({ type: 'text', value: text });
      }
    }
    // 添加图片
    parts.push({ type: 'image', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      parts.push({ type: 'text', value: text });
    }
  }

  return parts;
}

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated } = useAuth();
  const params = useSafeSearchParams<{ id: number; commentId?: number }>();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const imageFlatListRef = useRef<FlatList>(null);
  const commentRefs = useRef<Map<number, View>>(new Map());

  const postId = params.id;
  const targetCommentId = params.commentId;

  // 判断当前用户是否是帖子作者
  const isOwner = user && post && user.id === post.user.id;

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

  // 滚动到目标评论
  useEffect(() => {
    if (targetCommentId && comments.length > 0 && !loading) {
      setHighlightedCommentId(targetCommentId);

      // 延迟滚动，等待渲染完成
      setTimeout(() => {
        const commentView = commentRefs.current.get(targetCommentId);
        if (commentView && scrollViewRef.current) {
          commentView.measureInWindow((x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          });
        }
      }, 300);

      // 3秒后取消高亮
      setTimeout(() => {
        setHighlightedCommentId(null);
      }, 3000);
    }
  }, [targetCommentId, comments, loading]);

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

  const handleDeleteComment = async (comment: Comment) => {
    if (!user || !post) return;

    Alert.alert(
      '确认删除',
      '确定要删除这条评论吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteComment(comment.id, user.id);
              if (result.success) {
                // 从本地状态移除评论
                setComments(prev => {
                  // 检查是否是顶级评论
                  const parentIndex = prev.findIndex(c => c.id === comment.id);
                  if (parentIndex !== -1) {
                    // 是顶级评论，直接移除
                    return prev.filter(c => c.id !== comment.id);
                  }
                  // 是回复，从父评论中移除
                  return prev.map(c => ({
                    ...c,
                    replies: c.replies?.filter(r => r.id !== comment.id),
                  }));
                });
                // 更新评论计数
                setPost(prev => prev ? { ...prev, comment_count: prev.comment_count - 1 } : null);
              }
            } catch (error) {
              console.error('删除评论失败:', error);
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
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

  const handleImagePress = (imageUrl: string, images: string[]) => {
    setAllImages(images);
    const index = images.findIndex(img => {
      const fullUrl = img.startsWith('http') ? img : `${BASE_URL}${img}`;
      return fullUrl === imageUrl || img === imageUrl;
    });
    setCurrentImageIndex(index >= 0 ? index : 0);
    setImageModalVisible(true);
  };

  // 从帖子内容中提取所有图片
  const getPostImages = useCallback(() => {
    if (!post) return [];
    return parseContent(post.content)
      .filter(part => part.type === 'image')
      .map(part => part.value.startsWith('http') ? part.value : `${BASE_URL}${part.value}`);
  }, [post]);

  // 渲染图片网格
  const renderImageGrid = (images: string[]) => {
    if (images.length === 0) return null;
    
    const imageCount = images.length;
    
    // 单张图片：大图展示
    if (imageCount === 1) {
      return (
        <TouchableOpacity
          onPress={() => handleImagePress(images[0], images)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: images[0] }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }
    
    // 2张图片：并排显示
    if (imageCount === 2) {
      return (
        <View style={styles.grid2}>
          {images.map((img, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleImagePress(img, images)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: img }}
                style={styles.gridImage2}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    
    // 3张及以上：九宫格布局（最多显示9张）
    const displayImages = images.slice(0, 9);
    
    return (
      <View style={styles.imageGrid}>
        {displayImages.map((img, index) => (
          <TouchableOpacity
            key={index}
            style={styles.gridItem}
            onPress={() => handleImagePress(img, images)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: img }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            {index === 8 && imageCount > 9 && (
              <View style={styles.moreImagesOverlay}>
                <ThemedText variant="bodyMedium" color="#fff">+{imageCount - 9}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isHighlighted = highlightedCommentId === comment.id;
    return (
      <View
        key={comment.id}
        ref={(ref) => {
          if (ref) {
            commentRefs.current.set(comment.id, ref as unknown as View);
          } else {
            commentRefs.current.delete(comment.id);
          }
        }}
        style={[
          styles.commentItem,
          isReply && styles.replyItem,
          isHighlighted && styles.highlightedComment,
        ]}
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
        {/* 评论作者或帖子作者可删除评论 */}
        {(isOwner || (user && comment.user.id === user.id)) && (
          <TouchableOpacity onPress={() => handleDeleteComment(comment)} style={styles.deleteCommentButton}>
            <FontAwesome6 name="trash" size={14} color={theme.textMuted} />
          </TouchableOpacity>
        )}
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
  };

  if (loading) {
    return (
      <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color={theme.textMuted}>帖子不存在</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        {/* 头部导航 */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="title" color={theme.textPrimary}>帖子详情</ThemedText>
          <View style={{ width: 40 }} />
        </ThemedView>

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
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

            {/* 帖子内容 */}
            <View style={styles.postContent}>
              {/* 文字内容 */}
              {parseContent(post.content)
                .filter(part => part.type === 'text')
                .map((part, index) => (
                  <ThemedText key={index} variant="body" color={theme.textSecondary} style={styles.contentText}>
                    {part.value}
                  </ThemedText>
                ))}
              
              {/* 图片网格 */}
              {renderImageGrid(getPostImages())}
            </View>

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

      {/* 图片查看 Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <FontAwesome6 name="xmark" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* 图片指示器 */}
          {allImages.length > 1 && (
            <View style={styles.imageIndicator}>
              <ThemedText variant="smallMedium" color="#fff">
                {currentImageIndex + 1} / {allImages.length}
              </ThemedText>
            </View>
          )}
          
          <FlatList
            ref={imageFlatListRef}
            data={allImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentImageIndex}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                imageFlatListRef.current?.scrollToIndex({ index: info.index, animated: false });
              }, 100);
            }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <ScrollView
                style={styles.imageModalContent}
                contentContainerStyle={styles.imageScrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                bouncesZoom
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setImageModalVisible(false)}
                  style={styles.imageTouchable}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </ScrollView>
            )}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />
        </View>
      </Modal>
    </Screen>
  );
}

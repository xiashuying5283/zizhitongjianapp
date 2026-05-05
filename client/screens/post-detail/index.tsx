import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, Image, Modal, FlatList, Dimensions, StyleProp, ViewStyle, TextStyle, Keyboard, LayoutAnimation, UIManager, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getPost, getComments, createComment, likePost, likeComment, deleteComment, uploadImage, Post, Comment } from '@/utils/community';
import { copyToClipboard } from '@/utils/share';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COMMENT_EMOJIS = [
  0x1F600, 0x1F602, 0x1F979, 0x1F60A, 0x1F60D, 0x1F914, 0x1F62E, 0x1F605, 0x1F62D,
  0x1F44F, 0x1F64F, 0x1F44D, 0x1F440, 0x2764, 0x1F525, 0x2728, 0x1F4DA, 0x1F4DD,
].map((codePoint) => String.fromCodePoint(codePoint));

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
  const [actionMenuComment, setActionMenuComment] = useState<Comment | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(124);
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [uploadingCommentMedia, setUploadingCommentMedia] = useState(false);
  const [commentInputFocused, setCommentInputFocused] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const imageFlatListRef = useRef<FlatList>(null);
  const commentInputRef = useRef<TextInput>(null);
  const commentRefs = useRef<Map<number, View>>(new Map());
  const scrollOffsetYRef = useRef(0);

  const postId = params.id;
  const targetCommentId = params.commentId;

  // 判断当前用户是否是帖子作者
  const isOwner = user && post && user.id === post.user.id;

  const fetchPostDetail = useCallback(async () => {
    if (!postId) return;

    /**
     * 服务端文件：server/src/routes/posts.ts
     * 接口：GET /api/v1/posts/:id
     * Path 参数：id: number
     */
    const postResult = await getPost(postId);
    if (postResult.success) {
      setPost(postResult.data);
    }
  }, [postId]);

  const fetchCommentsOnly = useCallback(async () => {
    if (!postId) return;

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
  }, [postId]);

  const fetchData = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      await Promise.all([fetchPostDetail(), fetchCommentsOnly()]);
    } catch (error) {
      console.error('获取帖子详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCommentsOnly, fetchPostDetail, postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const handleHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      handleShow.remove();
      handleHide.remove();
    };
  }, []);

  const ensureReplyTargetVisible = useCallback((commentId: number, keyboardTopY: number) => {
    const commentView = commentRefs.current.get(commentId);
    if (!commentView || !scrollViewRef.current) return;

    requestAnimationFrame(() => {
      commentView.measureInWindow((_x, y, _width, height) => {
        const visibleBottom = keyboardTopY - composerHeight - 12;
        const commentBottom = y + height;
        const overlap = commentBottom - visibleBottom;

        if (overlap > 0) {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, scrollOffsetYRef.current + overlap + 16),
            animated: true,
          });
        }
      });
    });
  }, [composerHeight]);

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

    if (!commentText.trim() && commentImages.length === 0) {
      Alert.alert('提示', '请输入评论内容或添加图片');
      return;
    }

    try {
      setSubmitting(true);
      setUploadingCommentMedia(commentImages.length > 0);

      const uploadedUrls: string[] = [];
      for (const uri of commentImages) {
        const uploadResult = await uploadImage(uri, user.id);
        if (uploadResult.success && uploadResult.data?.url) {
          uploadedUrls.push(uploadResult.data.url);
        }
      }

      let finalContent = commentText.trim();
      if (uploadedUrls.length > 0) {
        const imageMarkup = uploadedUrls.map(url => `[img]${url}[/img]`).join('\n');
        finalContent = finalContent ? `${finalContent}\n${imageMarkup}` : imageMarkup;
      }

      /**
       * 服务端文件：server/src/routes/comments.ts
       * 接口：POST /api/v1/comments
       * Body 参数：postId: number, content: string, parentId?: number, userId: number
       */
      const result = await createComment({
        postId: post.id,
        content: finalContent,
        parentId: replyTo?.id,
        userId: user.id,
      });

      if (result.success) {
        setCommentText('');
        setCommentImages([]);
        setReplyTo(null);
        setShowEmojiPicker(false);
        setShowMentionPicker(false);
        Keyboard.dismiss();
        await fetchCommentsOnly();
        setPost(prev => prev ? {
          ...prev,
          comment_count: prev.comment_count + 1,
        } : prev);
      }
    } catch (error) {
      console.error('发表评论失败:', error);
      Alert.alert('错误', '发表评论失败，请重试');
    } finally {
      setUploadingCommentMedia(false);
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
      await fetchCommentsOnly();
    } catch (error) {
      console.error('点赞评论失败:', error);
    }
  };

  const handleReply = (comment: Comment) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setComposerExpanded(true);
    setActionMenuComment(null);
    setReplyTo(comment);
    requestAnimationFrame(() => {
      commentInputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!replyTo || keyboardHeight <= 0) return;
    ensureReplyTargetVisible(replyTo.id, SCREEN_HEIGHT - keyboardHeight);
  }, [ensureReplyTargetVisible, keyboardHeight, replyTo]);

  const mentionCandidates = useMemo(() => {
    const uniqueUsers = new Map<number, { id: number; username: string; nickname: string; avatar?: string | null }>();

    const visit = (items: Comment[]) => {
      items.forEach((item) => {
        if (item.user?.id && !uniqueUsers.has(item.user.id)) {
          uniqueUsers.set(item.user.id, item.user);
        }
        if (item.replies?.length) {
          visit(item.replies);
        }
      });
    };

    if (post?.user?.id) {
      uniqueUsers.set(post.user.id, post.user);
    }
    visit(comments);

    return Array.from(uniqueUsers.values());
  }, [comments, post]);

  const appendToCommentText = useCallback((value: string) => {
    setCommentText(prev => `${prev}${value}`);
    requestAnimationFrame(() => {
      commentInputRef.current?.focus();
    });
  }, []);

  const expandComposer = useCallback((focusInput = false) => {
    setComposerExpanded(true);
    if (focusInput) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          commentInputRef.current?.focus();
        });
      });
    }
  }, []);

  const handleInsertEmoji = useCallback((emoji: string) => {
    setShowEmojiPicker(false);
    appendToCommentText(emoji);
  }, [appendToCommentText]);

  const handleInsertMention = useCallback((nickname: string) => {
    setShowMentionPicker(false);
    const prefix = commentText && !commentText.endsWith(' ') ? ' ' : '';
    appendToCommentText(`${prefix}@${nickname} `);
  }, [appendToCommentText, commentText]);

  const handlePickCommentImages = useCallback(async () => {
    setComposerExpanded(true);
    const remainingSlots = 9 - commentImages.length;
    if (remainingSlots <= 0) {
      Alert.alert('提示', '评论最多上传9张图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      setCommentImages(prev => [...prev, ...newUris].slice(0, 9));
      setShowEmojiPicker(false);
      setShowMentionPicker(false);
    }
  }, [commentImages.length]);

  const removeCommentImage = useCallback((index: number) => {
    setCommentImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    if (
      !commentInputFocused
      && keyboardHeight === 0
      && !replyTo
      && commentText.trim().length === 0
      && commentImages.length === 0
      && !showEmojiPicker
      && !showMentionPicker
    ) {
      setComposerExpanded(false);
    }
  }, [commentImages.length, commentInputFocused, commentText, keyboardHeight, replyTo, showEmojiPicker, showMentionPicker]);

  const openCommentActions = (comment: Comment) => {
    setActionMenuComment(comment);
  };

  const closeCommentActions = () => {
    setActionMenuComment(null);
  };

  const canDeleteComment = useCallback((comment: Comment) => {
    return Boolean(isOwner || (user && comment.user.id === user.id));
  }, [isOwner, user]);

  const handleCopyComment = async (comment: Comment) => {
    closeCommentActions();
    const success = await copyToClipboard(comment.content);
    Alert.alert(success ? '已复制' : '复制失败', success ? '评论内容已复制到剪贴板' : '请稍后重试');
  };

  const handleReportComment = (comment: Comment) => {
    closeCommentActions();
    Alert.alert(
      '举报评论',
      `将跳转到意见反馈页，请补充举报原因。\n\n@${comment.user.nickname}：${comment.content.slice(0, 36)}${comment.content.length > 36 ? '...' : ''}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '去反馈',
          onPress: () => router.push('/feedback'),
        },
      ]
    );
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!user || !post) return;
    closeCommentActions();

    Alert.alert(
      '确认删除',
      comment.replies?.length ? '删除后其下的回复也会一并删除，确定继续吗？' : '确定要删除这条评论吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteComment(comment.id, user.id);
              if (result.success) {
                setReplyTo(null);
                await Promise.all([fetchPostDetail(), fetchCommentsOnly()]);
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

  const renderRichContent = (content: string, textVariant: 'body' | 'caption' = 'body', textStyle?: StyleProp<TextStyle>) => {
    const parts = parseContent(content);
    const textParts = parts.filter(part => part.type === 'text');
    const imageParts = parts
      .filter(part => part.type === 'image')
      .map(part => part.value.startsWith('http') ? part.value : `${BASE_URL}${part.value}`);

    return (
      <View style={styles.richContentBlock}>
        {textParts.map((part, index) => (
          <ThemedText
            key={`text-${index}`}
            variant={textVariant}
            color={theme.textPrimary}
            style={textStyle}
          >
            {part.value}
          </ThemedText>
        ))}
        {imageParts.length > 0 ? renderImageGrid(imageParts) : null}
      </View>
    );
  };

  const renderUserAvatar = (
    userInfo: { nickname: string; avatar?: string | null },
    containerStyle?: StyleProp<ViewStyle>,
    textVariant: 'tiny' | 'captionMedium' = 'tiny'
  ) => {
    if (userInfo.avatar) {
      return (
        <View style={[styles.avatar, containerStyle]}>
          <Image source={{ uri: userInfo.avatar }} style={styles.avatarImage} resizeMode="cover" />
        </View>
      );
    }

    return (
      <View style={[styles.avatar, containerStyle]}>
        <ThemedText variant={textVariant} color={theme.buttonPrimaryText}>
          {userInfo.nickname.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
    );
  };

  const flattenReplies = useCallback((replies: Comment[] = []): Comment[] => {
    const flattened: Comment[] = [];

    const visit = (items: Comment[]) => {
      items.forEach((item) => {
        flattened.push(item);
        if (item.replies?.length) {
          visit(item.replies);
        }
      });
    };

    visit(replies);
    return flattened.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, []);

  const renderReplyRow = (comment: Comment, index: number, total: number) => {
    const isHighlighted = highlightedCommentId === comment.id;
    const isPostAuthor = post?.user.id === comment.user.id;

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
          styles.threadReplyRow,
          index > 0 && styles.threadReplyGap,
        ]}
      >
        {renderUserAvatar(comment.user, styles.replyAvatar)}

        <View style={styles.threadReplyBody}>
          <TouchableOpacity
            activeOpacity={0.96}
            onPress={() => handleReply(comment)}
            onLongPress={() => openCommentActions(comment)}
            delayLongPress={260}
            style={[
              styles.threadReplyItem,
              isHighlighted && styles.highlightedReply,
            ]}
          >
            <View style={styles.commentNameRow}>
              <ThemedText variant="smallMedium" color={theme.textMuted}>
                {comment.user.nickname}
              </ThemedText>
              {isPostAuthor && (
                <View style={styles.authorBadge}>
                  <ThemedText variant="captionMedium" color={theme.primary}>作者</ThemedText>
                </View>
              )}
              {comment.reply_to_user && (
                <>
                  <ThemedText variant="small" color={theme.textMuted}>
                    {' '}回复{' '}
                  </ThemedText>
                  <ThemedText variant="smallMedium" color={theme.textMuted}>
                    {comment.reply_to_user.nickname}
                  </ThemedText>
                </>
              )}
            </View>

            {renderRichContent(comment.content, 'body', styles.replyContentText)}
          </TouchableOpacity>

          <View style={styles.commentFooter}>
            <View style={styles.commentMetaLeft}>
              <ThemedText variant="caption" color={theme.textMuted}>
                {formatTime(comment.created_at)}
              </ThemedText>
              <TouchableOpacity onPress={() => handleReply(comment)}>
                <ThemedText variant="captionMedium" color={theme.textMuted}>回复</ThemedText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.replyLikeAction}
              onPress={() => handleLikeComment(comment)}
            >
              <FontAwesome6 name="heart" size={11} color={theme.textMuted} />
              <ThemedText variant="caption" color={theme.textMuted}>
                {comment.like_count > 0 ? comment.like_count : ''}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderComment = (comment: Comment) => {
    const isHighlighted = highlightedCommentId === comment.id;
    const threadedReplies = flattenReplies(comment.replies ?? []);
    const isPostAuthor = post?.user.id === comment.user.id;

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
        ]}
      >
        {renderUserAvatar(comment.user, styles.commentAvatar)}

        <View style={styles.commentBody}>
          <TouchableOpacity
            activeOpacity={0.96}
            onPress={() => handleReply(comment)}
            onLongPress={() => openCommentActions(comment)}
            delayLongPress={260}
            style={[
              styles.commentSurface,
              isHighlighted && styles.highlightedComment,
            ]}
          >
            <View style={styles.commentNameRow}>
              <ThemedText variant="smallMedium" color={theme.textMuted}>
                {comment.user.nickname}
              </ThemedText>
              {isPostAuthor && (
                <View style={styles.authorBadge}>
                  <ThemedText variant="captionMedium" color={theme.primary}>作者</ThemedText>
                </View>
              )}
            </View>
            {renderRichContent(comment.content, 'body', styles.commentContent)}
          </TouchableOpacity>

          <View style={styles.commentFooter}>
            <View style={styles.commentMetaLeft}>
              <ThemedText variant="caption" color={theme.textMuted}>
                {formatTime(comment.created_at)}
              </ThemedText>
              <TouchableOpacity onPress={() => handleReply(comment)}>
                <ThemedText variant="captionMedium" color={theme.textMuted}>回复</ThemedText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.replyLikeAction}
              onPress={() => handleLikeComment(comment)}
            >
              <FontAwesome6 name="heart" size={12} color={theme.textMuted} />
              <ThemedText variant="caption" color={theme.textMuted}>
                {comment.like_count > 0 ? comment.like_count : ''}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {threadedReplies.length > 0 && (
            <View style={styles.repliesContainer}>
              {threadedReplies.map((reply, index) => renderReplyRow(reply, index, threadedReplies.length))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const isComposerExpanded = (
    composerExpanded
    || commentInputFocused
    || keyboardHeight > 0
    || !!replyTo
    || commentText.trim().length > 0
    || commentImages.length > 0
    || showEmojiPicker
    || showMentionPicker
  );
  const hasReplyTarget = !!replyTo;

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isComposerExpanded, showEmojiPicker, showMentionPicker, commentImages.length, hasReplyTarget]);

  const scrollBottomPadding = composerHeight + (keyboardHeight > 0 ? keyboardHeight : 0) + Spacing.xl;

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
        {/* 头部导航 */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="title" color={theme.textPrimary}>帖子详情</ThemedText>
          <View style={{ width: 40 }} />
        </ThemedView>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {/* 帖子内容 */}
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              {renderUserAvatar(post.user, undefined, 'captionMedium')}
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
              评论 ({post.comment_count})
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
        <View
          style={styles.commentInputContainer}
          onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
        >
          {!isComposerExpanded ? (
            <TouchableOpacity
              style={styles.collapsedComposer}
              activeOpacity={0.9}
              onPress={() => {
                if (!isAuthenticated) {
                  router.push('/login');
                  return;
                }
                expandComposer(true);
              }}
            >
              <View style={styles.collapsedComposerField}>
                <FontAwesome6 name="pen" size={14} color={theme.textMuted} />
                <ThemedText variant="body" color={theme.textMuted}>
                  说点什么...
                </ThemedText>
              </View>
              <View style={styles.collapsedComposerActions}>
                <TouchableOpacity
                  style={styles.collapsedActionButton}
                  onPress={() => {
                    if (!isAuthenticated) {
                      router.push('/login');
                      return;
                    }
                    handlePickCommentImages();
                  }}
                >
                  <FontAwesome6 name="image" size={16} color={theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.collapsedActionButton}
                  onPress={() => {
                    if (!isAuthenticated) {
                      router.push('/login');
                      return;
                    }
                    setComposerExpanded(true);
                    Keyboard.dismiss();
                    setShowMentionPicker(false);
                    setShowEmojiPicker(true);
                  }}
                >
                  <FontAwesome6 name="face-smile" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : (
            <>
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
            <View style={styles.commentComposer}>
              <TextInput
                ref={commentInputRef}
                style={styles.input}
                placeholder={isAuthenticated ? (replyTo ? `回复 ${replyTo.user.nickname}...` : "说点什么...") : "登录后发表评论"}
                placeholderTextColor={theme.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                editable={isAuthenticated}
                textAlignVertical="top"
                onFocus={() => {
                  setCommentInputFocused(true);
                  setShowEmojiPicker(false);
                  setShowMentionPicker(false);
                }}
                onBlur={() => {
                  setCommentInputFocused(false);
                }}
              />
              <View style={styles.commentToolsRow}>
                <TouchableOpacity style={styles.commentToolButton} onPress={handlePickCommentImages}>
                  <FontAwesome6 name="image" size={16} color={theme.textMuted} />
                  <ThemedText variant="caption" color={theme.textMuted}>图片</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.commentToolButton}
                  onPress={() => {
                    setComposerExpanded(true);
                    Keyboard.dismiss();
                    setShowMentionPicker(false);
                    setShowEmojiPicker(prev => !prev);
                  }}
                >
                  <FontAwesome6 name="face-smile" size={16} color={showEmojiPicker ? theme.primary : theme.textMuted} />
                  <ThemedText variant="caption" color={showEmojiPicker ? theme.primary : theme.textMuted}>表情</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.commentToolButton}
                  onPress={() => {
                    setComposerExpanded(true);
                    Keyboard.dismiss();
                    setShowEmojiPicker(false);
                    setShowMentionPicker(prev => !prev);
                  }}
                >
                  <FontAwesome6 name="at" size={16} color={showMentionPicker ? theme.primary : theme.textMuted} />
                  <ThemedText variant="caption" color={showMentionPicker ? theme.primary : theme.textMuted}>@某人</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, !commentText.trim() && commentImages.length === 0 && styles.submitButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={(!commentText.trim() && commentImages.length === 0) || submitting || !isAuthenticated}
            >
              <FontAwesome6
                name={submitting || uploadingCommentMedia ? 'spinner' : 'arrow-up'}
                size={16}
                color={commentText.trim() || commentImages.length > 0 ? theme.buttonPrimaryText : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
          {commentImages.length > 0 && (
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.commentImagePreviewRow}
              >
                {commentImages.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.commentImagePreviewItem}>
                    <Image source={{ uri }} style={styles.commentImagePreview} />
                    <TouchableOpacity
                      style={styles.commentImageRemoveButton}
                      onPress={() => removeCommentImage(index)}
                    >
                      <FontAwesome6 name="xmark" size={10} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {showEmojiPicker && (
            <View style={styles.emojiPicker}>
              <View style={styles.emojiGrid}>
                {COMMENT_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiItem}
                    onPress={() => handleInsertEmoji(emoji)}
                  >
                    <ThemedText variant="h4">{emoji}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {showMentionPicker && (
            <View style={styles.mentionPicker}>
              <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.mentionPickerTitle}>
                提到谁
              </ThemedText>
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mentionRow}>
                  {mentionCandidates.map((candidate) => (
                    <TouchableOpacity
                      key={candidate.id}
                      style={styles.mentionChip}
                      onPress={() => handleInsertMention(candidate.nickname)}
                    >
                      {candidate.avatar ? (
                        <Image source={{ uri: candidate.avatar }} style={styles.mentionAvatar} />
                      ) : (
                        <View style={[styles.mentionAvatar, { backgroundColor: theme.primaryLight }]}>
                          <ThemedText variant="captionMedium" color={theme.primary}>
                            {candidate.nickname.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                      )}
                      <ThemedText variant="captionMedium" color={theme.textPrimary}>
                        @{candidate.nickname}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!actionMenuComment}
        transparent
        animationType="fade"
        onRequestClose={closeCommentActions}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.actionSheetOverlay}
          onPress={closeCommentActions}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.actionSheet}
            onPress={() => undefined}
          >
            <View style={styles.actionSheetHandle} />
            {actionMenuComment && (
              <>
                <View style={styles.actionSheetHeader}>
                  <ThemedText variant="smallMedium" color={theme.textPrimary}>
                    @{actionMenuComment.user.nickname}
                  </ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted} numberOfLines={2}>
                    {actionMenuComment.content}
                  </ThemedText>
                </View>

                <TouchableOpacity style={styles.actionSheetItem} onPress={() => handleReply(actionMenuComment)}>
                  <FontAwesome6 name="reply" size={16} color={theme.textPrimary} />
                  <ThemedText variant="body" color={theme.textPrimary}>回复</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionSheetItem} onPress={() => handleCopyComment(actionMenuComment)}>
                  <FontAwesome6 name="copy" size={16} color={theme.textPrimary} />
                  <ThemedText variant="body" color={theme.textPrimary}>复制</ThemedText>
                </TouchableOpacity>

                {(!user || actionMenuComment.user.id !== user.id) && (
                  <TouchableOpacity style={styles.actionSheetItem} onPress={() => handleReportComment(actionMenuComment)}>
                    <FontAwesome6 name="flag" size={16} color={theme.textPrimary} />
                    <ThemedText variant="body" color={theme.textPrimary}>举报</ThemedText>
                  </TouchableOpacity>
                )}

                {canDeleteComment(actionMenuComment) && (
                  <TouchableOpacity
                    style={[styles.actionSheetItem, styles.actionSheetItemDanger]}
                    onPress={() => handleDeleteComment(actionMenuComment)}
                  >
                    <FontAwesome6 name="trash" size={16} color={theme.error} />
                    <ThemedText variant="body" color={theme.error}>删除</ThemedText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionSheetCancel} onPress={closeCommentActions}>
                  <ThemedText variant="bodyMedium" color={theme.textPrimary}>取消</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

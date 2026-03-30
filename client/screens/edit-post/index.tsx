import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getPost, updatePost, Post } from '@/utils/community';

type Category = 'discussion' | 'question' | 'sharing' | 'notice';

const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: 'discussion', label: '讨论', icon: 'comments' },
  { value: 'question', label: '提问', icon: 'circle-question' },
  { value: 'sharing', label: '分享', icon: 'share-nodes' },
  { value: 'notice', label: '公告', icon: 'megaphone' },
];

export default function EditPostScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated } = useAuth();
  const params = useSafeSearchParams<{ id: number }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('discussion');
  const [originalPost, setOriginalPost] = useState<Post | null>(null);

  const postId = params.id;

  const fetchPost = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const result = await getPost(postId);
      if (result.success) {
        const post = result.data;
        setOriginalPost(post);
        setTitle(post.title);
        setContent(post.content);
        setCategory(post.category);
      }
    } catch (error) {
      console.error('获取帖子失败:', error);
      Alert.alert('错误', '获取帖子失败');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleSubmit = async () => {
    if (!isAuthenticated || !user || !originalPost) {
      router.push('/login');
      return;
    }

    if (!title.trim()) {
      Alert.alert('提示', '请输入标题');
      return;
    }

    if (title.length > 200) {
      Alert.alert('提示', '标题不能超过200个字符');
      return;
    }

    if (!content.trim()) {
      Alert.alert('提示', '请输入内容');
      return;
    }

    try {
      setSubmitting(true);

      const result = await updatePost(originalPost.id, {
        title: title.trim(),
        content: content.trim(),
        category,
        userId: user.id,
      });

      if (result.success) {
        Alert.alert('成功', '帖子更新成功', [
          { text: '确定', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('错误', '更新失败，请重试');
      }
    } catch (error) {
      console.error('更新帖子失败:', error);
      Alert.alert('错误', '更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* 头部导航 */}
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="title" color={theme.textPrimary}>编辑帖子</ThemedText>
        <TouchableOpacity
          style={[styles.publishButton, (!title.trim() || !content.trim() || submitting) && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={!title.trim() || !content.trim() || submitting}
        >
          <ThemedText
            variant="smallMedium"
            color={title.trim() && content.trim() && !submitting ? theme.buttonPrimaryText : theme.textMuted}
          >
            {submitting ? '保存中...' : '保存'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 分类选择 */}
        <View style={styles.categorySection}>
          <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.label}>
            选择分类
          </ThemedText>
          <View style={styles.categoryOptions}>
            {CATEGORY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.categoryOption,
                  category === option.value && styles.categoryOptionActive,
                ]}
                onPress={() => setCategory(option.value)}
              >
                <FontAwesome6
                  name={option.icon}
                  size={16}
                  color={category === option.value ? theme.buttonPrimaryText : theme.textSecondary}
                />
                <ThemedText
                  variant="small"
                  color={category === option.value ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 标题输入 */}
        <View style={styles.inputSection}>
          <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.label}>
            标题
          </ThemedText>
          <TextInput
            style={styles.titleInput}
            placeholder="请输入标题（最多200字）"
            placeholderTextColor={theme.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <ThemedText variant="caption" color={theme.textMuted} style={styles.charCount}>
            {title.length}/200
          </ThemedText>
        </View>

        {/* 内容输入 */}
        <View style={styles.inputSection}>
          <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.label}>
            内容
          </ThemedText>
          <TextInput
            style={styles.contentInput}
            placeholder="分享你的见解、提出你的问题..."
            placeholderTextColor={theme.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

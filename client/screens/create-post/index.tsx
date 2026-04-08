import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { createPost } from '@/utils/community';

type Category = 'discussion' | 'question' | 'sharing' | 'notice';

const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: 'discussion', label: '讨论', icon: 'comments' },
  { value: 'question', label: '提问', icon: 'circle-question' },
  { value: 'sharing', label: '分享', icon: 'share-nodes' },
  { value: 'notice', label: '公告', icon: 'megaphone' },
];

export default function CreatePostScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('discussion');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
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

      /**
       * 服务端文件：server/src/routes/posts.ts
       * 接口：POST /api/v1/posts
       * Body 参数：title: string, content: string, category?: string, userId: number
       */
      const result = await createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        userId: user.id,
      });

      if (result.success) {
        Alert.alert('成功', '帖子发布成功', [
          { text: '确定', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('错误', '发布失败，请重试');
      }
    } catch (error) {
      console.error('发布帖子失败:', error);
      Alert.alert('错误', '发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* 头部导航 */}
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="title" color={theme.textPrimary}>发布帖子</ThemedText>
        <TouchableOpacity
          style={[styles.publishButton, (!title.trim() || !content.trim() || submitting) && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={!title.trim() || !content.trim() || submitting}
        >
          <ThemedText
            variant="smallMedium"
            color={title.trim() && content.trim() && !submitting ? theme.buttonPrimaryText : theme.textMuted}
          >
            {submitting ? '发布中...' : '发布'}
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

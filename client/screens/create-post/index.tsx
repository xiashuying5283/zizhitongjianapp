import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { createPost, uploadImage } from '@/utils/community';

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
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const remainingSlots = 9 - images.length;
    if (remainingSlots <= 0) {
      Alert.alert('提示', '最多上传9张图片');
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
      setImages(prev => [...prev, ...newUris].slice(0, 9));
    }
  };

  const takePhoto = async () => {
    if (images.length >= 9) {
      Alert.alert('提示', '最多上传9张图片');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相机权限才能拍照');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

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

    if (!content.trim() && images.length === 0) {
      Alert.alert('提示', '请输入内容或添加图片');
      return;
    }

    try {
      setSubmitting(true);
      setUploading(true);

      // 上传图片
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const result = await uploadImage(uri, user.id);
        if (result.success && result.data?.url) {
          uploadedUrls.push(result.data.url);
        }
      }

      setUploading(false);

      // 构建内容（包含图片标记）
      let finalContent = content.trim();
      if (uploadedUrls.length > 0) {
        const imageMarkdown = uploadedUrls.map(url => `[img]${url}[/img]`).join('\n');
        finalContent = finalContent ? `${finalContent}\n\n${imageMarkdown}` : imageMarkdown;
      }

      const result = await createPost({
        title: title.trim(),
        content: finalContent,
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
      setUploading(false);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
      {/* 头部导航 */}
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="title" color={theme.textPrimary}>发布帖子</ThemedText>
        <TouchableOpacity
          style={[styles.publishButton, (!title.trim() || (!content.trim() && images.length === 0) || submitting) && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={!title.trim() || (!content.trim() && images.length === 0) || submitting}
        >
          <ThemedText
            variant="smallMedium"
            color={title.trim() && (content.trim() || images.length > 0) && !submitting ? theme.buttonPrimaryText : theme.textMuted}
          >
            {uploading ? '上传中...' : submitting ? '发布中...' : '发布'}
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

        {/* 图片区域 */}
        <View style={styles.inputSection}>
          <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.label}>
            图片（最多9张）
          </ThemedText>
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <FontAwesome6 name="xmark" size={12} color={theme.buttonPrimaryText} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <FontAwesome6 name="image" size={16} color={theme.textSecondary} />
              <ThemedText variant="small" color={theme.textSecondary}>相册</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <FontAwesome6 name="camera" size={16} color={theme.textSecondary} />
              <ThemedText variant="small" color={theme.textSecondary}>拍照</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

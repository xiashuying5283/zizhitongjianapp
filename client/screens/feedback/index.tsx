import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getDeviceId } from '@/utils/deviceId';

interface FeedbackType {
  id: string;
  name: string;
  icon: string;
  placeholder: string;
}

export default function FeedbackScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const [selectedType, setSelectedType] = useState<string>('suggestion');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const feedbackTypes: FeedbackType[] = [
    { id: 'bug', name: '问题反馈', icon: 'bug', placeholder: '请描述您遇到的问题...' },
    { id: 'suggestion', name: '功能建议', icon: 'lightbulb', placeholder: '请描述您的建议...' },
    { id: 'content', name: '内容纠错', icon: 'file-pen', placeholder: '请描述需要纠错的内容...' },
    { id: 'other', name: '其他', icon: 'message', placeholder: '请描述您的反馈...' },
  ];

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入反馈内容');
      return;
    }

    setSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      
      /**
       * 服务端文件：server/src/routes/feedback.ts
       * 接口：POST /api/v1/feedback
       * Body 参数：type: string, content: string, contact?: string, deviceId: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          content: content.trim(),
          contact: contact.trim() || undefined,
          deviceId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('提交成功', '感谢您的反馈，我们会认真处理', [
          { text: '确定', onPress: () => router.back() }
        ]);
        setContent('');
        setContact('');
      } else {
        Alert.alert('提交失败', result.message || '请稍后重试');
      }
    } catch (error) {
      console.error('Submit feedback error:', error);
      Alert.alert('提交失败', '网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const currentType = feedbackTypes.find(t => t.id === selectedType);

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>意见反馈</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Feedback Types */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            反馈类型
          </ThemedText>
          <View style={styles.typeGrid}>
            {feedbackTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeItem,
                  selectedType === type.id && styles.typeItemSelected,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View style={[
                  styles.typeIcon,
                  { backgroundColor: selectedType === type.id ? theme.primary + '20' : theme.backgroundTertiary }
                ]}>
                  <FontAwesome6
                    name={type.icon as any}
                    size={20}
                    color={selectedType === type.id ? theme.primary : theme.textSecondary}
                  />
                </View>
                <ThemedText
                  variant="smallMedium"
                  color={selectedType === type.id ? theme.primary : theme.textPrimary}
                >
                  {type.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* Content Input */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            反馈内容
          </ThemedText>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.contentInput}
              placeholder={currentType?.placeholder || '请输入反馈内容'}
              placeholderTextColor={theme.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <View style={styles.charCount}>
              <ThemedText variant="caption" color={theme.textMuted}>
                {content.length}/500
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Contact Input */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            联系方式
            <ThemedText variant="caption" color={theme.textMuted}>（选填）</ThemedText>
          </ThemedText>
          <View style={styles.contactInputContainer}>
            <FontAwesome6 name="envelope" size={16} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.contactInput}
              placeholder="邮箱或微信，便于我们回复您"
              placeholderTextColor={theme.textMuted}
              value={contact}
              onChangeText={setContact}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.contactHint}>
            留下联系方式，我们可能会回复您的反馈
          </ThemedText>
        </ThemedView>

        {/* Tips */}
        <ThemedView level="root" style={styles.section}>
          <View style={styles.tipsHeader}>
            <FontAwesome6 name="circle-info" size={16} color={theme.primary} />
            <ThemedText variant="smallMedium" color={theme.textPrimary}>反馈须知</ThemedText>
          </View>
          <View style={styles.tipsContent}>
            <ThemedText variant="caption" color={theme.textSecondary}>
              • 请详细描述您遇到的问题或建议{'\n'}
              • 如有问题反馈，建议附上截图{'\n'}
              • 我们会在3个工作日内处理您的反馈{'\n'}
              • 优质反馈可能会获得会员奖励
            </ThemedText>
          </View>
        </ThemedView>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!content.trim() || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText variant="body" color={theme.buttonPrimaryText}>提交反馈</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

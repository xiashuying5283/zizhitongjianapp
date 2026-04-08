import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
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
import { updateProfile } from '@/utils/auth';
import { createFormDataFile } from '@/utils';

export default function EditProfileScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, setUser } = useAuth();
  
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePickImage = useCallback(async () => {
    try {
      // 请求相册权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能选择头像');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedAsset = result.assets[0];
        await uploadAvatar(selectedAsset.uri);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('错误', '选择图片失败');
    }
  }, []);

  const uploadAvatar = async (uri: string) => {
    if (!user) return;
    
    setUploading(true);
    try {
      // 使用 createFormDataFile 创建跨平台兼容的文件对象
      const file = await createFormDataFile(uri, 'avatar.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', file as any);
      formData.append('userId', String(user.id));

      /**
       * 服务端文件：server/src/routes/upload.ts
       * 接口：POST /api/v1/upload/avatar
       * Body 参数：file (FormData), userId: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/upload/avatar`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success && result.data?.url) {
        setAvatar(result.data.url);
        Alert.alert('成功', '头像上传成功');
      } else {
        // 如果后端上传失败，使用本地 URI 作为临时方案
        setAvatar(uri);
        Alert.alert('提示', '头像已设置，保存后生效');
      }
    } catch (error) {
      console.error('Upload avatar error:', error);
      // 降级方案：使用本地 URI
      setAvatar(uri);
      Alert.alert('提示', '头像已设置，保存后生效');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('提示', '请先登录');
      return;
    }

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      Alert.alert('提示', '昵称不能为空');
      return;
    }

    if (trimmedNickname.length > 50) {
      Alert.alert('提示', '昵称不能超过50个字符');
      return;
    }

    setSaving(true);
    try {
      const result = await updateProfile(user.id, {
        nickname: trimmedNickname,
        avatar: avatar || undefined,
      });

      if (result.success && result.user) {
        setUser(result.user);
        Alert.alert('成功', '个人资料已更新', [
          { text: '确定', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('保存失败', result.message || '请稍后重试');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('保存失败', '网络错误，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>编辑资料</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <ThemedView level="root" style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {avatar ? (
              <Image 
                source={{ uri: avatar }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <FontAwesome6 name="user" size={40} color={theme.primary} />
              </View>
            )}
            {uploading ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : (
              <View style={styles.cameraIcon}>
                <FontAwesome6 name="camera" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
            <ThemedText variant="smallMedium" color={theme.primary} style={styles.changeAvatarText}>
              {uploading ? '上传中...' : '更换头像'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Nickname Section */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            基本信息
          </ThemedText>
          
          <View style={styles.fieldItem}>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.fieldLabel}>
              昵称
            </ThemedText>
            <TextInput
              style={styles.fieldInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder="请输入昵称"
              placeholderTextColor={theme.textMuted}
              maxLength={50}
            />
          </View>

          <View style={styles.fieldItem}>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.fieldLabel}>
              用户名
            </ThemedText>
            <ThemedText variant="body" color={theme.textMuted}>
              @{user?.username}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.fieldHint}>
              用户名不可修改
            </ThemedText>
          </View>
        </ThemedView>

        {/* Tips */}
        <ThemedView level="root" style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <FontAwesome6 name="circle-info" size={16} color={theme.primary} />
            <ThemedText variant="smallMedium" color={theme.textPrimary}>提示</ThemedText>
          </View>
          <ThemedText variant="caption" color={theme.textSecondary} style={styles.tipsText}>
            • 昵称将在评论和批注中显示{'\n'}
            • 建议使用真实头像增加辨识度{'\n'}
            • 头像会自动裁剪为正方形
          </ThemedText>
        </ThemedView>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (saving || uploading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText variant="body" color={theme.buttonPrimaryText}>保存修改</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

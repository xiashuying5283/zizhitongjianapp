import React, { useState, useMemo } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { login, register } from '@/utils/auth';
import { createStyles } from './styles';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { setUser } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    if (!password) {
      setError('请输入密码');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('密码至少6个字符');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次密码不一致');
        return;
      }
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(username.trim(), password);
      } else {
        result = await register(username.trim(), password, nickname.trim() || undefined);
      }

      if (result.success && result.user) {
        setUser(result.user);
        router.replace('/');
      } else {
        setError(result.message || '操作失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
  };

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <FontAwesome6 name="book-open" size={48} color={theme.primary} />
            <ThemedText variant="h1" color={theme.textPrimary} style={styles.title}>
              资治通鉴
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
              {mode === 'login' ? '登录以同步阅读进度' : '创建账号开始阅读'}
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.label}>
                用户名
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="请输入用户名"
                placeholderTextColor={theme.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.label}>
                  昵称（选填）
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="显示名称"
                  placeholderTextColor={theme.textMuted}
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.label}>
                密码
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="请输入密码"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.label}>
                  确认密码
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="再次输入密码"
                  placeholderTextColor={theme.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            )}

            {/* Error */}
            {error ? (
              <ThemedText variant="small" color={theme.error || '#DC2626'} style={styles.errorText}>
                {error}
              </ThemedText>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
              </ThemedText>
            </TouchableOpacity>

            {/* Switch Mode */}
            <View style={styles.switchMode}>
              <ThemedText variant="small" color={theme.textSecondary}>
                {mode === 'login' ? '还没有账号？' : '已有账号？'}
              </ThemedText>
              <TouchableOpacity onPress={switchMode}>
                <ThemedText variant="smallMedium" color={theme.primary}>
                  {mode === 'login' ? '立即注册' : '去登录'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

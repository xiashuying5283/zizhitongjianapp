import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';
import { getUserIdentity } from '@/utils/userIdentity';

interface StatsSummary {
  totalDuration: number;
  totalCharacters: number;
  totalDays: number;
  currentStreak: number;
  weekDuration: number;
  monthDuration: number;
  formattedDuration: string;
}

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export default function ProfileScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);

  // 获取阅读统计
  const fetchStatsSummary = useCallback(async () => {
    try {
      const identity = await getUserIdentity();
      const params = new URLSearchParams();
      if (identity.userId) {
        params.append('userId', String(identity.userId));
      } else if (identity.deviceId) {
        params.append('deviceId', identity.deviceId);
      }

      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/reading-stats/summary?${params.toString()}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setStatsSummary(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats summary:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatsSummary();
    }, [fetchStatsSummary])
  );

  const handleLogout = useCallback(() => {
    Alert.alert(
      '确认登出',
      '登出后阅读进度将使用设备ID保存，登录后可同步到账号',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认登出',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
            setLoggingOut(false);
          },
        },
      ]
    );
  }, [logout]);

  const handleLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  const handleEditProfile = useCallback(() => {
    if (isAuthenticated) {
      router.push('/edit-profile');
    } else {
      handleLogin();
    }
  }, [isAuthenticated, router, handleLogin]);

  const handleVolumePress = useCallback(() => {
    router.push('/(tabs)');
  }, [router]);

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity style={styles.userInfo} onPress={handleEditProfile} activeOpacity={0.7}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                  <FontAwesome6 name="user" size={24} color={theme.primary} />
                </View>
              )}
            </View>
            <View style={styles.userDetails}>
              {isAuthenticated && user ? (
                <>
                  <View style={styles.nameRow}>
                    <ThemedText variant="h3" color={theme.textPrimary}>{user.nickname || user.username}</ThemedText>
                    <FontAwesome6 name="pen" size={12} color={theme.textMuted} style={styles.editIcon} />
                  </View>
                  <ThemedText variant="caption" color={theme.textMuted}>@{user.username}</ThemedText>
                </>
              ) : (
                <>
                  <ThemedText variant="h3" color={theme.textPrimary}>游客模式</ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted}>点击登录以同步阅读进度</ThemedText>
                </>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authButton, isAuthenticated && styles.logoutButton]}
            onPress={isAuthenticated ? handleLogout : handleLogin}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={theme.textPrimary} />
            ) : (
              <ThemedText variant="smallMedium" color={isAuthenticated ? theme.error : theme.primary}>
                {isAuthenticated ? '登出' : '登录'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>

        {/* Reading Stats */}
        {statsSummary && (statsSummary.totalDuration > 0 || statsSummary.currentStreak > 0) && (
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => router.push('/reading-stats')}
            activeOpacity={0.7}
          >
            <View style={styles.statsItem}>
              <ThemedText variant="h4" color={theme.primary}>
                {statsSummary.formattedDuration}
              </ThemedText>
              <ThemedText variant="tiny" color={theme.textMuted}>累计阅读</ThemedText>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsItem}>
              <ThemedText variant="h4" color={theme.warning}>
                {statsSummary.currentStreak}天
              </ThemedText>
              <ThemedText variant="tiny" color={theme.textMuted}>连续阅读</ThemedText>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsItem}>
              <ThemedText variant="h4" color={theme.accent}>
                {statsSummary.totalDays}天
              </ThemedText>
              <ThemedText variant="tiny" color={theme.textMuted}>总天数</ThemedText>
            </View>
          </TouchableOpacity>
        )}

        {/* VIP Section */}
        <TouchableOpacity style={styles.vipCard} onPress={() => router.push('/vip')}>
          <View style={styles.vipContent}>
            <View style={styles.vipIconContainer}>
              <FontAwesome6 name="crown" size={24} color={theme.gold} />
            </View>
            <View style={styles.vipText}>
              <ThemedText variant="h4" color={theme.textPrimary}>会员功能</ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>权益筹备中，可先查看规划内容</ThemedText>
            </View>
          </View>
          <FontAwesome6 name="chevron-right" size={16} color={theme.gold} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            快捷入口
          </ThemedText>
          
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionItem} onPress={handleVolumePress}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + '15' }]}>
                <FontAwesome6 name="book" size={20} color={theme.primary} />
              </View>
              <ThemedText variant="smallMedium" color={theme.textPrimary}>全部卷目</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>回到阅读目录</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/bookmarks')}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.accentSoft }]}>
                <FontAwesome6 name="bookmark" size={20} color={theme.accent} />
              </View>
              <ThemedText variant="smallMedium" color={theme.textPrimary}>我的书签</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>保存的位置</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/notes')}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.goldSoft }]}>
                <FontAwesome6 name="highlighter" size={20} color={theme.warning} />
              </View>
              <ThemedText variant="smallMedium" color={theme.textPrimary}>我的笔记</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>划线与批注</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/reading-stats')}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.infoSoft }]}>
                <FontAwesome6 name="chart-line" size={20} color={theme.info} />
              </View>
              <ThemedText variant="smallMedium" color={theme.textPrimary}>阅读统计</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>时长与连续天数</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Settings */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            设置
          </ThemedText>

          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/settings')}>
            <View style={styles.settingInfo}>
              <FontAwesome6 name="gear" size={20} color={theme.textPrimary} />
              <ThemedText variant="body" color={theme.textPrimary}>阅读与显示设置</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/about')}>
            <View style={styles.settingInfo}>
              <FontAwesome6 name="circle-info" size={20} color={theme.textPrimary} />
              <ThemedText variant="body" color={theme.textPrimary}>关于资治通鉴</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </ThemedView>

        {/* Help & Support */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            帮助与支持
          </ThemedText>

          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/feedback')}>
            <View style={styles.settingInfo}>
              <FontAwesome6 name="comment-dots" size={20} color={theme.textPrimary} />
              <ThemedText variant="body" color={theme.textPrimary}>意见反馈</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/contact')}>
            <View style={styles.settingInfo}>
              <FontAwesome6 name="address-book" size={20} color={theme.textPrimary} />
              <ThemedText variant="body" color={theme.textPrimary}>联系作者</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </ThemedView>

        {/* App Info */}
        <View style={styles.appInfo}>
          <ThemedText variant="caption" color={theme.textMuted}>
            资治通鉴阅读 v1.0.0
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

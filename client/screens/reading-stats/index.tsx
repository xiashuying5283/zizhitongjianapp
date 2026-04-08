import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getDeviceId } from '@/utils/deviceId';

interface StatsSummary {
  totalDuration: number;
  totalCharacters: number;
  totalDays: number;
  currentStreak: number;
  weekDuration: number;
  monthDuration: number;
  formattedDuration: string;
}

interface DailyStats {
  date: string;
  duration: number;
  characters: number;
  paragraphs: number;
  formattedDuration: string;
}

interface Achievement {
  id: number;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

const screenWidth = Dimensions.get('window').width;

export default function ReadingStatsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();

      // 并行获取数据
      const [summaryRes, dailyRes, achievementsRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/reading-stats/summary?deviceId=${deviceId}`),
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/reading-stats/daily?deviceId=${deviceId}&days=30`),
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/reading-stats/achievements?deviceId=${deviceId}`),
      ]);

      if (summaryRes.ok) {
        const result = await summaryRes.json();
        if (result.success) {
          setSummary(result.data);
        }
      }

      if (dailyRes.ok) {
        const result = await dailyRes.json();
        if (result.success) {
          setDailyStats(result.data || []);
        }
      }

      if (achievementsRes.ok) {
        const result = await achievementsRes.json();
        if (result.success) {
          setAchievements(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // 计算成就统计
  const achievementStats = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.unlocked).length;
    return { total, unlocked };
  }, [achievements]);

  // 获取图标名称
  const getIconName = (iconName: string): keyof typeof FontAwesome6.glyphMap => {
    const iconMap: Record<string, keyof typeof FontAwesome6.glyphMap> = {
      'clock': 'clock',
      'book': 'book',
      'flame': 'fire-flame-curved',
      'text': 'font',
    };
    return iconMap[iconName] || 'star';
  };

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary}>阅读统计</ThemedText>
          <View style={styles.headerRight} />
        </ThemedView>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.primary + '15' }]}>
            <FontAwesome6 name="clock" size={24} color={theme.primary} />
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.summaryValue}>
              {summary?.formattedDuration || '0分钟'}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>累计阅读时长</ThemedText>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#10B98115' }]}>
            <FontAwesome6 name="fire-flame-curved" size={24} color="#10B981" />
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.summaryValue}>
              {summary?.currentStreak || 0}天
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>连续阅读</ThemedText>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#F59E0B15' }]}>
            <FontAwesome6 name="calendar-day" size={24} color="#F59E0B" />
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.summaryValue}>
              {summary?.totalDays || 0}天
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>总阅读天数</ThemedText>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#8B5CF615' }]}>
            <FontAwesome6 name="font" size={24} color="#8B5CF6" />
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.summaryValue}>
              {summary?.totalCharacters ? `${Math.round(summary.totalCharacters / 1000)}k` : '0'}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>累计字数</ThemedText>
          </View>
        </View>

        {/* Time Period Stats */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            时段统计
          </ThemedText>
          <View style={styles.periodRow}>
            <View style={styles.periodItem}>
              <ThemedText variant="bodyMedium" color={theme.textPrimary}>本周</ThemedText>
              <ThemedText variant="h4" color={theme.primary}>
                {Math.floor((summary?.weekDuration || 0) / 60)}分钟
              </ThemedText>
            </View>
            <View style={styles.periodDivider} />
            <View style={styles.periodItem}>
              <ThemedText variant="bodyMedium" color={theme.textPrimary}>本月</ThemedText>
              <ThemedText variant="h4" color={theme.primary}>
                {Math.floor((summary?.monthDuration || 0) / 60)}分钟
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Achievements */}
        <ThemedView level="root" style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="h4" color={theme.textPrimary}>成就系统</ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              {achievementStats.unlocked}/{achievementStats.total} 已解锁
            </ThemedText>
          </View>

          <View style={styles.achievementsGrid}>
            {achievements.map(achievement => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementCardLocked,
                ]}
              >
                <View style={[
                  styles.achievementIcon,
                  { backgroundColor: achievement.unlocked ? theme.primary + '20' : theme.backgroundTertiary },
                ]}>
                  <FontAwesome6
                    name={getIconName(achievement.icon)}
                    size={20}
                    color={achievement.unlocked ? theme.primary : theme.textMuted}
                  />
                </View>
                <ThemedText
                  variant="smallMedium"
                  color={achievement.unlocked ? theme.textPrimary : theme.textMuted}
                  style={styles.achievementTitle}
                >
                  {achievement.title}
                </ThemedText>
                <ThemedText variant="tiny" color={theme.textMuted} style={styles.achievementDesc}>
                  {achievement.description}
                </ThemedText>
                {achievement.unlocked && (
                  <FontAwesome6 name="circle-check" size={14} color={theme.success} style={styles.unlockedIcon} />
                )}
              </View>
            ))}
          </View>
        </ThemedView>

        {/* Recent Daily Stats */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            近期阅读
          </ThemedText>

          {dailyStats.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome6 name="chart-line" size={32} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.md }}>
                暂无阅读记录
              </ThemedText>
            </View>
          ) : (
            dailyStats.slice(0, 10).map((stat, index) => (
              <View key={stat.date || index} style={styles.dailyItem}>
                <View style={styles.dailyDate}>
                  <ThemedText variant="smallMedium" color={theme.textPrimary}>
                    {new Date(stat.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </ThemedText>
                </View>
                <View style={styles.dailyStats}>
                  <View style={styles.dailyStat}>
                    <FontAwesome6 name="clock" size={12} color={theme.textMuted} />
                    <ThemedText variant="small" color={theme.textSecondary}>
                      {stat.formattedDuration}
                    </ThemedText>
                  </View>
                  <View style={styles.dailyStat}>
                    <FontAwesome6 name="font" size={12} color={theme.textMuted} />
                    <ThemedText variant="small" color={theme.textSecondary}>
                      {stat.characters}字
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          )}
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

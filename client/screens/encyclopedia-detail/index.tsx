import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type EntityType = 'character' | 'title';

interface Character {
  id: number;
  name: string;
  displayName: string;
  dynasty: string;
  title: string;
  description: string;
  aliases: string[];
  birthYear: number | null;
  deathYear: number | null;
}

interface Title {
  id: number;
  name: string;
  displayName: string;
  description: string;
  dynasty: string;
  aliases: string[];
}

export default function EncyclopediaDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useSafeRouter();
  const { type, name } = useSafeSearchParams<{ type: EntityType; name: string }>();

  const [data, setData] = useState<Character | Title | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [type, name]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!type || !name) {
        throw new Error('参数错误');
      }

      const endpoint = type === 'character' ? 'characters' : 'titles';
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/${endpoint}/${encodeURIComponent(name)}`
      );

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: 16 }}>
            加载中...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.centerContainer}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            {error || '未找到相关内容'}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  const isCharacter = type === 'character';
  const charData = isCharacter ? (data as Character) : null;

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 标题 */}
        <ThemedView level="default" style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary}>
            {data.displayName || data.name}
          </ThemedText>
          
          {isCharacter && charData?.dynasty && (
            <ThemedText variant="caption" color={theme.textMuted} style={styles.dynastyBadge}>
              {charData.dynasty}
            </ThemedText>
          )}
        </ThemedView>

        {/* 基本信息 */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="labelSmall" color={theme.textMuted} style={styles.sectionTitle}>
            基本信息
          </ThemedText>
          
          {isCharacter && charData && (
            <View style={styles.infoRow}>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.infoLabel}>
                官职：
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {charData.title || '无'}
              </ThemedText>
            </View>
          )}

          {isCharacter && charData && (charData.birthYear || charData.deathYear) && (
            <View style={styles.infoRow}>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.infoLabel}>
                生卒年：
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {charData.birthYear ? `公元前${Math.abs(charData.birthYear)}年` : '?'} - 
                {charData.deathYear ? `公元前${Math.abs(charData.deathYear)}年` : '?'}
              </ThemedText>
            </View>
          )}

          {data.aliases && data.aliases.length > 0 && (
            <View style={styles.infoRow}>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.infoLabel}>
                别名：
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {data.aliases.join('、')}
              </ThemedText>
            </View>
          )}

          {data.dynasty && (
            <View style={styles.infoRow}>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.infoLabel}>
                朝代：
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {data.dynasty}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 详细描述 */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="labelSmall" color={theme.textMuted} style={styles.sectionTitle}>
            详细介绍
          </ThemedText>
          <ThemedText variant="body" color={theme.textPrimary} style={styles.description}>
            {data.description}
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

import { apiFetch } from '@/utils/apiFetch';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type TabKey = 'emperors';

interface EmperorGroup {
  emperor: string;
  dynasty: string;
  year_start: number;
  year_end: number;
  volumes: Array<{
    id: number;
    volume_number: number;
    era_name: string;
    year_start: number;
    year_end: number;
  }>;
}

export default function BrowseScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [activeTab, setActiveTab] = useState<TabKey>('emperors');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emperors, setEmperors] = useState<EmperorGroup[]>([]);

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 获取帝王数据
      const emperorsRes = await apiFetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/volumes/emperor-groups`);
      const emperorsData = await emperorsRes.json();
      if (emperorsData.success) {
        setEmperors(emperorsData.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleVolumePress = (volumeNumber: number) => {
    router.push('/volume-detail', { id: volumeNumber });
  };

  // 渲染按帝王浏览
  const renderEmperors = () => {
    if (emperors.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedText variant="body" color={theme.textMuted}>暂无帝王数据</ThemedText>
        </View>
      );
    }

    return emperors.map((group, index) => (
      <View key={index} style={styles.emperorSection}>
        <View style={styles.emperorHeader}>
          <View style={styles.emperorIcon}>
            <FontAwesome6 name="crown" size={18} color={theme.primary} />
          </View>
          <View style={styles.emperorInfo}>
            <ThemedText variant="bodyMedium" style={styles.emperorName}>
              {group.emperor}
            </ThemedText>
            <View style={styles.emperorMeta}>
              <ThemedText variant="small" style={styles.emperorYear}>
                {group.year_start > group.year_end 
                  ? `公元前${group.year_end}-${group.year_start}年`
                  : `公元${group.year_start}-${group.year_end}年`}
              </ThemedText>
              <ThemedText variant="small" style={styles.volumeCount}>
                {group.volumes.length}卷
              </ThemedText>
            </View>
          </View>
        </View>
        
        <View style={styles.volumeList}>
          {group.volumes.map((volume) => (
            <TouchableOpacity
              key={volume.id}
              style={styles.volumeItem}
              onPress={() => handleVolumePress(volume.volume_number)}
            >
              <ThemedText variant="small" style={styles.volumeNumber}>
                卷{volume.volume_number}
              </ThemedText>
              <ThemedText variant="body" style={styles.volumeName}>
                {volume.era_name}
              </ThemedText>
              <ThemedText variant="small" style={styles.volumeYear}>
                {volume.year_start > volume.year_end
                  ? `BC${volume.year_end}`
                  : `AD${volume.year_start}`}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ));
  };

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="body" style={styles.loadingText}>加载中...</ThemedText>
        </View>
      );
    }

    return renderEmperors();
  };

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.title}>
            浏览资治通鉴
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            选择不同的方式探索历史长河
          </ThemedText>
        </ThemedView>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'emperors' && styles.activeTab]}
            onPress={() => setActiveTab('emperors')}
          >
            <ThemedText
              variant="smallMedium"
              style={activeTab === 'emperors' ? styles.activeTabText : styles.inactiveTabText}
            >
              按帝王
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {renderContent()}
      </ScrollView>
    </Screen>
  );
}

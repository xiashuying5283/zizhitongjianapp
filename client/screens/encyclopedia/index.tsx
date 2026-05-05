import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createStyles } from './styles';

interface CategoryItem {
  id: string;
  title: string;
  description: string;
  stamp: string;
  icon: string;
  color: string;
  route?: string;
  count?: number;
  statusLabel?: string;
  disabled?: boolean;
}

export default function EncyclopediaScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({ characters: 0, titles: 87, geography: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const charRes = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/characters?limit=1`);
        const charData = await charRes.json();
        const titlesRes = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/titles?limit=1`);
        const titlesData = await titlesRes.json();
        const geoRes = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/geography?limit=1`);
        const geoData = await geoRes.json();
        setStats({
          characters: charData.data?.total || 0,
          titles: titlesData.data?.total || 0,
          geography: geoData.data?.total || 0,
        });
      } catch (e) {
        console.error('获取统计数据失败', e);
      }
    };
    fetchStats();
  }, []);

  const knowledgeCategories: CategoryItem[] = [
    {
      id: 'characters',
      title: '人物',
      description: '历史人物与关系图谱',
      stamp: '人',
      icon: 'users',
      color: theme.primary,
      route: '/characters',
      count: stats.characters,
    },
    {
      id: 'titles',
      title: '官职',
      description: '历代官职与品级制度',
      stamp: '职',
      icon: 'scroll',
      color: theme.accent,
      route: '/titles',
      count: stats.titles,
    },
    {
      id: 'geography',
      title: '地理数据',
      description: '州郡山川关隘宫殿',
      stamp: '地',
      icon: 'mountain-sun',
      color: theme.info,
      route: '/geography',
      count: stats.geography,
    },
    {
      id: 'quotes',
      title: '典著名句',
      description: '资治通鉴经典语录',
      stamp: '句',
      icon: 'quote-left',
      color: theme.success,
      route: '/quotes',
    },
    {
      id: 'era-names',
      title: '年号对照',
      description: '帝王年号与纪年转换',
      stamp: '年',
      icon: 'calendar-days',
      color: theme.warning,
      route: '/era-names',
    },
    {
      id: 'institutions',
      title: '典章制度',
      description: '礼制、兵制、赋税与政务制度整理中',
      stamp: '制',
      icon: 'landmark',
      color: theme.gold,
      statusLabel: '待整理',
      disabled: true,
    },
  ];

  const chatEntries: CategoryItem[] = [
    {
      id: 'group-chat',
      title: '历史群聊',
      description: '与历史人物对话',
      stamp: '聊',
      icon: 'message',
      color: theme.primary,
      route: '/group-chat',
    },
    {
      id: 'chat-rooms',
      title: '我的群聊',
      description: '查看历史群聊记录',
      stamp: '录',
      icon: 'comments',
      color: theme.accent,
      route: '/chat-rooms',
    },
  ];

  const mapEntries = [
    {
      id: 'geography',
      stamp: '名',
      title: '古今地名对照',
      description: '范阳、洛阳、长安等地理检索',
      route: '/geography',
    },
    {
      id: 'dynasty',
      stamp: '时',
      title: '时间轴地图',
      description: '按朝代与年份查看疆域演变',
      route: '/historical-maps/dynasty',
    },
    {
      id: 'topic',
      stamp: '线',
      title: '战役路线',
      description: '楚汉争霸、安史之乱、三国鼎立',
      route: '/historical-maps/topic',
    },
  ];

  const handleCategoryPress = (category: CategoryItem) => {
    if (!category.route || category.disabled) return;
    router.push(category.route);
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push('/encyclopedia-search', { query: searchText });
    }
  };

  const renderCategory = (category: CategoryItem) => (
      <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryCard,
            category.disabled && styles.categoryCardDisabled,
          ]}
          onPress={() => handleCategoryPress(category)}
          activeOpacity={category.disabled ? 1 : 0.7}
          disabled={category.disabled}
      >
        <View style={styles.categoryTop}>
          <View style={[styles.categoryStamp, { backgroundColor: `${category.color}20` }]}>
            <ThemedText variant="tiny" color={category.color}>
              {category.stamp}
            </ThemedText>
          </View>
          <FontAwesome6 name={category.icon as any} size={16} color={category.color} />
        </View>
        <View style={styles.categoryBody}>
          <View>
            <ThemedText variant="bodyMedium" color={theme.textPrimary}>
              {category.title}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textSecondary}>
              {category.description}
            </ThemedText>
          </View>
          {category.count !== undefined ? (
            <View style={styles.categoryCount}>
              <ThemedText variant="tiny" color={category.color}>
                {category.count}
              </ThemedText>
            </View>
          ) : category.statusLabel ? (
            <View style={styles.categoryCount}>
              <ThemedText variant="tiny" color={theme.textMuted}>
                {category.statusLabel}
              </ThemedText>
            </View>
          ) : (
            <ThemedText variant="tiny" color={theme.textMuted}>
              进入
            </ThemedText>
          )}
        </View>
      </TouchableOpacity>
  );

  const renderMapEntry = (entry: typeof mapEntries[number]) => (
    <TouchableOpacity
      key={entry.id}
      style={styles.listItem}
      onPress={() => router.push(entry.route)}
      activeOpacity={0.7}
    >
      <View style={styles.listStamp}>
        <ThemedText variant="tiny" color={theme.accent}>
          {entry.stamp}
        </ThemedText>
      </View>
      <View style={styles.listContent}>
        <ThemedText variant="bodyMedium" color={theme.textPrimary}>
          {entry.title}
        </ThemedText>
        <ThemedText variant="caption" color={theme.textSecondary}>
          {entry.description}
        </ThemedText>
      </View>
      <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
    </TouchableOpacity>
  );

  return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <ThemedText variant="h1" color={theme.textPrimary}>
                  探索
                </ThemedText>
                <ThemedText variant="small" color={theme.textMuted} style={styles.headerSubtitle}>
                  人物、制度、地图与历史对话入口
                </ThemedText>
              </View>
              <View style={styles.seal}>
                <ThemedText variant="title" color={theme.buttonPrimaryText}>探</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
            <TextInput
                style={styles.searchInput}
                placeholder="搜索人物、官职、地名、事件..."
                placeholderTextColor={theme.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
            />
            {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
                </TouchableOpacity>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              知识分区
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              {knowledgeCategories.length} 个入口
            </ThemedText>
          </View>
          <View style={styles.categoriesWrap}>
            {knowledgeCategories.map(category => renderCategory(category))}
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              群聊互动
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              历史对话 / 我的群聊
            </ThemedText>
          </View>
          <View style={styles.categoriesWrap}>
            {chatEntries.map(category => renderCategory(category))}
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              历史地图
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              地图 / 专题 / 图层
            </ThemedText>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/map-event', { id: 'an-shi-zhi-luan' })}>
            <LinearGradient
              colors={[theme.accentSoft, theme.goldSoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mapCard}
            >
              <View style={styles.mapCardTop}>
                <View style={styles.mapBadge}>
                  <ThemedText variant="tiny" color={theme.accent}>专题地图</ThemedText>
                </View>
                <FontAwesome6 name="map-location-dot" size={18} color={theme.accent} />
              </View>
              <View style={styles.mapCaption}>
                <ThemedText variant="title" color={theme.textPrimary}>
                  安史之乱
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.mapCaptionMeta}>
                  755-763 · 唐 · 叛军南下与长安失守路线
                </ThemedText>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.listGroup}>
            {mapEntries.map(renderMapEntry)}
          </View>

          <View style={styles.statsCard}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              数据统计
            </ThemedText>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText variant="h4" color={theme.primary}>
                  294
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  卷目总数
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="h4" color={theme.accent}>
                  {stats.characters}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  人物词条
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="h4" color={theme.warning}>
                  {stats.titles}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  官职条目
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="h4" color={theme.info}>
                  {stats.geography}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  地理节点
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </Screen>
  );
}

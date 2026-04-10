import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface CategoryItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  route: string;
  count?: number;
}

export default function EncyclopediaScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');

  const categories: CategoryItem[] = [
    {
      id: 'characters',
      title: '人物列表',
      description: '历史人物与关系图谱',
      icon: 'users',
      color: theme.primary,
      gradient: ['#6366F1', '#4F46E5'],
      route: '/characters',
      count: 234,
    },
    {
      id: 'titles',
      title: '官职列表',
      description: '历代官职与品级制度',
      icon: 'scroll',
      color: theme.accent,
      gradient: ['#A78BFA', '#7C3AED'],
      route: '/titles',
      count: 87,
    },
    {
      id: 'quotes',
      title: '典著名句',
      description: '资治通鉴经典语录',
      icon: 'quote-left',
      color: '#10B981',
      gradient: ['#34D399', '#10B981'],
      route: '/quotes',
    },
    {
      id: 'era-names',
      title: '年号对照',
      description: '帝王年号与纪年转换',
      icon: 'calendar-days',
      color: '#EF4444',
      gradient: ['#F87171', '#EF4444'],
      route: '/era-names',
    },
    {
      id: 'group-chat',
      title: '历史群聊',
      description: '与历史人物对话',
      icon: 'message',
      color: '#8B5CF6',
      gradient: ['#A78BFA', '#8B5CF6'],
      route: '/group-chat',
    },
    {
      id: 'chat-rooms',
      title: '我的群聊',
      description: '查看历史群聊记录',
      icon: 'comments',
      color: '#F59E0B',
      gradient: ['#FBBF24', '#F59E0B'],
      route: '/chat-rooms',
    },
  ];

  const handleCategoryPress = (category: CategoryItem) => {
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
          style={[styles.categoryCard, { borderColor: category.color }]}
          onPress={() => handleCategoryPress(category)}
          activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
          <FontAwesome6 name={category.icon as any} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.categoryContent}>
          <View style={styles.categoryHeader}>
            <ThemedText variant="h4" color={theme.textPrimary}>
              {category.title}
            </ThemedText>
            {category.count !== undefined && (
                <ThemedText variant="caption" color={category.color} style={styles.categoryCount}>
                  {category.count}
                </ThemedText>
            )}
          </View>
          <ThemedText variant="body" color={theme.textSecondary}>
            {category.description}
          </ThemedText>
        </View>
        <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
      </TouchableOpacity>
  );

  return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <ThemedView level="root" style={styles.header}>
            <ThemedText variant="h2" color={theme.textPrimary}>
              通鉴百科
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
              探索历史的智慧
            </ThemedText>
          </ThemedView>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
            <TextInput
                style={styles.searchInput}
                placeholder="搜索人物、官职、事件..."
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

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
              知识分区
            </ThemedText>
            {categories.map(category => renderCategory(category))}
          </View>

          {/* Quick Stats */}
          <ThemedView level="default" style={styles.statsCard}>
            <ThemedText variant="labelSmall" color={theme.textMuted} style={styles.statsTitle}>
              数据统计
            </ThemedText>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText variant="h2" color={theme.primary}>
                  294
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  卷
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="h2" color={theme.accent}>
                  234
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  人物
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="h2" color="#F59E0B">
                  87
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  官职
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="h2" color="#0891B2">
                  20
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  地图
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </Screen>
  );
}

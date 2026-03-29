import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface Title {
  id: number;
  name: string;
  dynasty: string;
  description: string;
  aliases?: string[];
}

interface Era {
  name: string;
  count: number;
}

export default function TitlesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dynasties: Era[] = [
    { name: '汉朝', count: 45 },
    { name: '三国', count: 32 },
    { name: '晋朝', count: 10 },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      /**
       * 服务端文件：server/src/routes/encyclopedia.ts
       * 接口：GET /api/v1/encyclopedia/titles
       * Query 参数：dynasty?: string, limit?: number, offset?: number
       */
      const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/titles?${new URLSearchParams({
            dynasty: selectedEra || '',
            limit: '50',
            offset: '0',
          })}`
      );

      const result = await response.json();

      if (result.success) {
        // 后端已经将 aliases 转换为数组，直接使用
        setTitles(result.data || []);
      }
    } catch (error) {
      console.error('获取官职列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedEra]);

  React.useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
      useCallback(() => {
        fetchData();
      }, [fetchData])
  );

  const handleRefresh = () => {
    fetchData();
  };

  const handleSearch = () => {
    setSearchQuery(searchText);
  };

  const handleEraSelect = (era: string | null) => {
    setSelectedEra(era === selectedEra ? null : era);
  };

  const handleTitlePress = (id: number, name: string) => {
    router.push('/encyclopedia-detail', { type: 'title', name });
  };

  const filteredTitles = useMemo(() => {
    if (!searchQuery) return titles;
    const query = searchQuery.toLowerCase();
    return titles.filter(
        title =>
            title.name.toLowerCase().includes(query) ||
            title.description.toLowerCase().includes(query) ||
            (Array.isArray(title.aliases) && title.aliases.some(alias => alias.toLowerCase().includes(query)))
    );
  }, [titles, searchQuery]);

  const renderTitle = ({ item }: { item: Title }) => (
      <TouchableOpacity
          style={styles.titleCard}
          onPress={() => handleTitlePress(item.id, item.name)}
          activeOpacity={0.7}
      >
        <View style={styles.titleIcon}>
          <FontAwesome6 name="scroll" size={20} color={theme.accent} />
        </View>
        <View style={styles.titleInfo}>
          <View style={styles.titleHeader}>
            <ThemedText variant="h4" color={theme.textPrimary}>
              {item.name}
            </ThemedText>
            <ThemedText variant="caption" color={theme.accent} style={styles.eraBadge}>
              {item.dynasty}
            </ThemedText>
          </View>
          {item.description && (
              <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2}>
                {item.description}
              </ThemedText>
          )}
          {item.aliases && Array.isArray(item.aliases) && item.aliases.length > 0 && (
              <ThemedText variant="caption" color={theme.textMuted} style={styles.aliasesText}>
                别名：{item.aliases.join('、')}
              </ThemedText>
          )}
        </View>
        <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
      </TouchableOpacity>
  );

  const renderDynastyItem = (era: Era) => (
      <TouchableOpacity
          key={era.name}
          style={[
            styles.eraChip,
            selectedEra === era.name && styles.eraChipActive,
          ]}
          onPress={() => handleEraSelect(era.name)}
      >
        <ThemedText
            variant="small"
            color={selectedEra === era.name ? theme.buttonPrimaryText : theme.textSecondary}
        >
          {era.name} ({era.count})
        </ThemedText>
      </TouchableOpacity>
  );

  return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <View style={styles.headerRow}>
            <ThemedText variant="h2" color={theme.textPrimary}>官职</ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
            历代官职与品级制度
          </ThemedText>
        </ThemedView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
          <TextInput
              style={styles.searchInput}
              placeholder="搜索官职名称..."
              placeholderTextColor={theme.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
          />
          {searchText.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchText(''); setSearchQuery(''); }}>
                <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
              </TouchableOpacity>
          )}
        </View>

        {/* Era Filter */}
        <View style={styles.eraContainer}>
          <TouchableOpacity
              style={[styles.eraChip, !selectedEra && styles.eraChipActive]}
              onPress={() => handleEraSelect(null)}
          >
            <ThemedText
                variant="small"
                color={!selectedEra ? theme.buttonPrimaryText : theme.textSecondary}
            >
              全部
            </ThemedText>
          </TouchableOpacity>
          {dynasties.map(era => renderDynastyItem(era))}
        </View>

        {/* Titles List */}
        <FlatList
            data={filteredTitles}
            renderItem={renderTitle}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[theme.accent]}
                  tintColor={theme.accent}
              />
            }
            ListEmptyComponent={
              !loading ? (
                  <View style={styles.emptyContainer}>
                    <FontAwesome6 name="scroll" size={48} color={theme.textMuted} />
                    <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                      {searchQuery ? '未找到匹配的官职' : '暂无官职数据'}
                    </ThemedText>
                  </View>
              ) : null
            }
        />
      </Screen>
  );
}

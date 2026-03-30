import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getCharacters, getEras, Character, Era } from '@/utils/characters';

export default function CharactersScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [eras, setEras] = useState<Era[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      // 获取朝代列表（仅首次）
      if (pageNum === 1 && eras.length === 0) {
        /**
         * 服务端文件：server/src/routes/characters.ts
         * 接口：GET /api/v1/characters/eras
         */
        const erasResult = await getEras();
        if (erasResult.success) {
          setEras(erasResult.data);
        }
      }

      // 获取人物列表
      const params: { era?: string; name?: string; page: number; limit: number } = {
        page: pageNum,
        limit: 20,
      };

      if (selectedEra) {
        params.era = selectedEra;
      }

      if (searchQuery) {
        params.name = searchQuery;
      }

      /**
       * 服务端文件：server/src/routes/characters.ts
       * 接口：GET /api/v1/characters
       * Query 参数：era?: string, name?: string, page?: number, limit?: number
       */
      const result = await getCharacters(params);

      if (result.success) {
        if (refresh || pageNum === 1) {
          setCharacters(result.data.characters);
        } else {
          setCharacters(prev => [...prev, ...result.data.characters]);
        }
        setHasMore(pageNum < result.data.totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('获取人物列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedEra, searchQuery, eras.length]);

  useEffect(() => {
    fetchData(1);
  }, [selectedEra, searchQuery]);

  const handleRefresh = () => {
    fetchData(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchData(page + 1);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchText);
    setPage(1);
  };

  const handleEraSelect = (era: string | null) => {
    setSelectedEra(era);
    setPage(1);
    setCharacters([]);
  };

  const handleCharacterPress = (id: number) => {
    router.push('/character-detail', { id });
  };

  const renderCharacter = ({ item }: { item: Character }) => (
    <TouchableOpacity
      style={styles.characterCard}
      onPress={() => handleCharacterPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.characterInfo}>
        <View style={styles.characterHeader}>
          <ThemedText variant="h4" color={theme.textPrimary}>{item.name}</ThemedText>
          {item.title && (
            <ThemedText variant="small" color={theme.accent} style={styles.titleText}>
              {item.title}
            </ThemedText>
          )}
        </View>
        <ThemedText variant="body" color={theme.textSecondary} style={styles.characterSubtitle}>
          {item.era}{item.birth_year && item.death_year ? ` · ${item.birth_year}-${item.death_year}` : ''}
        </ThemedText>
        {item.summary && (
          <ThemedText variant="small" color={theme.textMuted} numberOfLines={2} style={styles.characterSummary}>
            {item.summary}
          </ThemedText>
        )}
      </View>
      <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
    </TouchableOpacity>
  );

  const renderEraItem = (era: Era) => (
    <TouchableOpacity
      key={era.name}
      style={[
        styles.eraChip,
        selectedEra === era.name && styles.eraChipActive,
      ]}
      onPress={() => handleEraSelect(selectedEra === era.name ? null : era.name)}
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
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText variant="h2" color={theme.textPrimary}>人物图谱</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
              探索历史人物关系网络
            </ThemedText>
          </View>
          <TouchableOpacity style={styles.graphButton} onPress={() => router.push('/character-graph')}>
            <FontAwesome6 name="diagram-project" size={18} color={theme.buttonPrimaryText} />
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索人物姓名..."
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
        {eras.map(era => renderEraItem(era))}
      </View>

      {/* Characters List */}
      <FlatList
        data={characters}
        renderItem={renderCharacter}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="users" size={48} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                {searchQuery ? '未找到匹配的人物' : '暂无人物数据'}
              </ThemedText>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

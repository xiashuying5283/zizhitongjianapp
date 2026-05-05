import React, { useState, useEffect, useMemo } from 'react';
import { View, SectionList, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, RefreshControl, Text } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { styles, COLORS } from './styles';
import {ThemedView} from "@/components/ThemedView";
import {ThemedText} from "@/components/ThemedText";

interface EraItem {
  era_name: string;
  emperor_name: string;
  dynasty: string;
  startYear: number;
  endYear: number;
  yearCount: number;
}

interface EraSection {
  dynasty: string;
  data: EraItem[];
}

const MAIN_DYNASTIES = ['全部', '周秦', '兩漢', '三國兩晉', '南北朝', '隋唐', '五代'];

export default function EraNamesScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [selectedDynasty, setSelectedDynasty] = useState('周秦');
  const [eraGroups, setEraGroups] = useState<EraSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载年号数据
  const loadEraGroups = async (dynasty?: string) => {
    try {
      setLoading(true);
      const dynastyParam = dynasty || selectedDynasty;
      const url = dynastyParam === '全部'
          ? `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/era-groups`
          : `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/era-groups?dynasty=${encodeURIComponent(dynastyParam)}`;

      /**
       * 服务端文件：server/src/routes/encyclopedia.ts
       * 接口：GET /api/v1/encyclopedia/era-groups
       * Query参数：dynasty（支持历史时期分组：周秦、兩漢、三國兩晉、南北朝、隋唐、五代）
       */
      const response = await fetch(url);
      const result = await response.json();
      if (result.success && result.data) {
        // 转换为 SectionList 格式
        const sections: EraSection[] = result.data.map((group: any) => ({
          dynasty: group.dynasty,
          data: group.eras.sort((a: EraItem, b: EraItem) => a.startYear - b.startYear)
        }));
        setEraGroups(sections);
      }
    } catch (error) {
      console.error('加载年号数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEraGroups();
  }, []);

  const handleDynastyChange = (dynasty: string) => {
    setSelectedDynasty(dynasty);
    loadEraGroups(dynasty);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEraGroups();
    setRefreshing(false);
  };

  // 格式化年份
  const formatYear = (year: number): string => {
    if (year < 0) {
      return `公元前${Math.abs(year)}年`;
    }
    return `公元${year}年`;
  };

  // 搜索过滤后的 sections
  const filteredSections = useMemo(() => {
    if (!searchText.trim()) {
      return eraGroups;
    }

    const search = searchText.toLowerCase();
    const filtered: EraSection[] = [];

    eraGroups.forEach(section => {
      const matchingEras = section.data.filter(era =>
          era.era_name.toLowerCase().includes(search) ||
          era.emperor_name.toLowerCase().includes(search)
      );

      if (matchingEras.length > 0) {
        filtered.push({
          dynasty: section.dynasty,
          data: matchingEras
        });
      }
    });

    return filtered;
  }, [eraGroups, searchText]);

  // 是否显示朝代分割线（有多个朝代分组时显示）
  const showDynastyDividers = useMemo(() => {
    return filteredSections.length > 1;
  }, [filteredSections]);

  const renderEraItem = ({ item }: { item: EraItem }) => (
      <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/era-detail', {
            eraName: item.era_name,
            emperorName: item.emperor_name,
            dynasty: item.dynasty,
            startYear: item.startYear.toString(),
            endYear: item.endYear.toString(),
            yearCount: item.yearCount.toString(),
          })}
          activeOpacity={0.7}
      >
        {/* 顶部：年号名称 + 朝代标签 */}
        <View style={styles.cardTop}>
          <Text style={styles.eraName}>{item.era_name}</Text>
          <View style={styles.dynastyBadge}>
            <Text style={styles.dynastyText}>{item.dynasty}</Text>
          </View>
        </View>

        {/* 中间：帝王 + 年数 */}
        <View style={styles.cardMiddle}>
          <Text style={styles.emperorName}>{item.emperor_name}</Text>
          <Text style={styles.dot}> · </Text>
          <Text style={styles.yearCount}>共 {item.yearCount} 年</Text>
        </View>

        {/* 底部：公历年份 */}
        <View style={styles.cardBottom}>
          <Text style={styles.yearRange}>
            {formatYear(item.startYear)} - {formatYear(item.endYear)}
          </Text>
        </View>
      </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: EraSection }) => {
    if (!showDynastyDividers) return null;

    return (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDividerLeft} />
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>{section.dynasty}</Text>
          </View>
          <View style={styles.sectionDividerRight} />
        </View>
    );
  };

  return (
      <Screen backgroundColor={COLORS.background} statusBarStyle="dark">
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary}>年号对照</ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
            帝王年号与纪年大事
          </ThemedText>
        </ThemedView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome6 name="magnifying-glass" size={18} color={COLORS.textHint} />
          <TextInput
              style={styles.searchInput}
              placeholder="搜索年号或帝王..."
              placeholderTextColor={COLORS.textHint}
              value={searchText}
              onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
                <FontAwesome6 name="xmark" size={16} color={COLORS.textHint} />
              </TouchableOpacity>
          )}
        </View>

        {/* Dynasty Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
          >
            {MAIN_DYNASTIES.map(dynasty => (
                <TouchableOpacity
                    key={dynasty}
                    style={styles.tab}
                    onPress={() => handleDynastyChange(dynasty)}
                >
                  <Text style={[
                    styles.tabText,
                    selectedDynasty === dynasty && styles.tabTextActive
                  ]}>
                    {dynasty}
                  </Text>
                  {selectedDynasty === dynasty && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Era List */}
        {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
        ) : (
            <SectionList
                sections={filteredSections}
                renderItem={renderEraItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item, index) => `${item.era_name}_${item.emperor_name}_${index}`}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                refreshControl={
                  <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      colors={[COLORS.primary]}
                      tintColor={COLORS.primary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <FontAwesome6 name="magnifying-glass" size={48} color={COLORS.textHint} style={{ opacity: 0.3 }} />
                    <Text style={styles.emptyText}>未找到相关年号记录</Text>
                  </View>
                }
            />
        )}
      </Screen>
  );
}

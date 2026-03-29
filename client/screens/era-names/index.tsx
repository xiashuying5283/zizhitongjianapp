import React, { useState, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface EraName {
  id: number;
  name: string;
  emperor: string;
  startYear: number;
  endYear: number;
  bc_start: number;
  bc_end: number;
  dynasty: string;
}

interface EraGroup {
  dynasty: string;
  eras: EraName[];
}

const eras: EraName[] = [
  { id: 1, name: '始皇帝', emperor: '秦始皇', startYear: 1, endYear: 37, bc_start: 221, bc_end: 207, dynasty: '秦' },
  { id: 2, name: '二世', emperor: '秦二世', startYear: 1, endYear: 3, bc_start: 209, bc_end: 207, dynasty: '秦' },
  { id: 3, name: '高祖', emperor: '汉高祖', startYear: 1, endYear: 12, bc_start: 206, bc_end: 195, dynasty: '汉' },
  { id: 4, name: '惠帝', emperor: '汉惠帝', startYear: 1, endYear: 7, bc_start: 194, bc_end: 188, dynasty: '汉' },
  { id: 5, name: '高后', emperor: '吕后', startYear: 1, endYear: 8, bc_start: 187, bc_end: 180, dynasty: '汉' },
  { id: 6, name: '文帝', emperor: '汉文帝', startYear: 1, endYear: 16, bc_start: 179, bc_end: 164, dynasty: '汉' },
  { id: 7, name: '景帝', emperor: '汉景帝', startYear: 1, endYear: 7, bc_start: 156, bc_end: 150, dynasty: '汉' },
  { id: 8, name: '武帝', emperor: '汉武帝', startYear: 1, endYear: 54, bc_start: 140, bc_end: 87, dynasty: '汉' },
  { id: 9, name: '昭帝', emperor: '汉昭帝', startYear: 1, endYear: 13, bc_start: 86, bc_end: 74, dynasty: '汉' },
  { id: 10, name: '宣帝', emperor: '汉宣帝', startYear: 1, endYear: 25, bc_start: 73, bc_end: 49, dynasty: '汉' },
];

export default function EraNamesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [selectedDynasty, setSelectedDynasty] = useState('全部');

  const dynasties = ['全部', '秦', '汉', '三国', '晋'];

  const eraGroups: EraGroup[] = useMemo(() => {
    const filtered = eras.filter(era => {
      const matchDynasty = selectedDynasty === '全部' || era.dynasty === selectedDynasty;
      const matchSearch = !searchText ||
        era.name.toLowerCase().includes(searchText.toLowerCase()) ||
        era.emperor.toLowerCase().includes(searchText.toLowerCase());
      return matchDynasty && matchSearch;
    });

    // 按朝代分组
    const groups: EraGroup[] = [];
    const dynastyMap = new Map<string, EraName[]>();

    filtered.forEach(era => {
      if (!dynastyMap.has(era.dynasty)) {
        dynastyMap.set(era.dynasty, []);
      }
      dynastyMap.get(era.dynasty)!.push(era);
    });

    dynastyMap.forEach((eras, dynasty) => {
      groups.push({ dynasty, eras });
    });

    return groups;
  }, [selectedDynasty, searchText]);

  const renderEraItem = (era: EraName) => (
    <View key={era.id} style={styles.eraItem}>
      <View style={styles.eraHeader}>
        <ThemedText variant="h4" color={theme.textPrimary}>
          {era.name}
        </ThemedText>
        <ThemedText variant="caption" color="#EF4444" style={styles.dynastyBadge}>
          {era.dynasty}
        </ThemedText>
      </View>
      <View style={styles.eraInfo}>
        <ThemedText variant="body" color={theme.textSecondary}>
          {era.emperor}
        </ThemedText>
        <ThemedText variant="caption" color={theme.textMuted}>
          ·
        </ThemedText>
        <ThemedText variant="caption" color={theme.textMuted}>
          {era.startYear}-{era.endYear}年
        </ThemedText>
      </View>
      <View style={styles.yearConversion}>
        <ThemedText variant="caption" color={theme.textMuted}>
          公元前{era.bc_start}-{era.bc_end}年
        </ThemedText>
      </View>
    </View>
  );

  const renderEraGroup = (group: EraGroup) => (
    <View key={group.dynasty} style={styles.eraGroup}>
      <ThemedText variant="h4" color={theme.textPrimary} style={styles.groupTitle}>
        {group.dynasty}
      </ThemedText>
      <ThemedView level="default" style={styles.eraList}>
        {group.eras.map(renderEraItem)}
      </ThemedView>
    </View>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText variant="h2" color={theme.textPrimary}>年号对照</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
        <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
          帝王年号与纪年转换
        </ThemedText>
      </ThemedView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索年号或帝王..."
          placeholderTextColor={theme.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dynasty Filter */}
      <View style={styles.dynastyContainer}>
        {dynasties.map(dynasty => (
          <TouchableOpacity
            key={dynasty}
            style={[styles.dynastyChip, selectedDynasty === dynasty && styles.dynastyChipActive]}
            onPress={() => setSelectedDynasty(dynasty)}
          >
            <ThemedText
              variant="small"
              color={selectedDynasty === dynasty ? theme.buttonPrimaryText : theme.textSecondary}
            >
              {dynasty}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Era List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {eraGroups.length > 0 ? (
          eraGroups.map(renderEraGroup)
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="calendar-days" size={48} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
              暂无数据
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

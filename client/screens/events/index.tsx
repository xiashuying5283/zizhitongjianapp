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

interface Event {
  id: number;
  title: string;
  year: string;
  bc_year: number;
  dynasty: string;
  description: string;
}

interface EventGroup {
  era: string;
  events: Event[];
}

export default function EventsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [selectedEra, setSelectedEra] = useState<string | null>(null);

  // 示例数据
  const events: Event[] = [
    {
      id: 1,
      title: '陈胜吴广起义',
      year: '秦二世元年',
      bc_year: 209,
      dynasty: '秦',
      description: '陈胜、吴广在蕲县大泽乡揭竿而起，爆发了中国历史上第一次大规模的农民起义。',
    },
    {
      id: 2,
      title: '巨鹿之战',
      year: '秦二世三年',
      bc_year: 207,
      dynasty: '秦',
      description: '项羽率楚军破釜沉舟，大破秦军主力，是秦朝灭亡的关键一战。',
    },
    {
      id: 3,
      title: '鸿门宴',
      year: '汉元年',
      bc_year: 206,
      dynasty: '汉',
      description: '刘邦赴项羽宴请，险遭杀害，后成功逃脱，成为楚汉相争的转折点。',
    },
    {
      id: 4,
      title: '楚汉争霸',
      year: '汉元年-汉五年',
      bc_year: 206,
      dynasty: '汉',
      description: '刘邦与项羽为争夺天下展开长达四年的战争，最终刘邦取得胜利。',
    },
    {
      id: 5,
      title: '白登之围',
      year: '汉七年',
      bc_year: 200,
      dynasty: '汉',
      description: '汉高祖刘邦被匈奴单于冒顿围困于白登山七日七夜，后采纳陈平计策脱险。',
    },
  ];

  const eras = ['全部', '秦', '汉', '三国'];

  const eventGroups: EventGroup[] = useMemo(() => {
    const filtered = events.filter(event => {
      const matchEra = !selectedEra || selectedEra === '全部' || event.dynasty === selectedEra;
      const matchSearch = !searchText ||
        event.title.toLowerCase().includes(searchText.toLowerCase()) ||
        event.description.toLowerCase().includes(searchText.toLowerCase());
      return matchEra && matchSearch;
    });

    // 按朝代分组
    const groups: EventGroup[] = [];
    const eraMap = new Map<string, Event[]>();

    filtered.forEach(event => {
      if (!eraMap.has(event.dynasty)) {
        eraMap.set(event.dynasty, []);
      }
      eraMap.get(event.dynasty)!.push(event);
    });

    eraMap.forEach((events, era) => {
      groups.push({ era, events });
    });

    return groups;
  }, [selectedEra, searchText]);

  const handleEventPress = (event: Event) => {
    // TODO: 跳转到事件详情页
    console.log('Event pressed:', event);
  };

  const renderEventCard = (event: Event, index: number) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() => handleEventPress(event)}
      activeOpacity={0.7}
    >
      <View style={styles.timelineConnector}>
        <View style={styles.timelineDot} />
        {index < events.length - 1 && <View style={styles.timelineLine} />}
      </View>
      <ThemedView level="default" style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <ThemedText variant="h4" color={theme.textPrimary}>
            {event.title}
          </ThemedText>
          <ThemedText variant="caption" color="#F59E0B" style={styles.yearBadge}>
            {event.year}
          </ThemedText>
        </View>
        <ThemedText variant="body" color={theme.textSecondary} numberOfLines={3}>
          {event.description}
        </ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );

  const renderEventGroup = (group: EventGroup) => (
    <View key={group.era} style={styles.eventGroup}>
      <ThemedText variant="h4" color={theme.textPrimary} style={styles.groupTitle}>
        {group.era}
      </ThemedText>
      {group.events.map((event, index) => renderEventCard(event, index))}
    </View>
  );

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText variant="h2" color={theme.textPrimary}>大事记</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
        <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
          重大历史事件时间线
        </ThemedText>
      </ThemedView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索历史事件..."
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

      {/* Era Filter */}
      <View style={styles.eraContainer}>
        {eras.map(era => (
          <TouchableOpacity
            key={era}
            style={[styles.eraChip, selectedEra === era && styles.eraChipActive]}
            onPress={() => setSelectedEra(selectedEra === era ? null : era)}
          >
            <ThemedText
              variant="small"
              color={selectedEra === era ? theme.buttonPrimaryText : theme.textSecondary}
            >
              {era}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {eventGroups.length > 0 ? (
          eventGroups.map(renderEventGroup)
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="clock-rotate-left" size={48} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
              暂无数据
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

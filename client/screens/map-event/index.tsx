import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { InteractiveMapView } from '@/components/InteractiveMapView';
import { 
  MapData, 
  HistoricalLocation, 
  HistoricalEvent,
  HistoricalRoute 
} from '@/data/types';

// 导入各历史地图数据
import { 
  locations as anShiLocations, 
  timelineEvents as anShiEvents, 
  routes as anShiRoutes,
  stats as anShiStats,
  yearOptions as anShiYears,
  mapMeta as anShiMeta,
} from '@/data/an-shi-zhi-luan';

import {
  locations as chuHanLocations,
  timelineEvents as chuHanEvents,
  routes as chuHanRoutes,
  stats as chuHanStats,
  yearOptions as chuHanYears,
  mapMeta as chuHanMeta,
} from '@/data/chu-han-contention';

import {
  locations as threeKingdomsLocations,
  timelineEvents as threeKingdomsEvents,
  routes as threeKingdomsRoutes,
  stats as threeKingdomsStats,
  yearOptions as threeKingdomsYears,
  mapMeta as threeKingdomsMeta,
} from '@/data/three-kingdoms';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'map' | 'timeline';

// 根据 ID 获取对应的数据
const getMapData = (id: string): MapData | null => {
  switch (id) {
    case 'chu-han-contention':
      return {
        meta: chuHanMeta,
        locations: chuHanLocations,
        events: chuHanEvents,
        routes: chuHanRoutes,
        stats: chuHanStats,
        yearOptions: chuHanYears,
      };
    case 'three-kingdoms':
      return {
        meta: threeKingdomsMeta,
        locations: threeKingdomsLocations,
        events: threeKingdomsEvents,
        routes: threeKingdomsRoutes,
        stats: threeKingdomsStats,
        yearOptions: threeKingdomsYears,
      };
    case 'an-shi-rebellion':
    default:
      return {
        meta: anShiMeta,
        locations: anShiLocations,
        events: anShiEvents,
        routes: anShiRoutes,
        stats: anShiStats,
        yearOptions: anShiYears,
      };
  }
};

// 获取阵营颜色
const getFactionColors = (id: string, theme: any) => {
  switch (id) {
    case 'chu-han-contention':
      return {
        han: { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
        chu: { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
        neutral: { primary: theme.textMuted, bg: theme.backgroundTertiary },
      };
    case 'three-kingdoms':
      return {
        wei: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
        shu: { primary: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
        wu: { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        neutral: { primary: theme.textMuted, bg: theme.backgroundTertiary },
      };
    case 'an-shi-rebellion':
    default:
      return {
        tang: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
        rebels: { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
        rebel: { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
        neutral: { primary: theme.textMuted, bg: theme.backgroundTertiary },
      };
  }
};

export default function MapEventScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const mapId = id || 'an-shi-rebellion';
  const mapData = useMemo(() => getMapData(mapId), [mapId]);
  const factionColors = useMemo(() => getFactionColors(mapId, theme), [mapId, theme]);

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<HistoricalLocation | null>(null);

  // 根据年份筛选事件
  const filteredEvents = useMemo(() => {
    if (!mapData) return [];
    if (!selectedYear) return mapData.events;
    return mapData.events.filter(e => e.year === selectedYear);
  }, [mapData, selectedYear]);

  // 根据筛选的事件获取相关地点
  const activeLocations = useMemo(() => {
    if (!mapData) return [];
    const locationIds = new Set(filteredEvents.map(e => e.locationId));
    return mapData.locations.filter(l => locationIds.has(l.id));
  }, [mapData, filteredEvents]);

  // 处理地点点击
  const handleLocationPress = useCallback((location: HistoricalLocation) => {
    setSelectedLocation(location);
  }, []);

  // 获取事件图标
  const getEventIcon = (type: HistoricalEvent['type']) => {
    switch (type) {
      case 'battle':
        return 'shield-halved';
      case 'political':
        return 'crown';
      case 'movement':
        return 'route';
      case 'treaty':
        return 'scroll';
      default:
        return 'circle-info';
    }
  };

  // 获取事件颜色
  const getEventColor = (event: HistoricalEvent) => {
    if (event.importance === 'major') {
      return event.type === 'battle' ? theme.error :
             event.type === 'political' ? theme.accent :
             event.type === 'movement' ? theme.primary :
             theme.textSecondary;
    }
    return theme.textMuted;
  };

  // 获取地点颜色
  const getLocationColor = (location: HistoricalLocation) => {
    if (location.faction && factionColors) {
      const colors = factionColors as any;
      return colors[location.faction]?.primary || theme.textMuted;
    }
    return theme.textMuted;
  };

  // 获取地点图标
  const getLocationIcon = (type: string) => {
    const icons: Record<string, string> = {
      capital: 'crown',
      battlefield: 'shield-halved',
      strategic: 'fort',
      city: 'city',
    };
    return icons[type] || 'location-dot';
  };

  if (!mapData) {
    return null;
  }

  // 渲染关键人物
  const renderKeyFigures = () => {
    const keyFigures = mapData.stats.keyFigures;
    if (!keyFigures) return null;

    const factionEntries = Object.entries(keyFigures);
    const colors = factionColors as any;
    
    return factionEntries.map(([faction, figures]) => {
      const factionColor = colors[faction];
      const factionNames: Record<string, string> = {
        han: '汉军',
        chu: '楚军',
        wei: '曹魏',
        shu: '蜀汉',
        wu: '东吴',
        tang: '唐将',
        rebels: '叛军',
      };
      
      return (
        <View key={faction} style={{ marginBottom: Spacing.md }}>
          <ThemedText variant="smallMedium" color={theme.textMuted} style={{ marginBottom: Spacing.sm }}>
            {factionNames[faction] || faction}
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {(figures as string[]).map((name: string) => (
              <View 
                key={name} 
                style={[
                  styles.metaBadge, 
                  { backgroundColor: factionColor?.bg || theme.backgroundTertiary }
                ]}
              >
                <ThemedText 
                  variant="small" 
                  color={factionColor?.primary || theme.textMuted}
                >
                  {name}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      );
    });
  };

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <ThemedText variant="h2" color={theme.textPrimary}>{mapData.meta.title}</ThemedText>
            </View>
          </View>
          <View style={styles.headerMeta}>
            <View style={styles.metaBadge}>
              <FontAwesome6 name="calendar" size={12} color={theme.textSecondary} />
              <ThemedText variant="small" color={theme.textSecondary}>{mapData.meta.subtitle}</ThemedText>
            </View>
            <View style={styles.metaBadge}>
              <FontAwesome6 name="map-location-dot" size={12} color={theme.textSecondary} />
              <ThemedText variant="small" color={theme.textSecondary}>{mapData.meta.period}</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* View Mode Toggle */}
        <View style={{ flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.md,
              backgroundColor: viewMode === 'map' ? theme.primary : theme.backgroundDefault,
              marginRight: Spacing.sm,
            }}
            onPress={() => setViewMode('map')}
          >
            <FontAwesome6
              name="map"
              size={16}
              color={viewMode === 'map' ? theme.buttonPrimaryText : theme.textSecondary}
            />
            <ThemedText
              variant="smallMedium"
              color={viewMode === 'map' ? theme.buttonPrimaryText : theme.textSecondary}
              style={{ marginLeft: Spacing.sm }}
            >
              地图
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.md,
              backgroundColor: viewMode === 'timeline' ? theme.primary : theme.backgroundDefault,
            }}
            onPress={() => setViewMode('timeline')}
          >
            <FontAwesome6
              name="timeline"
              size={16}
              color={viewMode === 'timeline' ? theme.buttonPrimaryText : theme.textSecondary}
            />
            <ThemedText
              variant="smallMedium"
              color={viewMode === 'timeline' ? theme.buttonPrimaryText : theme.textSecondary}
              style={{ marginLeft: Spacing.sm }}
            >
              时间线
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText variant="h2" color={theme.primary}>{mapData.stats.duration}</ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>持续时间</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText variant="h2" color={theme.error}>{mapData.stats.majorBattles}</ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>主要战役</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText variant="h2" color={theme.accent}>{mapData.locations.length}</ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>历史地点</ThemedText>
          </View>
        </View>

        {/* Year Filter */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <ThemedText variant="title" color={theme.textPrimary}>年份筛选</ThemedText>
            {selectedYear && (
              <TouchableOpacity onPress={() => setSelectedYear(null)}>
                <ThemedText variant="small" color={theme.primary}>清除筛选</ThemedText>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.timelineScroll}>
            <View style={{ borderRadius: BorderRadius.md }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {mapData.yearOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timelineItem,
                      selectedYear === option.value && styles.timelineItemActive,
                    ]}
                    onPress={() => setSelectedYear(selectedYear === option.value ? null : option.value)}
                  >
                    <ThemedText
                      variant="smallMedium"
                      color={selectedYear === option.value ? theme.buttonPrimaryText : theme.textPrimary}
                    >
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Map View */}
        {viewMode === 'map' && (
          <View style={[styles.mapContainer, { height: 400 }]}>
            <InteractiveMapView
              locations={activeLocations.length > 0 ? activeLocations : mapData.locations}
              routes={mapData.routes}
              selectedLocation={selectedLocation}
              onLocationPress={handleLocationPress}
            />
          </View>
        )}

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={styles.eventsSection}>
            <TouchableOpacity
              style={styles.eventCard}
              onPress={() => setSelectedLocation(null)}
            >
              <View style={styles.eventHeader}>
                <View style={[styles.eventIcon, { backgroundColor: `${getLocationColor(selectedLocation)}20` }]}>
                  <FontAwesome6
                    name={getLocationIcon(selectedLocation.type)}
                    size={16}
                    color={getLocationColor(selectedLocation)}
                  />
                </View>
                <View style={styles.eventContent}>
                  <ThemedText variant="h4" color={theme.textPrimary}>{selectedLocation.name}</ThemedText>
                  <ThemedText variant="small" color={theme.textSecondary}>
                    今{selectedLocation.modernName}
                  </ThemedText>
                </View>
              </View>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.eventDescription}>
                {selectedLocation.description}
              </ThemedText>
              {/* 相关事件 */}
              {mapData.events.filter(e => e.locationId === selectedLocation.id).length > 0 && (
                <View style={{ marginTop: Spacing.md }}>
                  <ThemedText variant="smallMedium" color={theme.textMuted}>相关事件</ThemedText>
                  {mapData.events
                    .filter(e => e.locationId === selectedLocation.id)
                    .slice(0, 3)
                    .map(event => (
                      <View key={event.id} style={{ marginTop: Spacing.xs, paddingLeft: Spacing.sm }}>
                        <ThemedText variant="small" color={theme.textPrimary}>
                          {event.date}：{event.title}
                        </ThemedText>
                      </View>
                    ))
                  }
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <View style={styles.eventsSection}>
            <ThemedText variant="title" color={theme.textPrimary} style={{ marginBottom: Spacing.md }}>
              {selectedYear ? `${selectedYear}年事件` : '事件时间线'}
            </ThemedText>
            {filteredEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={[styles.eventIcon, { backgroundColor: `${getEventColor(event)}20` }]}>
                    <FontAwesome6
                      name={getEventIcon(event.type)}
                      size={16}
                      color={getEventColor(event)}
                    />
                  </View>
                  <View style={styles.eventContent}>
                    <View style={styles.eventMeta}>
                      <ThemedText variant="small" color={theme.textMuted}>{event.date}</ThemedText>
                      {event.importance === 'major' && (
                        <View style={[styles.metaBadge, { paddingVertical: 2, paddingHorizontal: Spacing.xs }]}>
                          <ThemedText variant="tiny" color={theme.error}>重要</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText variant="h4" color={theme.textPrimary} style={styles.eventTitle}>
                      {event.title}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                      <FontAwesome6 name="location-dot" size={10} color={theme.textSecondary} />
                      <ThemedText variant="small" color={theme.textSecondary}>
                        {event.location}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText variant="body" color={theme.textSecondary} style={styles.eventDescription}>
                  {event.description}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Key Figures */}
        <View style={styles.eventsSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={{ marginBottom: Spacing.md }}>
            关键人物
          </ThemedText>
          {renderKeyFigures()}
        </View>
      </ScrollView>
    </Screen>
  );
}

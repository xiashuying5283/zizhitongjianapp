import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

interface MapSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  count: number;
}

export default function HistoricalMapsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const sections: MapSection[] = [
    {
      id: 'dynasty',
      title: '历朝地图',
      description: '按朝代查看历史地图演变',
      icon: 'landmark',
      color: '#4F46E5',
      route: '/historical-maps/dynasty',
      count: 8,
    },
    {
      id: 'topic',
      title: '专题地图',
      description: '战争、经济、文化等专题地图',
      icon: 'map-location-dot',
      color: '#0891B2',
      route: '/historical-maps/topic',
      count: 12,
    },
  ];

  const handleSectionPress = (section: MapSection) => {
    router.push(section.route);
  };

  const renderSection = (section: MapSection) => (
      <TouchableOpacity
          key={section.id}
          style={[styles.sectionCard, { borderColor: section.color }]}
          onPress={() => handleSectionPress(section)}
          activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${section.color}15` }]}>
          <FontAwesome6 name={section.icon as any} size={32} color={section.color} />
        </View>
        <View style={styles.contentContainer}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.sectionDescription}>
            {section.description}
          </ThemedText>
          <View style={styles.footer}>
            <View style={styles.countBadge}>
              <ThemedText variant="caption" color={section.color}>
                {section.count} 张地图
              </ThemedText>
            </View>
            <FontAwesome6 name="arrow-right" size={16} color={section.color} />
          </View>
        </View>
      </TouchableOpacity>
  );

  return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <ThemedView level="root" style={styles.header}>
            <ThemedText variant="h2" color={theme.textPrimary}>
              历史地图
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
              探索古代地理变迁
            </ThemedText>
          </ThemedView>

          {/* Sections */}
          <View style={styles.sectionsContainer}>
            {sections.map(section => renderSection(section))}
          </View>

          {/* Info Card */}
          <ThemedView level="default" style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <FontAwesome6 name="circle-info" size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.infoTitle}>
                使用说明
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                点击上方板块查看不同类型的历史地图，支持缩放和拖动操作
              </ThemedText>
            </View>
          </ThemedView>
        </ScrollView>
      </Screen>
  );
}

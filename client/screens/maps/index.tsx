import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import { createStyles } from './styles';

export default function MapsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h1" color={theme.textPrimary}>历史地图</ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
            古今地名对照与时空变迁
          </ThemedText>
        </ThemedView>

        {/* Map Modes */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>地图模式</ThemedText>

          <TouchableOpacity style={styles.mapModeCard}>
            <View style={styles.mapModeInfo}>
              <View style={styles.mapModeIcon}>
                <FontAwesome6 name="map-location-dot" size={24} color={theme.textPrimary} />
              </View>
              <View style={styles.mapModeDetails}>
                <ThemedText variant="h4" color={theme.textPrimary}>古今地名对照</ThemedText>
                <ThemedText variant="body" color={theme.textSecondary}>
                  查看古地名的现代地理位置
                </ThemedText>
              </View>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.mapModeCard}>
            <View style={styles.mapModeInfo}>
              <View style={styles.mapModeIcon}>
                <FontAwesome6 name="clock-rotate-left" size={24} color={theme.textPrimary} />
              </View>
              <View style={styles.mapModeDetails}>
                <ThemedText variant="h4" color={theme.textPrimary}>时间轴地图</ThemedText>
                <ThemedText variant="body" color={theme.textSecondary}>
                  随年份动态展示疆域变迁
                </ThemedText>
              </View>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.mapModeCard}>
            <View style={styles.mapModeInfo}>
              <View style={styles.mapModeIcon}>
                <FontAwesome6 name="shield-halved" size={24} color={theme.textPrimary} />
              </View>
              <View style={styles.mapModeDetails}>
                <ThemedText variant="h4" color={theme.textPrimary}>战役路线</ThemedText>
                <ThemedText variant="body" color={theme.textSecondary}>
                  标记重要战役与进军路线
                </ThemedText>
              </View>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </ThemedView>

        {/* Featured Events */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>精选事件地图</ThemedText>

          <TouchableOpacity
            style={styles.eventCard}
            onPress={() => router.push('/map-event', { id: 'an-shi-zhi-luan' })}
          >
            <View style={styles.eventInfo}>
              <ThemedText variant="h4" color={theme.textPrimary}>安史之乱</ThemedText>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.eventSubtitle}>
                755年-763年 · 唐朝
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.eventDescription}>
                叛军从范阳起兵，攻占洛阳、长安，唐玄宗出逃，最终叛乱被平定
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.eventCard}
            onPress={() => router.push('/map-event', { id: 'chu-han-zheng-ba' })}
          >
            <View style={styles.eventInfo}>
              <ThemedText variant="h4" color={theme.textPrimary}>楚汉争霸</ThemedText>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.eventSubtitle}>
                前206年-前202年 · 秦末汉初
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.eventDescription}>
                刘邦与项羽争夺天下的战争，最终刘邦建立汉朝
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.eventCard}
            onPress={() => router.push('/map-event', { id: 'san-guo-ding-li' })}
          >
            <View style={styles.eventInfo}>
              <ThemedText variant="h4" color={theme.textPrimary}>三国鼎立</ThemedText>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.eventSubtitle}>
                220年-280年 · 三国时期
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.eventDescription}>
                魏、蜀、吴三国割据，形成三足鼎立的局面
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </ThemedView>

        {/* GIS Layers */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>图层叠加</ThemedText>
          <View style={styles.layerItem}>
            <FontAwesome6 name="map" size={20} color={theme.textPrimary} />
            <ThemedText variant="body" color={theme.textPrimary} style={styles.layerText}>行政区划</ThemedText>
          </View>
          <View style={styles.layerItem}>
            <FontAwesome6 name="mountain" size={20} color={theme.textPrimary} />
            <ThemedText variant="body" color={theme.textPrimary} style={styles.layerText}>地形地貌</ThemedText>
          </View>
          <View style={styles.layerItem}>
            <FontAwesome6 name="water" size={20} color={theme.textPrimary} />
            <ThemedText variant="body" color={theme.textPrimary} style={styles.layerText}>河流水系</ThemedText>
          </View>
          <View style={styles.layerItem}>
            <FontAwesome6 name="route" size={20} color={theme.textPrimary} />
            <ThemedText variant="body" color={theme.textPrimary} style={styles.layerText}>交通要道</ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

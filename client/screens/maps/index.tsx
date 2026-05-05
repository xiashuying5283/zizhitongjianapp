import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { createStyles } from './styles';

interface MapEntry {
  id: string;
  stamp: string;
  title: string;
  description: string;
  route: string;
  params?: Record<string, string>;
}

interface FeaturedEvent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
}

export default function MapsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const mapModes: MapEntry[] = [
    {
      id: 'geography',
      stamp: '名',
      title: '古今地名对照',
      description: '查看古地名的现代位置与相关卷目',
      route: '/geography',
    },
    {
      id: 'timeline',
      stamp: '时',
      title: '时间轴地图',
      description: '随朝代与年份查看疆域变迁',
      route: '/historical-maps/dynasty',
    },
    {
      id: 'battle',
      stamp: '线',
      title: '战役路线',
      description: '专题地图里查看重要战役行军路径',
      route: '/historical-maps/topic',
    },
    {
      id: 'layers',
      stamp: '层',
      title: '图层叠加',
      description: '行政区划、地形、水系与交通要道',
      route: '/historical-maps',
    },
  ];

  const featuredEvents: FeaturedEvent[] = [
    {
      id: 'an-shi-zhi-luan',
      title: '安史之乱',
      subtitle: '755年-763年 · 唐',
      description: '叛军从范阳起兵，攻入洛阳与长安，牵动整个唐代政治秩序。',
    },
    {
      id: 'chu-han-zheng-ba',
      title: '楚汉争霸',
      subtitle: '前206年-前202年 · 秦末汉初',
      description: '刘邦与项羽围绕关中、彭城与垓下展开多线推进与会战。',
    },
    {
      id: 'san-guo-ding-li',
      title: '三国鼎立',
      subtitle: '220年-280年 · 三国时期',
      description: '魏、蜀、吴以山川险阻与交通要道为支点形成长期割据。',
    },
  ];

  const layers = [
    { id: 'district', title: '行政区划', icon: 'map' as const },
    { id: 'terrain', title: '地形地貌', icon: 'mountain' as const },
    { id: 'water', title: '河流水系', icon: 'water' as const },
    { id: 'route', title: '交通要道', icon: 'route' as const },
  ];

  const handleEntryPress = (entry: MapEntry) => {
    router.push(entry.route, entry.params);
  };

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <ThemedText variant="h1" color={theme.textPrimary}>历史地图</ThemedText>
              <ThemedText variant="small" color={theme.textMuted} style={styles.headerSubtitle}>
                地名对照、时空变迁、战役专题与图层浏览
              </ThemedText>
            </View>
            <View style={styles.seal}>
              <ThemedText variant="title" color={theme.buttonPrimaryText}>舆</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              精选专题
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              可直接进入事件地图
            </ThemedText>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/map-event', { id: 'an-shi-zhi-luan' })}>
            <LinearGradient
              colors={[theme.infoSoft, theme.accentSoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Svg viewBox="0 0 320 190" style={styles.heroMap}>
                <Path
                  d="M45 132 C80 85, 110 96, 132 62 C160 22, 197 52, 220 34 C250 12, 282 28, 292 61 C304 99, 265 122, 230 116 C194 111, 185 158, 145 158 C101 158, 83 169, 45 132Z"
                  fill="rgba(37,117,110,0.18)"
                  stroke="rgba(37,117,110,0.68)"
                  strokeWidth={2}
                />
                <Path
                  d="M86 126 C118 99, 163 104, 207 72 C234 53, 258 58, 282 72"
                  fill="none"
                  stroke="rgba(167,66,56,0.76)"
                  strokeWidth={3}
                  strokeDasharray="6 5"
                />
                <Circle cx="92" cy="122" r="5" fill="#A74238" />
                <Circle cx="204" cy="75" r="5" fill="#A74238" />
                <Circle cx="279" cy="72" r="5" fill="#A74238" />
              </Svg>
              <View style={styles.heroBadge}>
                <ThemedText variant="tiny" color={theme.info}>专题地图</ThemedText>
              </View>
              <View style={styles.heroCaption}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="title" color={theme.textPrimary}>安史之乱</ThemedText>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.heroCaptionMeta}>
                    755-763 · 唐 · 范阳起兵、洛阳失守、长安西逃
                  </ThemedText>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              地图模式
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              地图 / 专题 / 图层
            </ThemedText>
          </View>
          <View style={styles.listGroup}>
            {mapModes.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.listItem}
                onPress={() => handleEntryPress(entry)}
                activeOpacity={0.7}
              >
                <View style={styles.listStamp}>
                  <ThemedText variant="tiny" color={theme.info}>
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
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              事件地图
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              历史路线精选
            </ThemedText>
          </View>
          <View style={styles.listGroup}>
            {featuredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push('/map-event', { id: event.id })}
                activeOpacity={0.7}
              >
                <View style={styles.eventMeta}>
                  <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                    {event.title}
                  </ThemedText>
                  <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
                </View>
                <ThemedText variant="caption" color={theme.textMuted}>
                  {event.subtitle}
                </ThemedText>
                <ThemedText variant="small" color={theme.textSecondary}>
                  {event.description}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              图层叠加
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              浏览地图时可叠加查看
            </ThemedText>
          </View>
          <View style={styles.layerWrap}>
            {layers.map((layer) => (
              <View key={layer.id} style={styles.layerItem}>
                <View style={styles.layerIcon}>
                  <FontAwesome6 name={layer.icon} size={15} color={theme.textPrimary} />
                </View>
                <ThemedText variant="small" color={theme.textPrimary} style={styles.layerText}>
                  {layer.title}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

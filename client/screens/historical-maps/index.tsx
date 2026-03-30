import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

// 历史地图数据
const historicalMaps = [
  {
    id: 'chu-han-contention',
    title: '楚汉争霸',
    subtitle: '公元前206年 - 公元前202年',
    period: '秦末汉初',
    duration: '4年',
    battles: 5,
    description: '秦朝灭亡后，项羽与刘邦争夺天下，历时四年，最终刘邦建立汉朝，开创四百年大汉基业。',
    coverImage: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80',
    tags: ['刘邦', '项羽', '韩信', '鸿门宴'],
    available: true,
  },
  {
    id: 'three-kingdoms',
    title: '三国鼎立',
    subtitle: '公元220年 - 公元280年',
    period: '东汉末年-西晋',
    duration: '60年',
    battles: 6,
    description: '东汉末年，群雄逐鹿，曹操、刘备、孙权三分天下，魏蜀吴三国鼎立六十载。',
    coverImage: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80',
    tags: ['曹操', '刘备', '孙权', '诸葛亮'],
    available: true,
  },
  {
    id: 'an-shi-rebellion',
    title: '安史之乱',
    subtitle: '公元755年 - 公元763年',
    period: '唐朝',
    duration: '8年',
    battles: 7,
    description: '安禄山、史思明叛乱，唐朝由盛转衰，两京沦陷，生灵涂炭，历时八年始平。',
    coverImage: 'https://images.unsplash.com/photo-1590076082261-5a0c6f57cc45?w=800&q=80',
    tags: ['安禄山', '郭子仪', '李光弼', '马嵬坡'],
    available: true,
  },
];

export default function HistoricalMapsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const handleMapPress = (mapId: string) => {
    router.push('/map-event', { id: mapId });
  };

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h1" color={theme.textPrimary} style={styles.title}>
            历史地图
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            探索中国历史上的重大事件，在地图上重现波澜壮阔的历史场景
          </ThemedText>
        </ThemedView>

        {/* Map List */}
        <View>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            专题地图
          </ThemedText>
          
          {historicalMaps.map((map) => (
            <TouchableOpacity
              key={map.id}
              style={styles.mapCard}
              onPress={() => map.available && handleMapPress(map.id)}
              activeOpacity={0.8}
            >
              {/* Cover Image */}
              <Image
                source={{ uri: map.coverImage }}
                style={styles.mapCardCover}
                resizeMode="cover"
              />
              
              {/* Content */}
              <View style={styles.mapCardContent}>
                <ThemedText variant="h3" color={theme.textPrimary} style={styles.mapCardTitle}>
                  {map.title}
                </ThemedText>
                
                <View style={styles.mapCardMeta}>
                  <View style={styles.mapCardMetaItem}>
                    <FontAwesome6 name="calendar" size={12} color={theme.textMuted} />
                    <ThemedText variant="small" color={theme.textMuted}>
                      {map.subtitle}
                    </ThemedText>
                  </View>
                  <View style={styles.mapCardMetaItem}>
                    <FontAwesome6 name="clock" size={12} color={theme.textMuted} />
                    <ThemedText variant="small" color={theme.textMuted}>
                      {map.duration}
                    </ThemedText>
                  </View>
                  <View style={styles.mapCardMetaItem}>
                    <FontAwesome6 name="shield-halved" size={12} color={theme.textMuted} />
                    <ThemedText variant="small" color={theme.textMuted}>
                      {map.battles}场战役
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText variant="small" color={theme.textSecondary} style={styles.mapCardDescription}>
                  {map.description}
                </ThemedText>
                
                {/* Tags */}
                <View style={styles.mapCardTags}>
                  {map.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <ThemedText variant="tiny" color={theme.textMuted}>
                        {tag}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coming Soon Section */}
        <View style={{ marginTop: Spacing.xl }}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            敬请期待
          </ThemedText>
          
          <View style={styles.comingSoon}>
            <FontAwesome6 name="hourglass-half" size={24} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.sm }}>
              更多历史地图正在制作中...
            </ThemedText>
            <ThemedText variant="small" color={theme.textMuted} style={{ marginTop: Spacing.xs }}>
              春秋战国 · 汉匈战争 · 三藩之乱
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

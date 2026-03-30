import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import {createStyles} from './styles';

interface TopicMap {
    id: string;
    title: string;
    category: string;
    description: string;
    imageUrl: string;
    color: string;
    relatedEvents: number;
}

export default function TopicMapsScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const topicMaps: TopicMap[] = [
        {
            id: 'battle-chibi',
            title: '赤壁之战',
            category: '战争',
            description: '三国时期著名的水战，奠定三国鼎立基础',
            imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&h=500&fit=crop',
            color: '#EF4444',
            relatedEvents: 8,
        },
        {
            id: 'silk-road',
            title: '丝绸之路',
            category: '贸易',
            description: '古代东西方文化交流的重要通道',
            imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=500&fit=crop',
            color: '#F59E0B',
            relatedEvents: 12,
        },
        {
            id: 'great-wall',
            title: '长城防线',
            category: '军事',
            description: '历代长城修筑历程与防御体系',
            imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop',
            color: '#4F46E5',
            relatedEvents: 15,
        },
        {
            id: 'grand-canal',
            title: '大运河',
            category: '工程',
            description: '隋唐时期开凿的人工运河',
            imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop',
            color: '#0891B2',
            relatedEvents: 6,
        },
        {
            id: 'battle-tingzhou',
            title: '定州之战',
            category: '战争',
            description: '安史之乱中的关键战役',
            imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop',
            color: '#EC4899',
            relatedEvents: 4,
        },
        {
            id: 'capital-locations',
            title: '历代都城',
            category: '政治',
            description: '中国历代都城位置变迁',
            imageUrl: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&h=500&fit=crop',
            color: '#8B5CF6',
            relatedEvents: 20,
        },
        {
            id: 'hundred-schools',
            title: '百家争鸣',
            category: '文化',
            description: '战国时期思想文化繁荣景象',
            imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&h=500&fit=crop',
            color: '#10B981',
            relatedEvents: 5,
        },
        {
            id: 'tribute-system',
            title: '朝贡体系',
            category: '外交',
            description: '古代中国的外交体系',
            imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=500&fit=crop',
            color: '#F97316',
            relatedEvents: 7,
        },
        {
            id: 'yellow-river',
            title: '黄河变迁',
            category: '地理',
            description: '黄河河道的历史变迁',
            imageUrl: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=800&h=500&fit=crop',
            color: '#6366F1',
            relatedEvents: 9,
        },
        {
            id: 'tianxia',
            title: '天下一统',
            category: '统一',
            description: '中国历史上三次大一统',
            imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=500&fit=crop',
            color: '#D946EF',
            relatedEvents: 3,
        },
        {
            id: 'cultural-exchange',
            title: '文化交流',
            category: '文化',
            description: '古代中外文化交流路线',
            imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=500&fit=crop',
            color: '#0EA5E9',
            relatedEvents: 11,
        },
        {
            id: 'economic-centers',
            title: '经济中心',
            category: '经济',
            description: '古代中国经济中心南移',
            imageUrl: 'https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&h=500&fit=crop',
            color: '#84CC16',
            relatedEvents: 8,
        },
    ];

    const categories = ['全部', '战争', '贸易', '军事', '工程', '政治', '文化', '外交', '地理', '统一', '经济'];

    const filteredMaps = selectedCategory
        ? topicMaps.filter(map => map.category === selectedCategory)
        : topicMaps;

    const handleMapPress = (map: TopicMap) => {
        router.push('/historical-maps/detail', { id: map.id, type: 'topic' });
    };

    const renderMapCard = (map: TopicMap) => (
        <TouchableOpacity
            key={map.id}
            style={styles.mapCard}
            onPress={() => handleMapPress(map)}
            activeOpacity={0.7}
        >
            <View style={styles.mapImageContainer}>
                <Image
                    source={{ uri: map.imageUrl }}
                    style={styles.mapImage}
                    resizeMode="cover"
                />
                <View style={[styles.categoryBadge, { backgroundColor: map.color }]}>
                    <ThemedText variant="tiny" color="#FFFFFF">
                        {map.category}
                    </ThemedText>
                </View>
            </View>
            <View style={styles.mapContent}>
                <ThemedText variant="h4" color={theme.textPrimary}>
                    {map.title}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.mapDescription}>
                    {map.description}
                </ThemedText>
                <View style={styles.mapFooter}>
                    <View style={styles.eventCount}>
                        <FontAwesome6 name="timeline" size={12} color={theme.textMuted} />
                        <ThemedText variant="caption" color={theme.textMuted}>
                            {map.relatedEvents} 个相关事件
                        </ThemedText>
                    </View>
                    <FontAwesome6 name="arrow-right" size={14} color={map.color} />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <ThemedView level="root" style={styles.header}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <ThemedText variant="h2" color={theme.textPrimary}>
                            专题地图
                        </ThemedText>
                        <View style={styles.placeholder} />
                    </View>
                    <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
                        战争、经济、文化等专题地图
                    </ThemedText>
                </ThemedView>

                {/* Category Filter */}
                <View style={styles.filterContainer}>
                    {categories.map(category => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.filterChip,
                                selectedCategory === category && styles.filterChipActive,
                                selectedCategory === category && { backgroundColor: theme.primary }
                            ]}
                            onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
                        >
                            <ThemedText
                                variant="small"
                                color={selectedCategory === category ? theme.buttonPrimaryText : theme.textSecondary}
                            >
                                {category}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Maps Grid */}
                <View style={styles.mapsGrid}>
                    {filteredMaps.map(renderMapCard)}
                </View>
            </ScrollView>
        </Screen>
    );
}

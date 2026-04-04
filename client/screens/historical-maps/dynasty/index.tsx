import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import {createStyles} from './styles';


interface DynastyMap {
    id: string;
    title: string;
    years: string;
    description: string;
    imageUrl: string;
    color: string;
}

export default function DynastyMapsScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();

    const [selectedDynasty, setSelectedDynasty] = useState<string | null>(null);

    const dynastyMaps: DynastyMap[] = [
        {
            id: 'qin',
            title: '秦朝',
            years: '公元前221年 - 公元前207年',
            description: '统一六国后的大一统疆域',
            imageUrl: 'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=800&h=500&fit=crop',
            color: '#EF4444',
        },
        {
            id: 'western-han',
            title: '西汉',
            years: '公元前202年 - 公元8年',
            description: '汉武帝开疆拓土，丝绸之路开辟',
            imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=500&fit=crop',
            color: '#F59E0B',
        },
        {
            id: 'eastern-han',
            title: '东汉',
            years: '公元25年 - 公元220年',
            description: '光武中兴，班超经营西域',
            imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=500&fit=crop',
            color: '#EAB308',
        },
        {
            id: 'three-kingdoms',
            title: '三国',
            years: '公元220年 - 公元280年',
            description: '魏蜀吴三足鼎立',
            imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=500&fit=crop',
            color: '#4F46E5',
        },
        {
            id: 'jin',
            title: '晋朝',
            years: '公元265年 - 公元420年',
            description: '西晋短暂统一与东晋偏安',
            imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop',
            color: '#0891B2',
        },
        {
            id: 'sui',
            title: '隋朝',
            years: '公元581年 - 公元618年',
            description: '再次大一统与大运河',
            imageUrl: 'https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&h=500&fit=crop',
            color: '#10B981',
        },
        {
            id: 'tang',
            title: '唐朝',
            years: '公元618年 - 公元907年',
            description: '盛唐时期疆域扩张',
            imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=500&fit=crop',
            color: '#8B5CF6',
        },
        {
            id: 'song',
            title: '宋朝',
            years: '公元960年 - 公元1279年',
            description: '北宋与南宋的版图',
            imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=500&fit=crop',
            color: '#EC4899',
        },
        {
            id: 'yuan',
            title: '元朝',
            years: '公元1271年 - 公元1368年',
            description: '蒙古帝国与四大汗国',
            imageUrl: 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=800&h=500&fit=crop',
            color: '#F97316',
        },
    ];

    const filteredMaps = selectedDynasty
        ? dynastyMaps.filter(map => map.id === selectedDynasty)
        : dynastyMaps;

    const dynasties = ['全部', '秦', '西汉', '东汉', '三国', '晋', '隋', '唐', '宋', '元'];

    const handleMapPress = (map: DynastyMap) => {
        // 跳转到地图详情页，可以在这里添加更详细的交互
        router.push('/historical-maps/detail', { id: map.id, type: 'dynasty' });
    };

    const renderMapCard = (map: DynastyMap) => (
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
                <View style={[styles.mapBadge, { backgroundColor: map.color }]}>
                    <ThemedText variant="tiny" color="#FFFFFF">
                        {map.title}
                    </ThemedText>
                </View>
            </View>
            <View style={styles.mapContent}>
                <View style={styles.mapHeader}>
                    <ThemedText variant="h4" color={theme.textPrimary}>
                        {map.title}
                    </ThemedText>
                    <FontAwesome6 name="expand" size={14} color={map.color} />
                </View>
                <ThemedText variant="caption" color={map.color} style={styles.mapYears}>
                    {map.years}
                </ThemedText>
                <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2}>
                    {map.description}
                </ThemedText>
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
                            历朝地图
                        </ThemedText>
                        <View style={styles.placeholder} />
                    </View>
                    <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
                        按朝代查看历史地图演变
                    </ThemedText>
                </ThemedView>

                {/* Dynasty Filter */}
                <View style={styles.filterContainer}>
                    {dynasties.map(dynasty => (
                        <TouchableOpacity
                            key={dynasty}
                            style={[
                                styles.filterChip,
                                selectedDynasty === dynasty && styles.filterChipActive,
                                selectedDynasty === dynasty && { backgroundColor: theme.primary }
                            ]}
                            onPress={() => setSelectedDynasty(selectedDynasty === dynasty ? null : dynasty)}
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

                {/* Maps Grid */}
                <View style={styles.mapsGrid}>
                    {filteredMaps.map(renderMapCard)}
                </View>
            </ScrollView>
        </Screen>
    );
}

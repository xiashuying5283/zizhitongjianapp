import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface GeoItem {
    id: number;
    name: string;
    slug: string;
    category: string | null;
    level: string | null;
    dynasty: string | null;
    location: string | null;
    description: string | null;
    aliases: string[] | null;
    stroke_count: number | null;
}

export default function GeographyScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();

    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState<GeoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const categoryColors: Record<string, string> = {
        '州郡': '#059669',
        '山川': '#0891B2',
        '关隘': '#D97706',
        '宫殿': '#7C3AED',
        '陵墓': '#6B7280',
        '城塞': '#DC2626',
        '津渡': '#2563EB',
        '驿站': '#EA580C',
        '其他': '#9CA3AF',
    };

    const fetchData = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
        try {
            if (refresh) {
                setRefreshing(true);
            } else if (pageNum === 1) {
                setLoading(true);
            }

            const params: string[] = [`page=${pageNum}`, `limit=50`];
            if (searchQuery) params.push(`name=${encodeURIComponent(searchQuery)}`);

            /**
             * 服务端文件：server/src/routes/geography.ts
             * 接口：GET /api/v1/geography
             * Query 参数：page?: number, limit?: number, name?: string
             */
            const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/geography?${params.join('&')}`);
            const data = await res.json();

            if (data.success) {
                const newItems = data.data.items || [];
                if (pageNum === 1) {
                    setItems(newItems);
                } else {
                    setItems(prev => [...prev, ...newItems]);
                }
                setHasMore(pageNum < data.data.totalPages);
            }
        } catch (error) {
            console.error('获取地理数据失败:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    const handleSearch = (text: string) => {
        setSearchText(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setSearchQuery(text);
            setPage(1);
        }, 300);
    };

    const handleItemPress = (id: number) => {
        router.push('/geography-detail', { id });
    };

    const handleLoadMore = () => {
        if (hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchData(nextPage);
        }
    };

    const handleRefresh = () => {
        setPage(1);
        fetchData(1, true);
    };

    const renderItem = ({ item }: { item: GeoItem }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => handleItemPress(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.itemMain}>
                <View style={styles.itemLeft}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary}>{item.name}</ThemedText>
                    {item.location && (
                        <ThemedText variant="caption" color={theme.textMuted}>{item.location}</ThemedText>
                    )}
                </View>
                <View style={styles.itemRight}>
                    {item.category && (
                        <View style={[styles.categoryTag, { backgroundColor: (categoryColors[item.category] || theme.textMuted) + '20' }]}>
                            <ThemedText variant="tiny" color={categoryColors[item.category] || theme.textMuted}>
                                {item.category}
                            </ThemedText>
                        </View>
                    )}
                    <FontAwesome6 name="chevron-right" size={12} color={theme.textMuted} />
                </View>
            </View>
            {item.description && (
                <ThemedText variant="caption" color={theme.textSecondary} numberOfLines={2} style={styles.itemDesc}>
                    {item.description}
                </ThemedText>
            )}
        </TouchableOpacity>
    );

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            {/* Header */}
            <ThemedView level="root" style={styles.header}>
                <View style={styles.headerRow}>
                    <View>
                        <ThemedText variant="h2" color={theme.textPrimary}>地理数据</ThemedText>
                        <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
                            资治通鉴州郡山川关隘
                        </ThemedText>
                    </View>
                </View>
            </ThemedView>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBox, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                    <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="搜索地名..."
                        placeholderTextColor={theme.textMuted}
                        value={searchText}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            {/* List */}
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.listContent}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                ListFooterComponent={hasMore ? (
                    <View style={styles.loadingMore}>
                        <ThemedText variant="small" color={theme.textMuted}>加载更多...</ThemedText>
                    </View>
                ) : null}
            />
        </Screen>
    );
}

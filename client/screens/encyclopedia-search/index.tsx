import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface SearchResult {
    id: number;
    name: string;
    type: 'character' | 'geography' | 'title';
    subtitle: string;
    dynasty?: string;
    category?: string;
}

export default function EncyclopediaSearchScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();
    const params = useSafeSearchParams<{ query?: string }>();

    const [searchText, setSearchText] = useState(params.query || '');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const typeConfig = useMemo(() => ({
        character: { label: '人物', color: theme.primary, icon: 'user', route: '/character-detail' },
        geography: { label: '地理', color: '#0891B2', icon: 'mountain-sun', route: '/geography-detail' },
        title: { label: '官职', color: '#7C3AED', icon: 'scroll', route: '/encyclopedia-detail' },
    }), [theme.primary]);

    const doSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const allResults: SearchResult[] = [];

            /**
             * 服务端文件：server/src/routes/characters.ts
             * 接口：GET /api/v1/characters
             * Query 参数：search?: string, limit?: number
             */
            const charRes = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/characters?search=${encodeURIComponent(query)}&limit=10`);
            const charData = await charRes.json();
            if (charData.success && charData.data?.items) {
                charData.data.items.forEach((item: any) => {
                    allResults.push({
                        id: item.id,
                        name: item.name,
                        type: 'character',
                        subtitle: [item.dynasty, item.title].filter(Boolean).join(' · ') || '历史人物',
                        dynasty: item.dynasty,
                    });
                });
            }

            /**
             * 服务端文件：server/src/routes/geography.ts
             * 接口：GET /api/v1/geography
             * Query 参数：name?: string, limit?: number
             */
            const geoRes = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/geography?name=${encodeURIComponent(query)}&limit=10`);
            const geoData = await geoRes.json();
            if (geoData.success && geoData.data?.items) {
                geoData.data.items.forEach((item: any) => {
                    allResults.push({
                        id: item.id,
                        name: item.name,
                        type: 'geography',
                        subtitle: [item.category, item.location].filter(Boolean).join(' · ') || '地理名称',
                        category: item.category,
                    });
                });
            }

            /**
             * 服务端文件：server/src/routes/encyclopedia.ts
             * 接口：GET /api/v1/encyclopedia/titles
             * Query 参数：search?: string, limit?: number
             */
            const titleRes = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/titles?search=${encodeURIComponent(query)}&limit=10`);
            const titleData = await titleRes.json();
            if (titleData.success && titleData.data?.items) {
                titleData.data.items.forEach((item: any) => {
                    allResults.push({
                        id: item.id,
                        name: item.name,
                        type: 'title',
                        subtitle: [item.dynasty, item.category].filter(Boolean).join(' · ') || '官职',
                        dynasty: item.dynasty,
                    });
                });
            }

            setResults(allResults);
        } catch (error) {
            console.error('搜索失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (params.query) {
            doSearch(params.query);
        }
    }, []);

    const handleSearch = (text: string) => {
        setSearchText(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            doSearch(text);
        }, 400);
    };

    const handleResultPress = (item: SearchResult) => {
        const config = typeConfig[item.type];
        router.push(config.route, { id: item.id });
    };

    const groupedResults = useMemo(() => {
        const groups: { type: keyof typeof typeConfig; items: SearchResult[] }[] = [];
        (['character', 'geography', 'title'] as const).forEach(type => {
            const items = results.filter(r => r.type === type);
            if (items.length > 0) {
                groups.push({ type, items });
            }
        });
        return groups;
    }, [results]);

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBox, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                    <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="搜索人物、地理、官职..."
                        placeholderTextColor={theme.textMuted}
                        value={searchText}
                        onChangeText={handleSearch}
                        autoFocus
                        returnKeyType="search"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchText(''); setResults([]); setSearched(false); }}>
                            <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : searched && results.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FontAwesome6 name="face-meh" size={48} color={theme.textMuted} />
                    <ThemedText variant="h4" color={theme.textSecondary} style={styles.emptyTitle}>
                        未找到相关结果
                    </ThemedText>
                    <ThemedText variant="body" color={theme.textMuted} style={styles.emptySubtitle}>
                        试试其他关键词
                    </ThemedText>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                    {groupedResults.map(group => {
                        const config = typeConfig[group.type];
                        return (
                            <View key={group.type}>
                                <View style={styles.sectionHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                                        <FontAwesome6 name={config.icon as any} size={14} color={config.color} />
                                        <ThemedText variant="labelSmall" color={theme.textSecondary}>
                                            {config.label} ({group.items.length})
                                        </ThemedText>
                                    </View>
                                </View>
                                {group.items.map(item => (
                                    <TouchableOpacity
                                        key={`${item.type}-${item.id}`}
                                        style={styles.resultCard}
                                        onPress={() => handleResultPress(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.resultIcon, { backgroundColor: config.color + '15' }]}>
                                            <FontAwesome6 name={typeConfig[item.type].icon as any} size={18} color={config.color} />
                                        </View>
                                        <View style={styles.resultContent}>
                                            <ThemedText variant="smallMedium" color={theme.textPrimary}>{item.name}</ThemedText>
                                            <ThemedText variant="caption" color={theme.textMuted}>{item.subtitle}</ThemedText>
                                        </View>
                                        <FontAwesome6 name="chevron-right" size={12} color={theme.textMuted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </Screen>
    );
}

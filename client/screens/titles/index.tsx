import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface Title {
    id: number;
    name: string;
    dynasty: string;
    description: string;
    aliases?: string[];
}

interface Era {
    name: string;
    count: number;
}

export default function TitlesScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();

    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEra, setSelectedEra] = useState<string | null>(null);
    const [titles, setTitles] = useState<Title[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterExpanded, setFilterExpanded] = useState(false);

    const dynasties: Era[] = [
        { name: '汉代', count: 367 },
        { name: '唐代', count: 156 },
        { name: '宋代', count: 98 },
        { name: '魏晋', count: 89 },
        { name: '隋代', count: 45 },
    ];

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            /**
             * 服务端文件：server/src/routes/encyclopedia.ts
             * 接口：GET /api/v1/encyclopedia/titles
             * Query 参数：search?: string, dynasty?: string, category?: string, limit?: number, offset?: number
             */
            const params = new URLSearchParams({
                limit: '50',
                offset: '0',
            });

            if (selectedEra) {
                params.append('dynasty', selectedEra);
            }
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const response = await fetch(
                `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/titles?${params}`
            );

            const result = await response.json();

            if (result.success) {
                setTitles(result.data?.titles || []);
            }
        } catch (error) {
            console.error('获取官职列表失败:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedEra, searchQuery]);

    React.useEffect(() => {
        fetchData();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const handleRefresh = () => {
        fetchData();
    };

    const handleSearch = () => {
        setSearchQuery(searchText);
    };

    const handleEraSelect = (era: string | null) => {
        setSelectedEra(era === selectedEra ? null : era);
    };

    const handleTitlePress = (id: number, name: string) => {
        router.push('/encyclopedia-detail', { type: 'title', name });
    };

    const filteredTitles = useMemo(() => {
        if (!searchQuery) return titles;
        const query = searchQuery.toLowerCase();
        return titles.filter(
            title =>
                title.name.toLowerCase().includes(query) ||
                title.description.toLowerCase().includes(query) ||
                (Array.isArray(title.aliases) && title.aliases.some(alias => alias.toLowerCase().includes(query)))
        );
    }, [titles, searchQuery]);

    const renderTitle = ({ item }: { item: Title }) => (
        <TouchableOpacity
            style={styles.titleCard}
            onPress={() => handleTitlePress(item.id, item.name)}
            activeOpacity={0.7}
        >
            <View style={styles.titleInfo}>
                <View style={styles.titleHeader}>
                    <ThemedText variant="h4" color={theme.textPrimary}>
                        {item.name}
                    </ThemedText>
                    {item.dynasty && (
                        <View style={styles.eraTag}>
                            <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                                {item.dynasty}
                            </ThemedText>
                        </View>
                    )}
                </View>
                {item.description && (
                    <ThemedText variant="small" color={theme.textMuted} numberOfLines={2} style={styles.titleSummary}>
                        {item.description}
                    </ThemedText>
                )}
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
        </TouchableOpacity>
    );

    const renderDynastyItem = (era: Era) => (
        <TouchableOpacity
            key={era.name}
            style={[
                styles.eraChip,
                selectedEra === era.name && styles.eraChipActive,
            ]}
            onPress={() => handleEraSelect(era.name)}
        >
            <ThemedText
                variant="small"
                color={selectedEra === era.name ? theme.buttonPrimaryText : theme.textSecondary}
            >
                {era.name} ({era.count})
            </ThemedText>
        </TouchableOpacity>
    );

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            {/* Header */}
            <ThemedView level="root" style={styles.header}>
                <View style={styles.headerRow}>
                    <View>
                        <ThemedText variant="h2" color={theme.textPrimary}>官职</ThemedText>
                        <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
                            历代官职与品级制度
                        </ThemedText>
                    </View>
                </View>
            </ThemedView>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="搜索官职名称..."
                    placeholderTextColor={theme.textMuted}
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchText(''); setSearchQuery(''); }}>
                        <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Era Filter */}
            <View style={styles.filterSection}>
                <TouchableOpacity
                    style={styles.filterHeader}
                    onPress={() => setFilterExpanded(!filterExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.filterHeaderLeft}>
                        <ThemedText variant="smallMedium" color={theme.textSecondary}>
                            按朝代筛选
                        </ThemedText>
                        {selectedEra && (
                            <View style={styles.selectedEraTag}>
                                <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                                    {selectedEra}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                    <FontAwesome6
                        name={filterExpanded ? "chevron-up" : "chevron-down"}
                        size={12}
                        color={theme.textMuted}
                    />
                </TouchableOpacity>

                {filterExpanded && (
                    <View style={styles.eraContainer}>
                        <TouchableOpacity
                            style={[styles.eraChip, !selectedEra && styles.eraChipActive]}
                            onPress={() => handleEraSelect(null)}
                        >
                            <ThemedText
                                variant="small"
                                color={!selectedEra ? theme.buttonPrimaryText : theme.textSecondary}
                            >
                                全部
                            </ThemedText>
                        </TouchableOpacity>
                        {dynasties.map(era => renderDynastyItem(era))}
                    </View>
                )}
            </View>

            {/* Titles List */}
            <FlatList
                data={filteredTitles}
                renderItem={renderTitle}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[theme.primary]}
                        tintColor={theme.primary}
                    />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <FontAwesome6 name="scroll" size={48} color={theme.textMuted} />
                            <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                                {searchQuery ? '未找到匹配的官职' : '暂无官职数据'}
                            </ThemedText>
                        </View>
                    ) : null
                }
            />
        </Screen>
    );
}

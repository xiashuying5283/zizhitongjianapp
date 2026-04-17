import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface GeoDetail {
    id: number;
    name: string;
    slug: string;
    aliases: string[] | null;
    category: string | null;
    level: string | null;
    dynasty: string | null;
    location: string | null;
    lng: string | null;
    lat: string | null;
    description: string | null;
}

export default function GeographyDetailScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();
    const params = useSafeSearchParams<{ id: number }>();

    const [detail, setDetail] = useState<GeoDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!params.id) return;
        try {
            setLoading(true);
            /**
             * 服务端文件：server/src/routes/geography.ts
             * 接口：GET /api/v1/geography/:id
             * Path 参数：id: number
             */
            const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/geography/${params.id}`);
            const data = await res.json();
            if (data.success) {
                setDetail(data.data);
            }
        } catch (error) {
            console.error('获取地理详情失败:', error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    if (loading) {
        return (
            <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </Screen>
        );
    }

    if (!detail) {
        return (
            <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
                <View style={styles.loadingContainer}>
                    <ThemedText variant="body" color={theme.textMuted}>未找到该地理数据</ThemedText>
                </View>
            </Screen>
        );
    }

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            {/* Header */}
            <ThemedView level="root" style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
                <ThemedText variant="title" color={theme.textPrimary}>地理详情</ThemedText>
                <View style={{ width: 40 }} />
            </ThemedView>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* 主信息卡片 */}
                <View style={styles.mainCard}>
                    {detail.category && (
                        <View style={[styles.categoryBadge, { backgroundColor: (categoryColors[detail.category] || theme.primary) + '20' }]}>
                            <ThemedText variant="caption" color={categoryColors[detail.category] || theme.primary}>
                                {detail.category}
                            </ThemedText>
                        </View>
                    )}

                    <ThemedText variant="h2" color={theme.textPrimary} style={styles.nameText}>
                        {detail.name}
                    </ThemedText>

                    {/* 元信息 */}
                    <View style={styles.metaSection}>
                        {detail.aliases && detail.aliases.length > 0 && (
                            <View style={styles.metaRow}>
                                <ThemedText variant="small" color={theme.textMuted}>别名</ThemedText>
                                <View style={styles.aliasesContainer}>
                                    {detail.aliases.map((alias, idx) => (
                                        <View key={idx} style={styles.aliasTag}>
                                            <ThemedText variant="small" color={theme.textSecondary}>{alias}</ThemedText>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {detail.dynasty && (
                            <View style={styles.metaRow}>
                                <ThemedText variant="small" color={theme.textMuted}>朝代</ThemedText>
                                <ThemedText variant="small" color={theme.textSecondary}>{detail.dynasty}</ThemedText>
                            </View>
                        )}

                        {detail.location && (
                            <View style={styles.metaRow}>
                                <ThemedText variant="small" color={theme.textMuted}>今地</ThemedText>
                                <ThemedText variant="small" color={theme.textSecondary}>{detail.location}</ThemedText>
                            </View>
                        )}
                    </View>
                </View>

                {/* 介绍卡片 */}
                {detail.description ? (
                    <View style={styles.descCard}>
                        <ThemedText variant="h4" color={theme.textPrimary} style={styles.cardTitle}>
                            简介
                        </ThemedText>
                        <ThemedText variant="body" color={theme.textSecondary} style={styles.descText}>
                            {detail.description}
                        </ThemedText>
                    </View>
                ) : (
                    <View style={styles.descCard}>
                        <ThemedText variant="body" color={theme.textMuted} style={{ textAlign: 'center', paddingVertical: 20 }}>
                            暂无介绍
                        </ThemedText>
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
}

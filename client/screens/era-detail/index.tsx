import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { styles, COLORS } from './styles';

interface EraEvent {
    eraYear: string;
    year: string;
    desc: string;
}

interface EraDetail {
    era_name: string;
    emperor_name: string;
    dynasty: string;
    startYear: number;
    endYear: number;
    yearCount: number;
    background: string;
    events: EraEvent[];
}

// 格式化年份
const formatYear = (year: number): string => {
    if (year < 0) {
        return `公元前${Math.abs(year)}年`;
    }
    return `公元${year}年`;
};

export default function EraDetailScreen() {
    const router = useSafeRouter();
    const params = useSafeSearchParams();

    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<EraDetail | null>(null);

    // 从URL参数获取基本信息
    const eraName = (params as any).eraName || '';
    const emperorName = (params as any).emperorName || '';

    useEffect(() => {
        const fetchDetail = async () => {
            if (!eraName) {
                setLoading(false);
                return;
            }

            try {
                /**
                 * 服务端文件：server/src/routes/encyclopedia.ts
                 * 接口：GET /api/v1/encyclopedia/era-years/detail
                 * Query参数：eraName: string, emperorName?: string
                 */
                let url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/encyclopedia/era-years/detail?eraName=${encodeURIComponent(eraName)}`;
                if (emperorName) {
                    url += `&emperorName=${encodeURIComponent(emperorName)}`;
                }

                const response = await fetch(url);
                const result = await response.json();

                if (result.success && result.data) {
                    setDetail(result.data);
                } else {
                    // API 返回失败时，使用基本信息构造
                    setDetail({
                        era_name: eraName,
                        emperor_name: emperorName || (params as any).emperorName || '',
                        dynasty: (params as any).dynasty || '',
                        startYear: parseInt((params as any).startYear || '0'),
                        endYear: parseInt((params as any).endYear || '0'),
                        yearCount: parseInt((params as any).yearCount || '0'),
                        background: `${eraName}是${(params as any).dynasty || ''}${emperorName || ''}時期的年號。`,
                        events: []
                    });
                }
            } catch (error) {
                console.error('获取年号详情失败:', error);
                // 网络错误时，使用基本信息构造
                setDetail({
                    era_name: eraName,
                    emperor_name: emperorName || '',
                    dynasty: (params as any).dynasty || '',
                    startYear: parseInt((params as any).startYear || '0'),
                    endYear: parseInt((params as any).endYear || '0'),
                    yearCount: parseInt((params as any).yearCount || '0'),
                    background: `${eraName}是${(params as any).dynasty || ''}${emperorName || ''}時期的年號。`,
                    events: []
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [eraName, emperorName]);

    if (loading) {
        return (
            <Screen backgroundColor={COLORS.background} statusBarStyle="dark">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </Screen>
        );
    }

    if (!detail) {
        return (
            <Screen backgroundColor={COLORS.background} statusBarStyle="dark">
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <FontAwesome6 name="chevron-left" size={24} color={COLORS.textPrimary} />
                        <Text style={styles.backText}>返回</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>暫無數據</Text>
                </View>
            </Screen>
        );
    }

    return (
        <Screen backgroundColor={COLORS.background} statusBarStyle="dark">
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <FontAwesome6 name="chevron-left" size={28} color={COLORS.textPrimary} />
                    <Text style={styles.backText}>返回</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Hero Title */}
                <View style={styles.titleSection}>
                    {/* 背景大字水印效果 */}
                    <Text style={styles.watermark}>{detail.era_name[0]}</Text>

                    {/* 年号标题 */}
                    <Text style={styles.title}>{detail.era_name}</Text>

                    {/* 朝代 + 帝王 标签 */}
                    <View style={styles.tagContainer}>
                        <Text style={styles.tagDynasty}>{detail.dynasty}</Text>
                        <Text style={styles.tagDot}> • </Text>
                        <Text style={styles.tagEmperor}>{detail.emperor_name}</Text>
                    </View>
                </View>

                {/* Quick Info Cards */}
                <View style={styles.infoCards}>
                    {/* 存续时间 */}
                    <View style={styles.infoCard}>
                        <FontAwesome6 name="clock" size={20} color={COLORS.textHint} />
                        <Text style={styles.infoLabel}>存续时间</Text>
                        <Text style={styles.infoValue}>共 {detail.yearCount} 年</Text>
                    </View>

                    {/* 公历起止 */}
                    <View style={styles.infoCard}>
                        <FontAwesome6 name="arrows-left-right" size={20} color={COLORS.textHint} />
                        <Text style={styles.infoLabel}>公历起止</Text>
                        <Text style={styles.infoValueSmall}>
                            {formatYear(detail.startYear)}{'\n'}至 {formatYear(detail.endYear)}
                        </Text>
                    </View>
                </View>

                {/* 背景简述 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <FontAwesome6 name="book-open" size={18} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>背景简述</Text>
                    </View>
                    <Text style={styles.sectionContent}>
                        {detail.background || '暂无详细背景记录。'}
                    </Text>
                </View>

                {/* 重大纪事 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <FontAwesome6 name="flag" size={18} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>重大纪事</Text>
                    </View>

                    {detail.events && detail.events.length > 0 ? (
                        <View style={styles.timeline}>
                            {detail.events.map((evt, idx) => (
                                <View key={idx} style={styles.timelineItem}>
                                    {/* 时间线圆点 */}
                                    <View style={styles.timelineDot} />

                                    {/* 年份标签行 */}
                                    <View style={styles.timelineTags}>
                                        {evt.eraYear && (
                                            <View style={styles.eraYearBadge}>
                                                <Text style={styles.eraYearText}>{evt.eraYear}</Text>
                                            </View>
                                        )}
                                        <View style={styles.yearBadge}>
                                            <Text style={styles.yearText}>{evt.year}</Text>
                                        </View>
                                    </View>

                                    {/* 事件描述 */}
                                    <Text style={styles.timelineDesc}>{evt.desc}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyEvents}>
                            <Text style={styles.emptyEventsText}>暂无录入该年号的具体纪事</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 48 }} />
            </ScrollView>
        </Screen>
    );
}

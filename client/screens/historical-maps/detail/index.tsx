import React, { useMemo, useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Dimensions, Platform, TouchableOpacity, Modal } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { GeoJsonMap, FullscreenGeoJsonMap } from '@/components/GeoJsonMap';
import { createStyles } from './styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 地图文件路径配置
const mapFilePaths: Record<string, any> = {
    'western-han': require('@/assets/maps/dynasty/western-han.json'),
    'jin': require('@/assets/maps/dynasty/jin.json'),
};

interface MapDetail {
    id: string;
    title: string;
    years: string;
    description: string;
    color: string;
    fullDescription?: string;
    hasLocalMap?: boolean;
}

const dynastyMapData: Record<string, MapDetail> = {
    'qin': {
        id: 'qin',
        title: '秦朝',
        years: '公元前221年 - 公元前207年',
        description: '统一六国后的大一统疆域',
        color: '#EF4444',
        fullDescription: '秦朝是中国历史上第一个大一统王朝，秦始皇统一六国后建立了中央集权制度。疆域东至大海，西至陇西，北至长城，南至南海。',
    },
    'han': {
        id: 'han',
        title: '汉朝',
        years: '公元前202年 - 公元220年',
        description: '西汉与东汉的疆域变迁',
        color: '#F59E0B',
        fullDescription: '汉朝分为西汉和东汉两个时期，是中国历史上最强盛的朝代之一。汉武帝时期开疆拓土，疆域达到极盛，丝绸之路在此时期开辟。',
    },
    'western-han': {
        id: 'western-han',
        title: '西汉',
        years: '公元前202年 - 公元8年',
        description: '西汉时期的疆域版图',
        color: '#F59E0B',
        fullDescription: '西汉是刘邦建立的统一王朝，定都长安。汉武帝时期国力强盛，北击匈奴，西通西域，疆域空前辽阔。张骞通西域开辟了著名的丝绸之路。',
        hasLocalMap: true,
    },
    'eastern-han': {
        id: 'eastern-han',
        title: '东汉',
        years: '公元25年 - 公元220年',
        description: '东汉时期的疆域版图',
        color: '#EAB308',
        fullDescription: '东汉由光武帝刘秀建立，定都洛阳。东汉时期，匈奴分裂，西域都护府重建，丝绸之路继续繁荣。班超经营西域，使汉朝影响力远及中亚。',
    },
    'three-kingdoms': {
        id: 'three-kingdoms',
        title: '三国',
        years: '公元220年 - 公元280年',
        description: '魏蜀吴三足鼎立',
        color: '#4F46E5',
        fullDescription: '三国时期是中国历史上的一段分裂时期，分为曹魏、蜀汉、东吴三个政权。魏国据中原，蜀汉据益州，东吴据江东。这一时期英雄辈出。',
    },
    'jin': {
        id: 'jin',
        title: '晋朝',
        years: '公元265年 - 公元420年',
        description: '西晋短暂统一与东晋偏安',
        color: '#0891B2',
        fullDescription: '晋朝分为西晋和东晋两个时期。西晋短暂统一后迅速衰落，永嘉之乱后晋室南渡，东晋偏安江南，北方进入五胡十六国的混乱时期。',
        hasLocalMap: true,
    },
    'sui': {
        id: 'sui',
        title: '隋朝',
        years: '公元581年 - 公元618年',
        description: '再次大一统与大运河',
        color: '#10B981',
        fullDescription: '隋朝结束了南北朝的分裂局面，重新统一中国。隋炀帝修建的大运河成为连接南北的重要水道。',
    },
    'tang': {
        id: 'tang',
        title: '唐朝',
        years: '公元618年 - 公元907年',
        description: '盛唐时期疆域扩张',
        color: '#8B5CF6',
        fullDescription: '唐朝是中国历史上最强盛的朝代之一，政治、经济、文化都达到了顶峰。疆域东至朝鲜半岛，西至中亚咸海，北至贝加尔湖，南至越南。',
    },
    'song': {
        id: 'song',
        title: '宋朝',
        years: '公元960年 - 公元1279年',
        description: '北宋与南宋的版图',
        color: '#EC4899',
        fullDescription: '宋朝分为北宋和南宋两个时期，虽然军事上较弱，但经济文化高度发达。北宋时期商业繁荣，南宋时期海外贸易兴盛。',
    },
    'yuan': {
        id: 'yuan',
        title: '元朝',
        years: '公元1271年 - 公元1368年',
        description: '蒙古帝国与四大汗国',
        color: '#F97316',
        fullDescription: '元朝是由蒙古族建立的统一王朝，疆域横跨欧亚大陆，是中国历史上版图最大的朝代。忽必烈建立元朝后，设中书省和十个行中书省，奠定了中国省级行政区划的基础。',
    },
};

export default function MapDetailScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const router = useSafeRouter();
    const params = useSafeSearchParams<{ id: string; type: string }>();
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const mapDetail = params.id ? dynastyMapData[params.id] : null;

    useEffect(() => {
        console.log('useEffect: 加载地图:', mapDetail?.id, 'hasLocalMap:', mapDetail?.hasLocalMap);
        if (mapDetail?.hasLocalMap) {
            setLoading(true);
            // 动态加载 GeoJSON 文件
            const loadMap = async () => {
                try {
                    let data;
                    console.log('开始加载文件:', mapDetail.id);
                    if (mapDetail.id === 'western-han') {
                        data = require('@/assets/maps/dynasty/western-han.json');
                    } else if (mapDetail.id === 'jin') {
                        data = require('@/assets/maps/dynasty/jin.json');
                    }
                    console.log('加载成功, features:', data?.features?.length, 'type:', data?.type);
                    console.log('设置 geoJsonData...');
                    setGeoJsonData(data);
                    console.log('setGeoJsonData 调用完成');
                } catch (error) {
                    console.error('加载地图数据失败:', error);
                } finally {
                    setLoading(false);
                    console.log('loading 设置为 false');
                }
            };
            loadMap();
        } else {
            // 如果没有本地地图，清空数据
            setGeoJsonData(null);
        }
    }, [mapDetail?.id]);
    
    // 监控 geoJsonData 变化
    useEffect(() => {
        console.log('geoJsonData 变化:', geoJsonData ? `有数据 (${geoJsonData.features?.length} features)` : 'null');
    }, [geoJsonData]);

    if (!mapDetail) {
        return (
            <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
                <ThemedView level="root" style={styles.container}>
                    <ThemedText variant="h3" color={theme.textPrimary}>
                        地图不存在
                    </ThemedText>
                </ThemedView>
            </Screen>
        );
    }

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                removeClippedSubviews={false}
            >
                {/* Header */}
                <ThemedView level="root" style={styles.header}>
                    <View style={styles.headerRow}>
                        <View style={styles.backButton}>
                            <FontAwesome6
                                name="arrow-left"
                                size={20}
                                color={theme.textPrimary}
                                onPress={() => router.back()}
                            />
                        </View>
                        <ThemedText variant="h2" color={theme.textPrimary}>
                            {mapDetail.title}
                        </ThemedText>
                        <View style={styles.placeholder} />
                    </View>
                </ThemedView>

                {/* Map - 优先显示本地 GeoJSON 地图 */}
                <View style={styles.imageContainer}>
                    {mapDetail.hasLocalMap ? (
                        loading ? (
                            <View style={[styles.mapImage, { justifyContent: 'center', alignItems: 'center' }]}>
                                <ActivityIndicator size="large" color={mapDetail.color} />
                            </View>
                        ) : geoJsonData ? (
                            <>
                                <GeoJsonMap
                                    geoJson={geoJsonData}
                                    width={SCREEN_WIDTH}
                                    height={400}
                                />
                                {/* 全屏按钮 */}
                                <TouchableOpacity 
                                    style={[styles.fullscreenButton, { backgroundColor: mapDetail.color }]}
                                    onPress={() => setIsFullscreen(true)}
                                >
                                    <FontAwesome6 name="expand" size={16} color="#fff" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={[styles.mapImage, { justifyContent: 'center', alignItems: 'center' }]}>
                                <ThemedText color={theme.textMuted}>地图加载失败</ThemedText>
                            </View>
                        )
                    ) : (
                        <View style={[styles.mapImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundCard }]}>
                            <FontAwesome6 name="map" size={64} color={mapDetail.color + '40'} />
                            <ThemedText variant="small" color={theme.textMuted} style={{ marginTop: 12 }}>
                                暂无地图数据
                            </ThemedText>
                        </View>
                    )}
                </View>

                {/* 全屏地图弹窗 */}
                {geoJsonData && isFullscreen && (
                    <Modal
                        visible={isFullscreen}
                        animationType="fade"
                        statusBarTranslucent
                    >
                        <FullscreenGeoJsonMap 
                            geoJson={geoJsonData} 
                            onClose={() => setIsFullscreen(false)} 
                        />
                    </Modal>
                )}

                {/* Info Card */}
                <ThemedView level="card" style={styles.infoCard}>
                    <View style={styles.titleRow}>
                        <ThemedText variant="h3" color={theme.textPrimary}>
                            {mapDetail.title}
                        </ThemedText>
                        <View style={[styles.badge, { backgroundColor: mapDetail.color }]}>
                            <ThemedText variant="tiny" color="#FFFFFF">
                                {mapDetail.years}
                            </ThemedText>
                        </View>
                    </View>

                    <ThemedText variant="body" color={theme.textSecondary} style={styles.description}>
                        {mapDetail.fullDescription || mapDetail.description}
                    </ThemedText>

                    <View style={styles.divider} />

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <FontAwesome6 name="calendar" size={16} color={mapDetail.color} />
                            <ThemedText variant="small" color={theme.textSecondary}>
                                {mapDetail.years}
                            </ThemedText>
                        </View>
                        {mapDetail.hasLocalMap && (
                            <View style={[styles.statItem, { marginLeft: 24 }]}>
                                <FontAwesome6 name="layer-group" size={16} color={mapDetail.color} />
                                <ThemedText variant="small" color={theme.textSecondary}>
                                    矢量地图
                                </ThemedText>
                            </View>
                        )}
                    </View>
                </ThemedView>

                {/* Legend - 如果有 GeoJSON 地图 */}
                {geoJsonData?.features && (
                    <ThemedView level="card" style={styles.infoCard}>
                        <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
                            图例
                        </ThemedText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {Array.from(new Set(geoJsonData.features.map((f: any) => f.properties?.fill))).map((color: any, idx: number) => {
                                const feature = geoJsonData.features.find((f: any) => f.properties?.fill === color);
                                return (
                                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={{ width: 16, height: 16, backgroundColor: color as string, borderRadius: 4 }} />
                                        <ThemedText variant="small" color={theme.textSecondary}>
                                            {feature?.properties?.title?.split('（')[0] || '区域'}
                                        </ThemedText>
                                    </View>
                                );
                            })}
                        </View>
                    </ThemedView>
                )}

                {/* Related Content */}
                <ThemedView level="card" style={styles.infoCard}>
                    <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
                        相关内容
                    </ThemedText>
                    <ThemedText variant="body" color={theme.textMuted}>
                        暂无相关内容
                    </ThemedText>
                </ThemedView>
            </ScrollView>
        </Screen>
    );
}

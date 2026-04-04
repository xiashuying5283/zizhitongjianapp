import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text as RNText, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GeoJSONFeature {
    type: 'Feature';
    properties: {
        title?: string;
        fill?: string;
        stroke?: string;
        'stroke-width'?: number;
        description?: string;
    };
    geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: number[][][] | number[][][][];
    };
}

interface GeoJSONData {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

interface GeoJsonMapProps {
    geoJson: GeoJSONData;
    width?: number;
    height?: number;
    style?: any;
    fullscreen?: boolean;
}

// 四色原理颜色
const FOUR_COLORS = [
    '#A8D5BA',
    '#F5D6BA',
    '#B8D4E8',
    '#E8D4B8',
];

// 清理 title（去掉括号内的年份信息）
function cleanTitle(title: string | undefined): string {
    if (!title) return '';
    // 匹配中文括号或英文括号内包含年份相关信息（数字、"前"、"年"、"-"等）
    return title
        .replace(/（[^）]*\d[^）]*）/g, '')  // 中文括号内包含数字
        .replace(/\([^)]*\d[^)]*\)/g, '')   // 英文括号内包含数字
        .trim();
}

// 计算 bounding box
function getBoundingBox(features: GeoJSONFeature[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const feature of features) {
        const processCoord = (coord: number[]) => {
            const [x, y] = coord;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        };

        if (feature.geometry.type === 'Polygon') {
            for (const ring of feature.geometry.coordinates as number[][][]) {
                ring.forEach(processCoord);
            }
        } else if (feature.geometry.type === 'MultiPolygon') {
            for (const polygon of feature.geometry.coordinates as number[][][][]) {
                for (const ring of polygon) {
                    ring.forEach(processCoord);
                }
            }
        }
    }

    return { minX, minY, maxX, maxY };
}

// 快速四色着色
function fastFourColorAssign(features: GeoJSONFeature[]): string[] {
    const n = features.length;
    const colors: string[] = new Array(n).fill('');
    
    for (let i = 0; i < n; i++) {
        const coords = features[i].geometry.coordinates;
        const ring = Array.isArray(coords[0][0][0]) 
            ? (coords as number[][][][])[0][0] 
            : (coords as number[][][])[0];
        const center = {
            x: ring.reduce((s: number, p: number[]) => s + p[0], 0) / ring.length,
            y: ring.reduce((s: number, p: number[]) => s + p[1], 0) / ring.length,
        };
        const gridX = Math.floor(center.x * 10);
        const gridY = Math.floor(center.y * 10);
        const colorIndex = ((gridX % 2) + (gridY % 2) * 2 + Math.floor(i / 20)) % 4;
        colors[i] = FOUR_COLORS[colorIndex];
    }
    
    return colors;
}

export function GeoJsonMap({ geoJson, width = SCREEN_WIDTH, height = 400, style, fullscreen = false }: GeoJsonMapProps) {
    const { theme } = useTheme();
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const cachedHtmlRef = useRef<string>('');
    const geoJsonKeyRef = useRef<string>('');

    // 生成 GeoJSON 的唯一 key（用于判断内容是否变化）
    const geoJsonKey = useMemo(() => {
        if (!geoJson?.features?.length) return '';
        return `${geoJson.features.length}_${geoJson.features[0]?.properties?.title || ''}`;
    }, [geoJson]);

    // 只在 GeoJSON 内容真正变化时才重新生成 HTML
    const htmlContent = useMemo(() => {
        if (!geoJson?.features?.length) {
            return '';
        }

        // 如果内容没变，返回缓存的 HTML
        if (geoJsonKey && geoJsonKey === geoJsonKeyRef.current && cachedHtmlRef.current) {
            console.log('GeoJsonMap: 使用缓存');
            return cachedHtmlRef.current;
        }

        console.log('GeoJsonMap: 处理', geoJson.features.length, '个 features');

        const bbox = getBoundingBox(geoJson.features);
        const center = [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2];
        const zoom = Math.floor(8 - Math.log2(Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) / 10));

        // 准备 GeoJSON 数据并添加颜色
        const coloredFeatures = geoJson.features.map((feature, index) => {
            const colorIndex = index % 4;
            return {
                ...feature,
                properties: {
                    ...feature.properties,
                    fill: FOUR_COLORS[colorIndex],
                    title: cleanTitle(feature.properties.title),
                },
            };
        });

        const geoJsonStr = JSON.stringify({
            type: 'FeatureCollection',
            features: coloredFeatures,
        });

        // 高德地图 HTML 模板
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>地图</title>
    <style>
        * { margin: 0; padding: 0; }
        html, body, #container { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="container"></div>
    <script>
        window._AMapSecurityConfig = {
            securityJsCode: 'a6ff0afb34a4de47890c39503047ab05',
        }
    </script>
    <script src="https://webapi.amap.com/maps?v=2.0&key=a3bb1977357a9c399687d43ad12e2fa6"></script>
    <script src="https://unpkg.com/@turf/turf@6/turf.min.js"></script>
    <script>
        var map = new AMap.Map('container', {
            zoom: ${Math.max(3, Math.min(10, zoom))},
            center: [${center[0]}, ${center[1]}],
            mapStyle: 'amap://styles/whitesmoke',
            features: ['bg', 'road', 'building'],
            viewMode: '2D'
        });

        var geoJsonData = ${geoJsonStr};

        geoJsonData.features.forEach(function(feature) {
            var coordinates = feature.geometry.coordinates;
            var color = feature.properties.fill || '#A8D5BA';
            var title = feature.properties.title || '';

            if (feature.geometry.type === 'Polygon') {
                var polygon = new AMap.Polygon({
                    path: coordinates[0].map(function(c) { return [c[0], c[1]]; }),
                    fillColor: color,
                    fillOpacity: 0.6,
                    strokeColor: '#8B7355',
                    strokeWeight: 1,
                    strokeOpacity: 0.8
                });
                polygon.setMap(map);
            } else if (feature.geometry.type === 'MultiPolygon') {
                coordinates.forEach(function(poly) {
                    var polygon = new AMap.Polygon({
                        path: poly[0].map(function(c) { return [c[0], c[1]]; }),
                        fillColor: color,
                        fillOpacity: 0.6,
                        strokeColor: '#8B7355',
                        strokeWeight: 1,
                        strokeOpacity: 0.8
                    });
                    polygon.setMap(map);
                });
            }

            if (title) {
                var point = turf.pointOnFeature(feature);
                var coords = point.geometry.coordinates;
                var marker = new AMap.Text({
                    text: title,
                    position: [coords[0], coords[1]],
                    style: {
                        'background-color': 'rgba(255,255,255,0.85)',
                        'border': '1px solid #8B7355',
                        'padding': '2px 4px',
                        'font-size': '10px',
                        'color': '#4A4A4A'
                    },
                    anchor: 'center'
                });
                marker.setMap(map);
            }
        });

        map.setFitView();
        
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage('loaded');
        }
    </script>
</body>
</html>`;

        // 缓存 HTML 和 key
        cachedHtmlRef.current = html;
        geoJsonKeyRef.current = geoJsonKey;

        return html;
    }, [geoJson, geoJsonKey]);

    if (!geoJson?.features?.length) {
        return (
            <View style={[styles.container, { width, height, justifyContent: 'center', alignItems: 'center' }, style]}>
                <ThemedText color="#999">暂无地图数据</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.container, { width, height }, style]}>
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText variant="small" color={theme.textSecondary} style={{ marginTop: 12 }}>
                        加载地图中...
                    </ThemedText>
                </View>
            )}
            <WebView
                key={geoJsonKey || 'empty'}
                ref={webViewRef}
                source={{ html: htmlContent }}
                style={[styles.webview, loading && { opacity: 0 }]}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                onMessage={(event) => {
                    if (event.nativeEvent.data === 'loaded') {
                        setLoading(false);
                    }
                }}
                onError={(e) => {
                    console.error('WebView error:', e.nativeEvent);
                    setLoading(false);
                }}
            />
            {!fullscreen && (
                <View style={styles.legend}>
                    <ThemedText variant="tiny" color="#666">高德地图 · 历史疆域</ThemedText>
                </View>
            )}
        </View>
    );
}

// 全屏地图组件
export function FullscreenGeoJsonMap({ geoJson, onClose }: { geoJson: GeoJSONData; onClose: () => void }) {
    return (
        <View style={styles.fullscreen}>
            <GeoJsonMap geoJson={geoJson} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fullscreen />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <FontAwesome6 name="xmark" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
    },
    webview: {
        flex: 1,
    },
    fullscreen: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F0E6',
    },
    legend: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

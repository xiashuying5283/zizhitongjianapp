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

// 四种颜色（柔和的历史地图风格）
const FOUR_COLORS = [
    '#E8D5B7', // 米黄
    '#B5D8C5', // 青绿
    '#D4B5D8', // 淡紫
    '#B5C8D8', // 天蓝
];

// 边框颜色（对应四种填充色）
const STROKE_COLORS = [
    '#C4A67A', // 深米黄
    '#7BAF8F', // 深青绿
    '#A87FAD', // 深紫
    '#7F9FB5', // 深蓝
];

interface BoundingBox {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
}

/**
 * 获取多边形的边界框
 */
function getBoundingBoxCoords(coordinates: number[][]): BoundingBox {
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    for (const [lon, lat] of coordinates) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
    }

    return { minLon, maxLon, minLat, maxLat };
}

/**
 * 检查两个边界框是否重叠或相邻
 */
function boxesOverlap(a: BoundingBox, b: BoundingBox, tolerance = 0.5): boolean {
    return !(
        a.maxLon < b.minLon - tolerance ||
        a.minLon > b.maxLon + tolerance ||
        a.maxLat < b.minLat - tolerance ||
        a.minLat > b.maxLat + tolerance
    );
}

/**
 * 从几何体中提取所有坐标点
 */
function extractAllCoordinates(geometry: GeoJSONFeature['geometry']): number[][] {
    const coords: number[][] = [];

    if (geometry.type === 'Polygon') {
        const polygon = geometry.coordinates as number[][][];
        coords.push(...polygon[0]);
    } else if (geometry.type === 'MultiPolygon') {
        const multiPolygon = geometry.coordinates as number[][][][];
        for (const polygon of multiPolygon) {
            coords.push(...polygon[0]);
        }
    }

    return coords;
}

/**
 * 检查两条线段是否相交
 */
function segmentsIntersect(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    p4: [number, number]
): boolean {
    const d1 = direction(p3, p4, p1);
    const d2 = direction(p3, p4, p2);
    const d3 = direction(p1, p2, p3);
    const d4 = direction(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }

    return false;
}

function direction(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number]
): number {
    return (p3[0] - p1[0]) * (p2[1] - p1[1]) - (p2[0] - p1[0]) * (p3[1] - p1[1]);
}

/**
 * 从几何体提取所有边界线段
 */
function extractSegments(geometry: GeoJSONFeature['geometry']): Array<[[number, number], [number, number]]> {
    const segments: Array<[[number, number], [number, number]]> = [];

    const processRing = (ring: number[][]) => {
        for (let i = 0; i < ring.length - 1; i++) {
            segments.push([
                [ring[i][0], ring[i][1]],
                [ring[i + 1][0], ring[i + 1][1]]
            ]);
        }
    };

    if (geometry.type === 'Polygon') {
        const polygon = geometry.coordinates as number[][][];
        for (const ring of polygon) {
            processRing(ring);
        }
    } else if (geometry.type === 'MultiPolygon') {
        const multiPolygon = geometry.coordinates as number[][][][];
        for (const polygon of multiPolygon) {
            for (const ring of polygon) {
                processRing(ring);
            }
        }
    }

    return segments;
}

/**
 * 检查两个多边形是否相邻
 * 使用混合策略：先检测点距离，再检测线段相交
 */
function areAdjacent(feature1: GeoJSONFeature, feature2: GeoJSONFeature): boolean {
    const geom1 = feature1.geometry;
    const geom2 = feature2.geometry;

    const coords1 = extractAllCoordinates(geom1);
    const coords2 = extractAllCoordinates(geom2);

    const bbox1 = getBoundingBoxCoords(coords1);
    const bbox2 = getBoundingBoxCoords(coords2);

    // 快速排除：边界框不相交
    if (!boxesOverlap(bbox1, bbox2, 0.5)) {
        return false;
    }

    // 方法1：检测共享边界点（点距离小于阈值）
    const pointTolerance = 0.15; // 约 15km
    for (const p1 of coords1) {
        for (const p2 of coords2) {
            const dist = Math.sqrt(
                Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)
            );
            if (dist < pointTolerance) {
                return true;
            }
        }
    }

    // 方法2：检测线段相交（更精确）
    const segments1 = extractSegments(geom1);
    const segments2 = extractSegments(geom2);

    // 只检测边界框附近的线段
    const margin = 0.5;
    for (const s1 of segments1) {
        // 线段边界框
        const s1MinLon = Math.min(s1[0][0], s1[1][0]) - margin;
        const s1MaxLon = Math.max(s1[0][0], s1[1][0]) + margin;
        const s1MinLat = Math.min(s1[0][1], s1[1][1]) - margin;
        const s1MaxLat = Math.max(s1[0][1], s1[1][1]) + margin;

        for (const s2 of segments2) {
            // 快速排除：线段边界框不相交
            const s2MinLon = Math.min(s2[0][0], s2[1][0]);
            const s2MaxLon = Math.max(s2[0][0], s2[1][0]);
            const s2MinLat = Math.min(s2[0][1], s2[1][1]);
            const s2MaxLat = Math.max(s2[0][1], s2[1][1]);

            if (s1MaxLon < s2MinLon || s1MinLon > s2MaxLon ||
                s1MaxLat < s2MinLat || s1MinLat > s2MaxLat) {
                continue;
            }

            if (segmentsIntersect(s1[0], s1[1], s2[0], s2[1])) {
                return true;
            }
        }
    }

    return false;
}

/**
 * 构建邻接图
 */
function buildAdjacencyGraph(features: GeoJSONFeature[]): Map<number, Set<number>> {
    const n = features.length;
    const graph = new Map<number, Set<number>>();

    // 初始化
    for (let i = 0; i < n; i++) {
        graph.set(i, new Set());
    }

    // 检测相邻关系
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (areAdjacent(features[i], features[j])) {
                graph.get(i)!.add(j);
                graph.get(j)!.add(i);
            }
        }
    }

    return graph;
}

/**
 * DSATUR 四色着色算法
 */
function dsaturColoring(graph: Map<number, Set<number>>, n: number): Map<number, number> {
    const colors = new Map<number, number>();
    const saturation = new Map<number, Set<number>>();
    const uncolored = new Set<number>();

    // 初始化
    for (let i = 0; i < n; i++) {
        saturation.set(i, new Set());
        uncolored.add(i);
    }

    while (uncolored.size > 0) {
        // 选择饱和度最高的顶点
        let selectedVertex = -1;
        let maxSaturation = -1;
        let maxDegree = -1;

        for (const v of uncolored) {
            const sat = saturation.get(v)!.size;
            const deg = graph.get(v)!.size;

            if (sat > maxSaturation || (sat === maxSaturation && deg > maxDegree)) {
                maxSaturation = sat;
                maxDegree = deg;
                selectedVertex = v;
            }
        }

        // 找到可用颜色
        const neighbors = graph.get(selectedVertex)!;
        const usedColors = new Set<number>();

        for (const neighbor of neighbors) {
            if (colors.has(neighbor)) {
                usedColors.add(colors.get(neighbor)!);
            }
        }

        // 找到第一个可用颜色
        let assignedColor = 0;
        for (let c = 0; c < 4; c++) {
            if (!usedColors.has(c)) {
                assignedColor = c;
                break;
            }
        }

        colors.set(selectedVertex, assignedColor);
        uncolored.delete(selectedVertex);

        // 更新相邻顶点的饱和度
        for (const neighbor of neighbors) {
            if (uncolored.has(neighbor)) {
                saturation.get(neighbor)!.add(assignedColor);
            }
        }
    }

    return colors;
}

/**
 * 局部搜索修复冲突 - 使用模拟退火算法
 */
function simulatedAnnealingFix(
    colors: Map<number, number>,
    graph: Map<number, Set<number>>,
    maxIterations: number = 10000
): Map<number, number> {
    const n = colors.size;

    // 计算冲突数
    const countConflicts = (): number => {
        let count = 0;
        for (let i = 0; i < n; i++) {
            const myColor = colors.get(i)!;
            const neighbors = graph.get(i)!;
            for (const neighbor of neighbors) {
                if (colors.get(neighbor) === myColor) {
                    count++;
                }
            }
        }
        return count / 2;
    };

    // 获取有冲突的顶点
    const getConflictVertices = (): Set<number> => {
        const conflicts = new Set<number>();
        for (let i = 0; i < n; i++) {
            const myColor = colors.get(i)!;
            const neighbors = graph.get(i)!;
            for (const neighbor of neighbors) {
                if (colors.get(neighbor) === myColor) {
                    conflicts.add(i);
                    conflicts.add(neighbor);
                }
            }
        }
        return conflicts;
    };

    let currentConflicts = countConflicts();
    const bestColors = new Map(colors);
    let bestConflicts = currentConflicts;

    let temperature = 10.0;
    const coolingRate = 0.9995;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        if (currentConflicts === 0) {
            return colors;
        }

        // 随机选择一个有冲突的顶点
        const conflictVertices = getConflictVertices();
        if (conflictVertices.size === 0) break;

        const v = Array.from(conflictVertices)[Math.floor(Math.random() * conflictVertices.size)];
        const oldColor = colors.get(v)!;

        // 随机选择一个新颜色
        const otherColors = [0, 1, 2, 3].filter(c => c !== oldColor);
        const newColor = otherColors[Math.floor(Math.random() * otherColors.length)];

        // 计算新冲突数
        colors.set(v, newColor);
        const newConflicts = countConflicts();

        // 接受或拒绝
        const delta = newConflicts - currentConflicts;
        if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
            currentConflicts = newConflicts;
            if (currentConflicts < bestConflicts) {
                bestColors.clear();
                colors.forEach((color, vertex) => bestColors.set(vertex, color));
                bestConflicts = currentConflicts;
            }
        } else {
            colors.set(v, oldColor);
        }

        temperature *= coolingRate;
    }

    return bestColors;
}

/**
 * 四色着色主函数
 */
function fourColorMap(features: GeoJSONFeature[]): Map<number, number> {
    const n = features.length;
    if (n === 0) return new Map();

    const graph = buildAdjacencyGraph(features);

    // 使用 DSATUR 算法进行初始着色
    let colors = dsaturColoring(graph, n);

    // 使用模拟退火修复冲突
    colors = simulatedAnnealingFix(colors, graph);

    return colors;
}

// 计算 bounding box（用于地图定位）
function getBoundingBox(features: GeoJSONFeature[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const feature of features) {
        const coords = extractAllCoordinates(feature.geometry);
        for (const [x, y] of coords) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }

    return { minX, minY, maxX, maxY };
}

/**
 * 计算多边形的质心
 */
function calculateCentroid(geometry: GeoJSONFeature['geometry']): [number, number] | null {
    const coords = extractAllCoordinates(geometry);
    if (coords.length === 0) return null;

    let sumLon = 0;
    let sumLat = 0;
    for (const [lon, lat] of coords) {
        sumLon += lon;
        sumLat += lat;
    }

    return [sumLon / coords.length, sumLat / coords.length];
}

// 清理 title（去掉括号内的年份信息）
function cleanTitle(title: string | undefined): string {
    if (!title) return '';
    return title
        .replace(/（[^）]*\d[^）]*）/g, '')
        .replace(/\([^)]*\d[^)]*\)/g, '')
        .trim();
}

export const GeoJsonMap = ({ geoJson, width = SCREEN_WIDTH, height = 400, style, fullscreen = false }: GeoJsonMapProps) => {
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

        // 使用 DSATUR + 模拟退火四色着色算法
        const colorMap = fourColorMap(geoJson.features);

        // 准备 GeoJSON 数据并添加颜色
        const coloredFeatures = geoJson.features.map((feature, index) => {
            const colorIndex = colorMap.get(index) ?? 0;
            return {
                ...feature,
                properties: {
                    ...feature.properties,
                    fill: FOUR_COLORS[colorIndex],
                    stroke: STROKE_COLORS[colorIndex],
                    'stroke-width': 1.5,
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

        geoJsonData.features.forEach(function(feature, featureIndex) {
            var coordinates = feature.geometry.coordinates;
            var color = feature.properties.fill || '#E8D5B7';
            var strokeColor = feature.properties.stroke || '#C4A67A';
            var title = feature.properties.title || '';

            if (feature.geometry.type === 'Polygon') {
                var polygon = new AMap.Polygon({
                    path: coordinates[0].map(function(c) { return [c[0], c[1]]; }),
                    fillColor: color,
                    fillOpacity: 0.6,
                    strokeColor: strokeColor,
                    strokeWeight: 1.5,
                    strokeOpacity: 0.8
                });
                polygon.setMap(map);
            } else if (feature.geometry.type === 'MultiPolygon') {
                coordinates.forEach(function(poly) {
                    var polygon = new AMap.Polygon({
                        path: poly[0].map(function(c) { return [c[0], c[1]]; }),
                        fillColor: color,
                        fillOpacity: 0.6,
                        strokeColor: strokeColor,
                        strokeWeight: 1.5,
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
                    const data = event.nativeEvent.data;
                    if (data === 'loaded') {
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
};

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

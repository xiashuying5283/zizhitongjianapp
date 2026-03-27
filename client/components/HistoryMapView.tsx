import React, { useMemo } from 'react';
import { View, TouchableOpacity, Dimensions, Text } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { FontAwesome6 } from '@expo/vector-icons';
import { HistoricalLocation, HistoricalRoute } from '@/data/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const MAP_HEIGHT = 280;

// 中国地图边界框（简化）
const MAP_BOUNDS = {
  minLat: 28,
  maxLat: 42,
  minLng: 105,
  maxLng: 120,
};

interface HistoryMapViewProps {
  locations: HistoricalLocation[];
  routes: HistoricalRoute[];
  selectedLocation: HistoricalLocation | null;
  onLocationPress: (location: HistoricalLocation) => void;
}

export function HistoryMapView({
  locations,
  routes,
  selectedLocation,
  onLocationPress,
}: HistoryMapViewProps) {
  const { theme } = useTheme();

  // 将经纬度转换为屏幕坐标
  const projectCoordinate = (lat: number, lng: number) => {
    const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * MAP_WIDTH;
    const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * MAP_HEIGHT;
    return { x, y };
  };

  // 获取地点颜色
  const getLocationColor = (type: HistoricalLocation['type']) => {
    switch (type) {
      case 'capital':
        return theme.accent;
      case 'battlefield':
        return theme.error;
      case 'strategic':
        return theme.primary;
      default:
        return theme.textMuted;
    }
  };

  // 获取路线颜色
  const getRouteColor = (type: string) => {
    switch (type) {
      case 'rebel':
      case 'chu':
        return theme.error;
      case 'tang':
      case 'han':
      case 'shu':
        return theme.primary;
      case 'wei':
        return '#6366f1';
      case 'wu':
        return '#f59e0b';
      case 'retreat':
      default:
        return theme.textSecondary;
    }
  };

  // 生成路线路径
  const routePaths = useMemo(() => {
    return routes.map(route => {
      const pathLocations = route.path
        .map(id => locations.find(l => l.id === id))
        .filter(Boolean) as HistoricalLocation[];
      
      if (pathLocations.length < 2) return null;

      const points = pathLocations.map(loc => projectCoordinate(loc.coordinates.lat, loc.coordinates.lng));
      
      return {
        ...route,
        points,
      };
    }).filter(Boolean);
  }, [routes, locations]);

  return (
    <View style={{ height: MAP_HEIGHT + 60, backgroundColor: theme.backgroundTertiary }}>
      {/* 简化地图背景 */}
      <View style={{ flex: 1, padding: Spacing.md }}>
        {/* 网格线 */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {[0.25, 0.5, 0.75].map(ratio => (
            <View
              key={`h-${ratio}`}
              style={{
                position: 'absolute',
                top: MAP_HEIGHT * ratio,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: theme.border,
                opacity: 0.3,
              }}
            />
          ))}
          {[0.25, 0.5, 0.75].map(ratio => (
            <View
              key={`v-${ratio}`}
              style={{
                position: 'absolute',
                left: MAP_WIDTH * ratio,
                top: 0,
                bottom: 60,
                width: 1,
                backgroundColor: theme.border,
                opacity: 0.3,
              }}
            />
          ))}
        </View>

        {/* 地图标签 */}
        <View style={{ position: 'absolute', top: Spacing.sm, left: Spacing.sm }}>
          <ThemedText variant="tiny" color={theme.textMuted}>西</ThemedText>
        </View>
        <View style={{ position: 'absolute', top: Spacing.sm, right: Spacing.sm }}>
          <ThemedText variant="tiny" color={theme.textMuted}>东</ThemedText>
        </View>
        <View style={{ position: 'absolute', bottom: 60 + Spacing.sm, left: Spacing.sm }}>
          <ThemedText variant="tiny" color={theme.textMuted}>南</ThemedText>
        </View>
        <View style={{ position: 'absolute', bottom: 60 + Spacing.sm, right: Spacing.sm }}>
          <ThemedText variant="tiny" color={theme.textMuted}>北</ThemedText>
        </View>

        {/* 路线 */}
        {routePaths.map((route, index) => {
          if (!route) return null;
          
          return (
            <View key={route.id} style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* 使用多个线段连接 */}
              {route.points.slice(0, -1).map((point, i) => {
                const nextPoint = route.points[i + 1];
                const dx = nextPoint.x - point.x;
                const dy = nextPoint.y - point.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                return (
                  <View
                    key={`${route.id}-${i}`}
                    style={{
                      position: 'absolute',
                      left: point.x,
                      top: point.y,
                      width: length,
                      height: 2,
                      backgroundColor: getRouteColor(route.type),
                      transformOrigin: 'left center',
                      transform: [{ rotate: `${angle}deg` }],
                      opacity: 0.6,
                    }}
                  />
                );
              })}
            </View>
          );
        })}

        {/* 地点标记 */}
        {locations.map(location => {
          const { x, y } = projectCoordinate(location.coordinates.lat, location.coordinates.lng);
          const isSelected = selectedLocation?.id === location.id;
          const color = getLocationColor(location.type);
          
          return (
            <TouchableOpacity
              key={location.id}
              style={{
                position: 'absolute',
                left: x - 12,
                top: y - 12,
                alignItems: 'center',
              }}
              onPress={() => onLocationPress(location)}
            >
              {/* 标记点 */}
              <View
                style={{
                  width: isSelected ? 28 : 20,
                  height: isSelected ? 28 : 20,
                  borderRadius: isSelected ? 14 : 10,
                  backgroundColor: `${color}20`,
                  borderWidth: 2,
                  borderColor: color,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <FontAwesome6
                  name={
                    location.type === 'capital' ? 'crown' :
                    location.type === 'battlefield' ? 'shield-halved' :
                    location.type === 'strategic' ? 'fort' :
                    'location-dot'
                  }
                  size={isSelected ? 12 : 10}
                  color={color}
                />
              </View>
              {/* 标签 */}
              <View
                style={{
                  marginTop: 2,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  backgroundColor: theme.backgroundRoot,
                  borderRadius: 2,
                }}
              >
                <ThemedText
                  variant="tiny"
                  color={isSelected ? theme.textPrimary : theme.textSecondary}
                  style={{ fontWeight: isSelected ? '600' : '400' }}
                >
                  {location.name}
                </ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* 空状态 */}
        {locations.length === 0 && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <FontAwesome6 name="map" size={32} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.sm }}>
              选择年份查看对应事件地点
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

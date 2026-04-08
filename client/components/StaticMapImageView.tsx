import React, { useRef, useState } from 'react';
import { View, Image, Dimensions, TouchableOpacity, PanResponder, Animated } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { FontAwesome6 } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StaticMapImageViewProps {
  imageUrl: any; // string or require() result
  aspectRatio?: number;
}

export function StaticMapImageView({ imageUrl, aspectRatio = 1.6 }: StaticMapImageViewProps) {
  const { theme } = useTheme();
  
  const scale = useRef(new Animated.Value(1)).current;
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [currentScale, setCurrentScale] = useState(1);

  const handleZoomIn = () => {
    const newScale = Math.min(currentScale * 1.5, 5);
    setCurrentScale(newScale);
    Animated.timing(scale, {
      toValue: newScale,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleZoomOut = () => {
    const newScale = Math.max(currentScale / 1.5, 1);
    setCurrentScale(newScale);
    Animated.timing(scale, {
      toValue: newScale,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleReset = () => {
    setCurrentScale(1);
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(position.x, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(position.y, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const imageHeight = (SCREEN_WIDTH - Spacing["2xl"] * 2) / aspectRatio;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: SCREEN_WIDTH - Spacing["2xl"] * 2,
          height: imageHeight,
          backgroundColor: theme.backgroundTertiary,
          borderRadius: BorderRadius.lg,
          overflow: 'hidden',
          marginBottom: Spacing.md,
        }}
      >
        <Animated.View
          style={{
            width: SCREEN_WIDTH - Spacing["2xl"] * 2,
            height: imageHeight,
            transform: [
              { scale: scale },
              { translateX: position.x },
              { translateY: position.y },
            ],
          }}
        >
          <Image
            source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl}
            style={{
              width: SCREEN_WIDTH - Spacing["2xl"] * 2,
              height: imageHeight,
              resizeMode: 'contain',
            }}
          />
        </Animated.View>

        {/* 缩放控制按钮 */}
        <View style={{
          position: 'absolute',
          bottom: Spacing.md,
          right: Spacing.md,
          flexDirection: 'row',
          gap: Spacing.sm,
        }}>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              backgroundColor: theme.backgroundDefault,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleZoomOut}
          >
            <FontAwesome6 name="minus" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              backgroundColor: theme.backgroundDefault,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleZoomIn}
          >
            <FontAwesome6 name="plus" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              backgroundColor: theme.backgroundDefault,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleReset}
          >
            <FontAwesome6 name="rotate-right" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* 缩放指示器 */}
        <View style={{
          position: 'absolute',
          top: Spacing.md,
          left: Spacing.md,
          paddingHorizontal: Spacing.sm,
          paddingVertical: Spacing.xs,
          backgroundColor: theme.backgroundDefault,
          borderRadius: BorderRadius.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <ThemedText variant="caption" color={theme.textSecondary}>
            {Math.round(currentScale * 100)}%
          </ThemedText>
        </View>
      </View>

      {/* 提示文字 */}
      <View style={{
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: `${theme.primary}10`,
        borderRadius: BorderRadius.sm,
      }}>
        <ThemedText variant="caption" color={theme.textSecondary}>
          使用 + - 按钮缩放地图，重置按钮恢复原始大小
        </ThemedText>
      </View>
    </View>
  );
}

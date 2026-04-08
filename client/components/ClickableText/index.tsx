import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { TextSegment } from '@/utils/textParser';

interface ClickableTextProps {
  segments: TextSegment[];
  style?: any;
  variant?: 'body' | 'smallMedium' | 'caption';
}

export const ClickableText: React.FC<ClickableTextProps> = ({
  segments,
  style,
  variant = 'body'
}) => {
  const { theme } = useTheme();
  const router = useSafeRouter();

  const handleEntityPress = (segment: TextSegment) => {
    if (!segment.isEntity || !segment.entityName || !segment.entityType) return;

    // 跳转到百科页面
    router.push('/encyclopedia-detail', {
      type: segment.entityType,
      name: segment.entityName
    });
  };

  const getVariantStyle = (variant: string) => {
    switch (variant) {
      case 'smallMedium':
        return { fontSize: 14, lineHeight: 20 };
      case 'caption':
        return { fontSize: 12, lineHeight: 16 };
      default:
        return { fontSize: 16, lineHeight: 24 };
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={1}
      onPress={(e) => {
        // 获取点击位置并判断点击的是哪个实体
        const nativeEvent = e.nativeEvent;
        // 简化处理：如果有实体，点击任意位置都跳转
        const entitySegment = segments.find(s => s.isEntity);
        if (entitySegment) {
          handleEntityPress(entitySegment);
        }
      }}
    >
      <Text style={[styles.text, getVariantStyle(variant), style]}>
        {segments.map((segment, index) => {
          if (segment.isEntity) {
            const entityColor = segment.entityType === 'character' 
              ? theme.primary 
              : theme.accent;
            return (
              <Text
                key={`entity-${index}-${segment.entityName}`}
                style={[
                  styles.entityText,
                  {
                    color: entityColor,
                    textDecorationLine: 'none',
                    borderBottomWidth: 2,
                    borderBottomColor: entityColor,
                    paddingBottom: 2,
                  },
                ]}
              >
                {segment.text}
              </Text>
            );
          }

          return (
            <Text key={`text-${index}`} style={{ color: theme.textPrimary }}>
              {segment.text}
            </Text>
          );
        })}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: {
    flexWrap: 'wrap',
  },
  entityText: {
    // 使用 borderBottom 替代 textDecorationLine，以控制粗细和间距
  },
});

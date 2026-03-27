import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Dimensions, StyleSheet, PanResponder } from 'react-native';
import Svg, { G, Circle, Path, Text as SvgText, Defs, RadialGradient, Stop, Filter, FeDropShadow } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius } from '@/constants/theme';

interface GraphNode {
  id: number;
  name: string;
  title?: string | null;
  era?: string | null;
}

interface GraphEdge {
  id: number;
  source: number;
  target: number;
  type: string;
  description?: string | null;
}

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface RelationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodePress?: (nodeId: number) => void;
  selectedNodeId?: number | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH;
const GRAPH_HEIGHT = SCREEN_HEIGHT - 200;

// 力导向布局参数
const REPULSION = 8000;
const ATTRACTION = 0.008;
const DAMPING = 0.85;
const MIN_DISTANCE = 100;
const ITERATIONS = 150;

// 关系类型颜色映射
const getRelationColor = (type: string, theme: any): string => {
  const colors: Record<string, string> = {
    '配偶': '#E91E63',
    '子女': '#4CAF50',
    '父母': '#9C27B0',
    '兄弟': '#2196F3',
    '君臣': '#673AB7',
    '同僚': '#00BCD4',
    '对手': '#F44336',
    '同盟': '#8BC34A',
  };
  return colors[type] || theme.textMuted;
};

// 朝代颜色映射
const getEraColor = (era: string | null | undefined): { primary: string; gradient: string[] } => {
  const colors: Record<string, { primary: string; gradient: string[] }> = {
    '汉朝': { primary: '#4F46E5', gradient: ['#6366F1', '#4F46E5'] },
    '秦末汉初': { primary: '#DC2626', gradient: ['#EF4444', '#DC2626'] },
    '三国': { primary: '#059669', gradient: ['#10B981', '#059669'] },
  };
  return colors[era || ''] || { primary: '#6B7280', gradient: ['#9CA3AF', '#6B7280'] };
};

// 生成贝塞尔曲线路径
const generateCurvePath = (x1: number, y1: number, x2: number, y2: number, curve: number = 0.2): string => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // 控制点偏移
  const offset = dist * curve;
  const perpX = -dy / dist * offset;
  const perpY = dx / dist * offset;
  
  const cpX = midX + perpX;
  const cpY = midY + perpY;
  
  return `M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`;
};

export default function RelationGraph({ nodes, edges, onNodePress, selectedNodeId }: RelationGraphProps) {
  const { theme } = useTheme();
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<GraphEdge[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const animationRef = useRef<any>(null);
  
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 力导向布局计算
  useEffect(() => {
    if (nodes.length === 0) return;

    // 初始化节点位置（圆形布局）
    const initializedNodes: LayoutNode[] = nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      const radius = Math.min(GRAPH_WIDTH, GRAPH_HEIGHT) / 3;
      return {
        ...node,
        x: GRAPH_WIDTH / 2 + radius * Math.cos(angle),
        y: GRAPH_HEIGHT / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      };
    });

    const initializedEdges: GraphEdge[] = edges.map(edge => ({ ...edge }));

    // 力导向迭代
    let currentNodes = [...initializedNodes];
    for (let iter = 0; iter < ITERATIONS; iter++) {
      // 中心引力
      currentNodes.forEach(node => {
        const dx = GRAPH_WIDTH / 2 - node.x;
        const dy = GRAPH_HEIGHT / 2 - node.y;
        node.vx += dx * 0.001;
        node.vy += dy * 0.001;
      });

      // 计算斥力
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const dx = currentNodes[j].x - currentNodes[i].x;
          const dy = currentNodes[j].y - currentNodes[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (distance * distance);

          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          currentNodes[i].vx -= fx;
          currentNodes[i].vy -= fy;
          currentNodes[j].vx += fx;
          currentNodes[j].vy += fy;
        }
      }

      // 计算引力（边连接的节点）
      for (const edge of initializedEdges) {
        const sourceNode = currentNodes.find(n => n.id === edge.source);
        const targetNode = currentNodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = distance * ATTRACTION;

          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      }

      // 更新位置
      currentNodes = currentNodes.map(node => {
        let vx = node.vx * DAMPING;
        let vy = node.vy * DAMPING;

        const maxSpeed = 15;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > maxSpeed) {
          vx = (vx / speed) * maxSpeed;
          vy = (vy / speed) * maxSpeed;
        }

        let x = node.x + vx;
        let y = node.y + vy;

        const padding = 70;
        x = Math.max(padding, Math.min(GRAPH_WIDTH - padding, x));
        y = Math.max(padding, Math.min(GRAPH_HEIGHT - padding, y));

        return { ...node, x, y, vx, vy };
      });
    }

    // 归一化位置
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    currentNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });

    const graphWidth = maxX - minX || 1;
    const graphHeight = maxY - minY || 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const scaleX = (GRAPH_WIDTH - 120) / graphWidth;
    const scaleY = (GRAPH_HEIGHT - 120) / graphHeight;
    const finalScale = Math.min(scaleX, scaleY, 1);

    const finalNodes = currentNodes.map(node => ({
      ...node,
      x: GRAPH_WIDTH / 2 + (node.x - centerX) * finalScale,
      y: GRAPH_HEIGHT / 2 + (node.y - centerY) * finalScale,
    }));

    setLayoutNodes(finalNodes);
    setLayoutEdges(initializedEdges);
  }, [nodes, edges]);

  // 更新单个节点位置（拖拽时）
  const updateNodePosition = useCallback((nodeId: number, x: number, y: number) => {
    setLayoutNodes(prev => 
      prev.map(node => 
        node.id === nodeId 
          ? { ...node, x, y } 
          : node
      )
    );
  }, []);

  // 手势处理（整体缩放和拖动）
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleNodePress = (nodeId: number) => {
    onNodePress?.(nodeId);
  };

  if (layoutNodes.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.graphContainer, animatedStyle]}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            <Defs>
              {/* 节点阴影滤镜 */}
              <Filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <FeDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
              </Filter>
            </Defs>
            
            <G>
              {/* 绘制边（曲线） */}
              {layoutEdges.map(edge => {
                const sourceNode = layoutNodes.find(n => n.id === edge.source);
                const targetNode = layoutNodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isSelected = selectedNodeId === edge.source || selectedNodeId === edge.target;
                const edgeColor = getRelationColor(edge.type, theme);
                const path = generateCurvePath(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);

                return (
                  <G key={`edge-${edge.id}`}>
                    <Path
                      d={path}
                      fill="none"
                      stroke={isSelected ? edgeColor : theme.border}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray={edge.type === '对手' ? '6,3' : undefined}
                      opacity={selectedNodeId && !isSelected ? 0.15 : 0.7}
                    />
                    {/* 关系类型标签 */}
                    <SvgText
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 - 8}
                      fill={isSelected ? edgeColor : theme.textMuted}
                      fontSize={10}
                      fontWeight="500"
                      textAnchor="middle"
                      opacity={isSelected ? 1 : 0.7}
                    >
                      {edge.type}
                    </SvgText>
                  </G>
                );
              })}

              {/* 绘制节点 */}
              {layoutNodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const eraColors = getEraColor(node.era);
                const radius = isSelected ? 32 : 26;
                const isRelated = selectedNodeId && layoutEdges.some(
                  e => (e.source === selectedNodeId && e.target === node.id) ||
                       (e.target === selectedNodeId && e.source === node.id)
                );

                return (
                  <G key={`node-${node.id}`}>
                    {/* 节点光晕效果（选中时） */}
                    {isSelected && (
                      <Circle
                        cx={node.x}
                        cy={node.y}
                        r={radius + 8}
                        fill={eraColors.primary}
                        opacity={0.15}
                      />
                    )}
                    
                    {/* 节点主体 */}
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      fill={eraColors.primary}
                      opacity={selectedNodeId && !isSelected && !isRelated ? 0.3 : 1}
                      filter="url(#nodeShadow)"
                    />
                    
                    {/* 节点内圈（渐变效果模拟） */}
                    <Circle
                      cx={node.x}
                      cy={node.y - 4}
                      r={radius - 4}
                      fill={eraColors.gradient[0]}
                      opacity={selectedNodeId && !isSelected && !isRelated ? 0.3 : 0.6}
                    />
                    
                    {/* 节点边框 */}
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      stroke={isSelected ? theme.textPrimary : 'rgba(255,255,255,0.3)'}
                      strokeWidth={isSelected ? 3 : 1}
                      fill="transparent"
                    />
                    
                    {/* 节点文字（首字） */}
                    <SvgText
                      x={node.x}
                      y={node.y + 5}
                      fill="white"
                      fontSize={18}
                      fontWeight="600"
                      textAnchor="middle"
                      opacity={selectedNodeId && !isSelected && !isRelated ? 0.5 : 1}
                    >
                      {node.name.charAt(0)}
                    </SvgText>
                    
                    {/* 节点名称标签 */}
                    <SvgText
                      x={node.x}
                      y={node.y + radius + 16}
                      fill={theme.textPrimary}
                      fontSize={13}
                      fontWeight="600"
                      textAnchor="middle"
                      opacity={selectedNodeId && !isSelected && !isRelated ? 0.4 : 1}
                    >
                      {node.name}
                    </SvgText>
                    
                    {/* 称号标签 */}
                    {node.title && (
                      <SvgText
                        x={node.x}
                        y={node.y + radius + 30}
                        fill={theme.textMuted}
                        fontSize={10}
                        textAnchor="middle"
                        opacity={selectedNodeId && !isSelected && !isRelated ? 0.3 : 0.8}
                      >
                        {node.title}
                      </SvgText>
                    )}
                    
                    {/* 点击区域 */}
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 15}
                      fill="transparent"
                      onPress={() => handleNodePress(node.id)}
                    />
                  </G>
                );
              })}
            </G>
          </Svg>
        </Animated.View>
      </GestureDetector>

      {/* 图例 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
          <ThemedText variant="caption" color={theme.textMuted}>汉朝</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <ThemedText variant="caption" color={theme.textMuted}>秦末汉初</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
          <ThemedText variant="caption" color={theme.textMuted}>三国</ThemedText>
        </View>
      </View>
      
      {/* 操作提示 */}
      <View style={styles.hint}>
        <ThemedText variant="caption" color={theme.textMuted}>
          双指缩放 · 拖动移动 · 点击人物
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphContainer: {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
  },
  legend: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    flexDirection: 'row',
    gap: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hint: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
});

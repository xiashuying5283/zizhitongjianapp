import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, Modal, Share, Alert } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import RelationGraph from '@/components/RelationGraph';
import { getCharacterGraph, getEras, GraphNode, GraphEdge, Era } from '@/utils/characters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CharacterGraphScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ characterId?: number }>();

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [eras, setEras] = useState<Era[]>([]);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const initialCharacterId = params.characterId;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      if (eras.length === 0) {
        const erasResult = await getEras();
        if (erasResult.success) {
          setEras(erasResult.data);
        }
      }

      const queryParams: { era?: string; characterId?: number } = {};
      if (selectedEra) {
        queryParams.era = selectedEra;
      }
      if (selectedNodeId) {
        queryParams.characterId = selectedNodeId;
      } else if (initialCharacterId && !selectedEra) {
        queryParams.characterId = initialCharacterId;
      }

      const graphResult = await getCharacterGraph(queryParams);

      if (graphResult.success) {
        setNodes(graphResult.data.nodes);
        setEdges(graphResult.data.edges);
        
        if (initialCharacterId && !selectedNodeId && graphResult.data.nodes.length > 0) {
          setSelectedNodeId(initialCharacterId);
        }
      }
    } catch (error) {
      console.error('获取图谱数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedEra, selectedNodeId, eras.length, initialCharacterId]);

  useEffect(() => {
    fetchData();
  }, [selectedEra, selectedNodeId]);

  const handleEraSelect = (era: string | null) => {
    setSelectedEra(era);
    setSelectedNodeId(null);
  };

  const handleNodePress = (nodeId: number) => {
    if (selectedNodeId === nodeId) {
      router.push('/character-detail', { id: nodeId });
    } else {
      setSelectedNodeId(nodeId);
    }
  };

  const handleViewAll = () => {
    setSelectedNodeId(null);
    setSelectedEra(null);
  };

  const handleFocusCharacter = () => {
    if (selectedNodeId) {
      setSelectedEra(null);
    }
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId);
  }, [selectedNodeId, nodes]);

  const formattedEdges = useMemo(() => {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.character_id,
      target: edge.related_character_id,
      type: edge.relation_type,
      description: edge.description,
    }));
  }, [edges]);

  // 关系统计
  const relationStats = useMemo(() => {
    if (!selectedNodeId) return null;
    
    const outgoing = edges.filter(e => e.character_id === selectedNodeId);
    const incoming = edges.filter(e => e.related_character_id === selectedNodeId);
    
    return {
      outgoing: outgoing.length,
      incoming: incoming.length,
      total: outgoing.length + incoming.length,
    };
  }, [selectedNodeId, edges]);

  return (
    <Screen preset="scroll" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <ThemedText variant="title" color={theme.textPrimary}>人物关系图谱</ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            {nodes.length} 人物 · {edges.length} 关系
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={handleViewAll}>
          <FontAwesome6 name="rotate-left" size={16} color={theme.primary} />
        </TouchableOpacity>
      </ThemedView>

      {/* Era Filter */}
      <View style={styles.eraContainer}>
        <TouchableOpacity
          style={[styles.eraChip, !selectedEra && !selectedNodeId && styles.eraChipActive]}
          onPress={() => handleEraSelect(null)}
        >
          <ThemedText
            variant="small"
            color={!selectedEra && !selectedNodeId ? theme.buttonPrimaryText : theme.textSecondary}
          >
            全部
          </ThemedText>
        </TouchableOpacity>
        {eras.map(era => (
          <TouchableOpacity
            key={era.name}
            style={[styles.eraChip, selectedEra === era.name && styles.eraChipActive]}
            onPress={() => handleEraSelect(era.name)}
          >
            <ThemedText
              variant="small"
              color={selectedEra === era.name ? theme.buttonPrimaryText : theme.textSecondary}
            >
              {era.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Graph */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color={theme.textMuted}>正在构建图谱...</ThemedText>
        </View>
      ) : nodes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color={theme.textMuted}>暂无数据</ThemedText>
        </View>
      ) : (
        <RelationGraph
          nodes={nodes}
          edges={formattedEdges}
          onNodePress={handleNodePress}
          selectedNodeId={selectedNodeId}
        />
      )}

      {/* Selected Node Info */}
      {selectedNode && (
        <View style={styles.selectedInfo}>
          <View style={styles.selectedInfoContent}>
            <View style={styles.selectedInfoHeader}>
              <View style={[styles.selectedAvatar, { backgroundColor: theme.primary }]}>
                <ThemedText variant="h4" color={theme.buttonPrimaryText}>
                  {selectedNode.name.charAt(0)}
                </ThemedText>
              </View>
              <View style={styles.selectedInfoText}>
                <ThemedText variant="h4" color={theme.textPrimary}>
                  {selectedNode.name}
                </ThemedText>
                {selectedNode.title && (
                  <ThemedText variant="small" color={theme.accent}>
                    {selectedNode.title}
                  </ThemedText>
                )}
                <View style={styles.selectedInfoMeta}>
                  {selectedNode.era && (
                    <ThemedText variant="caption" color={theme.textMuted}>
                      {selectedNode.era}
                    </ThemedText>
                  )}
                  {relationStats && (
                    <ThemedText variant="caption" color={theme.textMuted}>
                      · {relationStats.total} 个关系
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/character-detail', { id: selectedNode.id })}
              >
                <FontAwesome6 name="user" size={14} color={theme.buttonPrimaryText} />
                <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                  查看详情
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleFocusCharacter}
              >
                <FontAwesome6 name="bullseye" size={14} color={theme.primary} />
                <ThemedText variant="smallMedium" color={theme.primary}>
                  聚焦关系
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedNodeId(null)}
          >
            <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </Screen>
  );
}

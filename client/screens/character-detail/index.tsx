import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getCharacter, CharacterDetail, CharacterRelation, ReverseRelation, CharacterEvent } from '@/utils/characters';

export default function CharacterDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ id: number }>();

  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const characterId = params.id;

  const fetchData = useCallback(async () => {
    if (!characterId) return;

    try {
      setLoading(true);

      /**
       * 服务端文件：server/src/routes/characters.ts
       * 接口：GET /api/v1/characters/:id
       * Path 参数：id: number
       */
      const result = await getCharacter(characterId);

      if (result.success) {
        setCharacter(result.data);
      }
    } catch (error) {
      console.error('获取人物详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRelatedCharacterPress = (id: number) => {
    router.push('/character-detail', { id });
  };

  const handleViewGraph = () => {
    if (characterId) {
      router.push('/character-graph', { characterId });
    }
  };

  const renderRelationType = (type: string) => {
    const typeColors: Record<string, string> = {
      '配偶': theme.error,
      '子女': theme.success,
      '父母': theme.accent,
      '兄弟': theme.primary,
      '君臣': theme.accent,
      '同僚': theme.primary,
      '对手': theme.error,
      '同盟': theme.success,
    };

    return (
        <View style={[styles.relationTypeTag, { backgroundColor: (typeColors[type] || theme.textMuted) + '20' }]}>
          <ThemedText variant="tiny" color={typeColors[type] || theme.textMuted}>
            {type}
          </ThemedText>
        </View>
    );
  };

  const renderRelation = (relation: CharacterRelation | ReverseRelation, isReverse: boolean = false) => {
    const relatedPerson = isReverse
        ? (relation as ReverseRelation).character
        : (relation as CharacterRelation).related_character;

    return (
        <TouchableOpacity
            key={relation.id}
            style={styles.relationItem}
            onPress={() => handleRelatedCharacterPress(relatedPerson.id)}
            activeOpacity={0.7}
        >
          <View style={styles.relationAvatar}>
            <ThemedText variant="captionMedium" color={theme.buttonPrimaryText}>
              {relatedPerson.name.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.relationInfo}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              {relatedPerson.name}
            </ThemedText>
            {relatedPerson.title && (
                <ThemedText variant="caption" color={theme.textMuted}>
                  {relatedPerson.title}
                </ThemedText>
            )}
          </View>
          {renderRelationType(relation.relation_type)}
          <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
        </TouchableOpacity>
    );
  };

  const renderEvent = (event: CharacterEvent, index: number, total: number) => (
      <View key={event.id} style={styles.eventItem}>
        <View style={styles.eventTimeline}>
          <View style={styles.eventDot} />
          {index < total - 1 && <View style={styles.eventLine} />}
        </View>
        <View style={styles.eventContent}>
          <ThemedText variant="smallMedium" color={theme.accent}>
            {event.year}
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary}>
            {event.event}
          </ThemedText>
        </View>
      </View>
  );

  if (loading) {
    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
          <View style={styles.loadingContainer}>
            <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
          </View>
        </Screen>
    );
  }

  if (!character) {
    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
          <View style={styles.loadingContainer}>
            <ThemedText variant="body" color={theme.textMuted}>人物不存在</ThemedText>
          </View>
        </Screen>
    );
  }

  const allRelations = [
    ...character.relations.map(r => ({ ...r, isReverse: false })),
    ...character.reverseRelations.map(r => ({ ...r, isReverse: true })),
  ];

  return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="title" color={theme.textPrimary}>人物详情</ThemedText>
          <TouchableOpacity style={styles.graphButton} onPress={handleViewGraph}>
            <FontAwesome6 name="diagram-project" size={18} color={theme.buttonPrimaryText} />
          </TouchableOpacity>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 人物基本信息卡片 */}
          <View style={styles.profileCard}>
            {/* 右上角纪标签 */}
            {character.era && (
                <View style={styles.eraTag}>
                  <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                    {character.era}
                  </ThemedText>
                </View>
            )}

            <View style={styles.avatar}>
              <ThemedText variant="h2" color={theme.buttonPrimaryText}>
                {character.name.charAt(0)}
              </ThemedText>
            </View>
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.nameText}>
              {character.name}
            </ThemedText>
            {character.title && (
                <ThemedText variant="body" color={theme.accent} style={styles.titleText}>
                  {character.title}
                </ThemedText>
            )}

            {/* 别称、籍贯、生卒 */}
            <View style={styles.metaSection}>
              {/* 别称 */}
              {character.aliases && character.aliases.length > 0 && (
                  <View style={styles.metaRow}>
                    <ThemedText variant="small" color={theme.textMuted}>别称</ThemedText>
                    <View style={styles.aliasesContainer}>
                      {character.aliases.map((alias, index) => (
                          <View key={index} style={styles.aliasTag}>
                            <ThemedText variant="small" color={theme.textSecondary}>{alias}</ThemedText>
                          </View>
                      ))}
                    </View>
                  </View>
              )}

              {/* 籍贯 */}
              {character.hometown && (
                  <View style={styles.metaRow}>
                    <ThemedText variant="small" color={theme.textMuted}>籍贯</ThemedText>
                    <ThemedText variant="small" color={theme.textSecondary}>{character.hometown}</ThemedText>
                  </View>
              )}

              {/* 生卒 */}
              {(character.birth_year || character.death_year) && (
                  <View style={styles.metaRow}>
                    <ThemedText variant="small" color={theme.textMuted}>生卒</ThemedText>
                    <ThemedText variant="small" color={theme.textSecondary}>
                      {character.birth_year || '?'} - {character.death_year || '?'}
                    </ThemedText>
                  </View>
              )}
            </View>
          </View>

          {/* 生平纪事卡片 */}
          {character.summary && (
              <View style={styles.biographyCard}>
                <ThemedText variant="h4" color={theme.textPrimary} style={styles.cardTitle}>
                  生平纪事
                </ThemedText>
                <ThemedText variant="body" color={theme.textSecondary} style={styles.summaryText}>
                  {character.summary}
                </ThemedText>
              </View>
          )}

          {/* 人际网络卡片 */}
          <View style={styles.relationsCard}>
            <View style={styles.cardHeader}>
              <ThemedText variant="h4" color={theme.textPrimary}>
                人际网络
              </ThemedText>
              {allRelations.length > 0 && (
                  <TouchableOpacity onPress={handleViewGraph} style={styles.viewGraphBtn}>
                    <FontAwesome6 name="diagram-project" size={14} color={theme.primary} />
                    <ThemedText variant="small" color={theme.primary}>查看图谱</ThemedText>
                  </TouchableOpacity>
              )}
            </View>

            {allRelations.length > 0 ? (
                <View style={styles.relationsList}>
                  {allRelations.map(relation => renderRelation(relation, relation.isReverse))}
                </View>
            ) : (
                <View style={styles.emptyRelations}>
                  <FontAwesome6 name="users" size={32} color={theme.textMuted} />
                  <ThemedText variant="small" color={theme.textMuted} style={{ marginTop: 8 }}>
                    暂无关系数据
                  </ThemedText>
                </View>
            )}
          </View>

          {/* 生平大事时间线 */}
          {character.events.length > 0 && (
              <View style={styles.eventsCard}>
                <ThemedText variant="h4" color={theme.textPrimary} style={styles.cardTitle}>
                  生平大事
                </ThemedText>
                <View style={styles.eventsContainer}>
                  {character.events.map((event, index) => renderEvent(event, index, character.events.length))}
                </View>
              </View>
          )}
        </ScrollView>
      </Screen>
  );
}

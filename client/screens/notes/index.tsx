import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getUserIdentity } from '@/utils/userIdentity';

interface Note {
  id: number;
  volumeNumber: number;
  paragraphId: number;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  noteContent: string | null;
  color: string;
  markType: 'background' | 'underline' | 'wavy';
  createdAt: string;
  updatedAt: string;
  volumeInfo: {
    eraName: string;
    dynasty: string;
    volumeName: string;
  } | null;
}

const HIGHLIGHT_COLORS = [
  { name: '黄色', value: '#FFEB3B' },
  { name: '绿色', value: '#C8E6C9' },
  { name: '蓝色', value: '#BBDEFB' },
  { name: '粉色', value: '#F8BBD9' },
  { name: '橙色', value: '#FFE0B2' },
];

export default function NotesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'highlights' | 'notes'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const identity = await getUserIdentity();
      const queryParams = new URLSearchParams({ limit: '100' });
      if (identity.userId) {
        queryParams.append('userId', identity.userId.toString());
      } else if (identity.deviceId) {
        queryParams.append('deviceId', identity.deviceId);
      }

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notes/list?${queryParams.toString()}`
      );

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setNotes(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // 过滤笔记
  const filteredNotes = useMemo(() => {
    switch (filter) {
      case 'highlights':
        return notes.filter(n => !n.noteContent);
      case 'notes':
        return notes.filter(n => n.noteContent);
      default:
        return notes;
    }
  }, [notes, filter]);

  // 删除笔记
  const handleDelete = useCallback((note: Note) => {
    Alert.alert(
      '删除笔记',
      '确定要删除这条笔记吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const identity = await getUserIdentity();
            const queryParams = new URLSearchParams();
            if (identity.userId) {
              queryParams.append('userId', identity.userId.toString());
            } else if (identity.deviceId) {
              queryParams.append('deviceId', identity.deviceId);
            }

            const res = await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notes/${note.id}?${queryParams.toString()}`,
              { method: 'DELETE' }
            );

            if (res.ok) {
              setNotes(prev => prev.filter(n => n.id !== note.id));
            }
          },
        },
      ]
    );
  }, []);

  // 跳转到阅读页
  const handlePress = useCallback((note: Note) => {
    router.push('/volume-detail', { id: note.volumeNumber });
  }, [router]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 统计数据
  const stats = useMemo(() => ({
    total: notes.length,
    highlights: notes.filter(n => !n.noteContent).length,
    withNotes: notes.filter(n => n.noteContent).length,
  }), [notes]);

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={18} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>我的笔记</ThemedText>
        <View style={styles.headerRight} />
      </ThemedView>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.statItem, filter === 'all' && styles.statItemActive]}
          onPress={() => setFilter('all')}
        >
          <ThemedText variant="h4" color={filter === 'all' ? theme.primary : theme.textPrimary}>
            {stats.total}
          </ThemedText>
          <ThemedText variant="tiny" color={theme.textMuted}>全部</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, filter === 'highlights' && styles.statItemActive]}
          onPress={() => setFilter('highlights')}
        >
          <ThemedText variant="h4" color={filter === 'highlights' ? theme.primary : theme.textPrimary}>
            {stats.highlights}
          </ThemedText>
          <ThemedText variant="tiny" color={theme.textMuted}>高亮</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, filter === 'notes' && styles.statItemActive]}
          onPress={() => setFilter('notes')}
        >
          <ThemedText variant="h4" color={filter === 'notes' ? theme.primary : theme.textPrimary}>
            {stats.withNotes}
          </ThemedText>
          <ThemedText variant="tiny" color={theme.textMuted}>批注</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredNotes.length === 0 ? (
        <View style={styles.centerContainer}>
          <FontAwesome6 name="highlighter" size={48} color={theme.textMuted} />
          <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.lg }}>
            暂无笔记
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: Spacing.sm }}>
            阅读时选中文字即可添加高亮或批注
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredNotes.map(note => (
            <TouchableOpacity
              key={note.id}
              style={styles.noteCard}
              onPress={() => handlePress(note)}
              onLongPress={() => handleDelete(note)}
              activeOpacity={0.7}
            >
              {/* 高亮文本 */}
              <View style={[styles.highlightBox, { backgroundColor: note.color || '#FFEB3B' }]}>
                <ThemedText variant="body" color="#1F2937" style={styles.highlightText}>
                  {note.highlightedText}
                </ThemedText>
              </View>

              {/* 批注内容 */}
              {note.noteContent && (
                <View style={styles.noteContent}>
                  <FontAwesome6 name="pencil" size={12} color={theme.textMuted} />
                  <ThemedText variant="small" color={theme.textPrimary} style={styles.noteText}>
                    {note.noteContent}
                  </ThemedText>
                </View>
              )}

              {/* 元信息 */}
              <View style={styles.noteFooter}>
                <View style={styles.volumeInfo}>
                  <FontAwesome6 name="book" size={12} color={theme.primary} />
                  <ThemedText variant="tiny" color={theme.primary}>
                    第{note.volumeNumber}卷{note.volumeInfo ? ` · ${note.volumeInfo.eraName}` : ''}
                  </ThemedText>
                </View>
                <ThemedText variant="tiny" color={theme.textMuted}>
                  {formatDate(note.createdAt)}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

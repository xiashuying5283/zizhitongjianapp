import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getDeviceId } from '@/utils/deviceId';

interface Bookmark {
  id: number;
  volumeNumber: number;
  paragraphId: number | null;
  title: string | null;
  note: string | null;
  tags: string[];
  yearMark: string | null;
  emperor: string | null;
  createdAt: string;
  updatedAt: string;
  volumeInfo: {
    eraName: string;
    dynasty: string;
    volumeName: string;
  } | null;
}

export default function BookmarksScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();

      // 获取书签列表
      const bookmarksRes = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bookmarks?deviceId=${deviceId}`
      );

      if (bookmarksRes.ok) {
        const result = await bookmarksRes.json();
        if (result.success) {
          setBookmarks(result.data || []);
        }
      }

      // 获取标签列表
      const tagsRes = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bookmarks/tags?deviceId=${deviceId}`
      );

      if (tagsRes.ok) {
        const result = await tagsRes.json();
        if (result.success) {
          setAllTags(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // 过滤书签
  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    // 按标签筛选
    if (selectedTag) {
      result = result.filter(b => b.tags.includes(selectedTag));
    }

    // 按搜索文本筛选
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      result = result.filter(b => {
        const title = b.title?.toLowerCase() || '';
        const note = b.note?.toLowerCase() || '';
        const volumeName = b.volumeInfo?.volumeName?.toLowerCase() || '';
        return title.includes(keyword) || note.includes(keyword) || volumeName.includes(keyword);
      });
    }

    return result;
  }, [bookmarks, selectedTag, searchText]);

  // 删除书签
  const handleDelete = useCallback((bookmark: Bookmark) => {
    Alert.alert(
      '删除书签',
      '确定要删除这个书签吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const deviceId = await getDeviceId();
            const res = await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bookmarks/${bookmark.id}?deviceId=${deviceId}`,
              { method: 'DELETE' }
            );

            if (res.ok) {
              setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
            }
          },
        },
      ]
    );
  }, []);

  // 跳转到阅读页
  const handlePress = useCallback((bookmark: Bookmark) => {
    // 传递卷号和位置信息（如果有）
    const params: Record<string, string | number> = { id: bookmark.volumeNumber };
    
    // 如果有位置信息，传递给阅读页进行定位
    if (bookmark.yearMark) {
      params.yearMark = bookmark.yearMark;
    }
    if (bookmark.emperor) {
      params.emperor = bookmark.emperor;
    }
    
    router.push('/volume-detail', params);
  }, [router]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={18} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>我的书签</ThemedText>
        <View style={styles.headerRight} />
      </ThemedView>

      {/* Search Bar */}
      <ThemedView level="default" style={styles.searchBox}>
        <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索书签..."
          placeholderTextColor={theme.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </ThemedView>

      {/* Tags */}
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          <TouchableOpacity
            style={[styles.tag, selectedTag === null && styles.tagActive]}
            onPress={() => setSelectedTag(null)}
          >
            <ThemedText
              variant="small"
              color={selectedTag === null ? theme.buttonPrimaryText : theme.textPrimary}
            >
              全部
            </ThemedText>
          </TouchableOpacity>
          {allTags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTag === tag && styles.tagActive]}
              onPress={() => setSelectedTag(tag)}
            >
              <ThemedText
                variant="small"
                color={selectedTag === tag ? theme.buttonPrimaryText : theme.textPrimary}
              >
                {tag}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Bookmarks List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredBookmarks.length === 0 ? (
        <View style={styles.centerContainer}>
          <FontAwesome6 name="bookmark" size={48} color={theme.textMuted} />
          <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.lg }}>
            暂无书签
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: Spacing.sm }}>
            阅读时点击书签按钮即可添加
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.countText}>
            共 {filteredBookmarks.length} 个书签
          </ThemedText>

          {filteredBookmarks.map(bookmark => (
            <TouchableOpacity
              key={bookmark.id}
              style={styles.bookmarkCard}
              onPress={() => handlePress(bookmark)}
              onLongPress={() => handleDelete(bookmark)}
              activeOpacity={0.7}
            >
              <View style={styles.bookmarkHeader}>
                <View style={styles.volumeInfo}>
                  <FontAwesome6 name="book" size={14} color={theme.primary} />
                  <ThemedText variant="smallMedium" color={theme.primary}>
                    第{bookmark.volumeNumber}卷
                  </ThemedText>
                </View>
                <ThemedText variant="tiny" color={theme.textMuted}>
                  {formatDate(bookmark.createdAt)}
                </ThemedText>
              </View>

              <ThemedText variant="bodyMedium" color={theme.textPrimary} style={styles.title}>
                {bookmark.title || bookmark.volumeInfo?.volumeName || '未命名书签'}
              </ThemedText>

              {bookmark.note && (
                <ThemedText variant="small" color={theme.textSecondary} numberOfLines={2}>
                  {bookmark.note}
                </ThemedText>
              )}

              {bookmark.tags.length > 0 && (
                <View style={styles.tagList}>
                  {bookmark.tags.map((tag, index) => (
                    <View key={index} style={styles.miniTag}>
                      <ThemedText variant="tiny" color={theme.textMuted}>
                        {tag}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

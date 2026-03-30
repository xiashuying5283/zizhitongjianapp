import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useScriptText } from '@/hooks/useScriptText';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { getRecentRead, RecentRead as ApiRecentRead } from '@/utils/readingProgress';
import { getStoredUser } from '@/utils/auth';
import { getDeviceId } from '@/utils/deviceId';
import {
  getDynastyGroupsCache,
  setDynastyGroupsCache,
  getRecentReadCache,
  setRecentReadCache,
  DynastyGroup as CachedDynastyGroup,
  clearRecentReadCache,
} from '@/utils/readingCache';

type ReadingStatus = 'unread' | 'reading' | 'read';

interface Volume {
  id: number;
  volume: number;
  name: string;
  year_start: number | null;
  year_end: number | null;
  status: ReadingStatus;
  progress: number;
}

interface DynastyGroup {
  dynasty: string;
  dynastyLabel: string;
  count: number;
  volumes: Volume[];
}

interface SearchResult {
  id: number;
  volume_number: number;
  year_mark: string;
  emperor: string;
  bc_year: number | null;
  event_index: number;
  paragraph_index: number;
  content_highlight: string | null;
  content: string;
  translation: string | null;
  is_chenguangyue: boolean | null;
}

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export default function ReadingScreen() {
  const { theme } = useTheme();
  const { t } = useScriptText();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDynasty, setSelectedDynasty] = useState<string | null>(null);

  // 初始化时检查缓存
  const cachedGroups = useMemo(() => getDynastyGroupsCache(), []);
  const cachedRecentRead = useMemo(() => getRecentReadCache(), []);

  const [loading, setLoading] = useState(!cachedGroups); // 有缓存则不显示 loading
  const [dynastyGroups, setDynastyGroups] = useState<DynastyGroup[]>(cachedGroups || []);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    cachedGroups && cachedGroups.length > 0 ? new Set([cachedGroups[0].dynasty]) : new Set()
  );
  const expandedGroupsRef = useRef<Set<string>>(
    cachedGroups && cachedGroups.length > 0 ? new Set([cachedGroups[0].dynasty]) : new Set()
  );

  const [recentRead, setRecentRead] = useState<ApiRecentRead | null>(cachedRecentRead);
  const userIdentityRef = useRef<{ userId?: number; deviceId?: string } | null>(null);

  // 获取用户标识（缓存）
  const getUserIdentity = useCallback(async () => {
    if (userIdentityRef.current) {
      return userIdentityRef.current;
    }
    const user = await getStoredUser();
    if (user) {
      userIdentityRef.current = { userId: user.id };
    } else {
      const deviceId = await getDeviceId();
      userIdentityRef.current = { deviceId };
    }
    return userIdentityRef.current;
  }, []);

  // 获取最近阅读
  const fetchRecentRead = useCallback(async (silent = false) => {
    const data = await getRecentRead();
    if (data) {
      setRecentRead(data);
      setRecentReadCache(data);
    }
  }, []);

  /**
   * 服务端文件：server/src/routes/volumes.ts
   * 接口：GET /api/v1/volumes/dynasty-groups
   * Query 参数：userId?: number, deviceId?: string
   */
  const fetchDynastyGroups = useCallback(async (silent = false) => {
    // 如果没有缓存，显示 loading
    if (!silent) {
      setLoading(true);
    }
    try {
      const identity = await getUserIdentity();
      const params = new URLSearchParams();
      if (identity.userId) {
        params.append('userId', String(identity.userId));
      } else if (identity.deviceId) {
        params.append('deviceId', identity.deviceId);
      }

      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/volumes/dynasty-groups?${params.toString()}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setDynastyGroups(result.data);
        setDynastyGroupsCache(result.data);
        // 默认展开第一个分组（仅首次）
        if (result.data.length > 0 && expandedGroupsRef.current.size === 0) {
          expandedGroupsRef.current = new Set([result.data[0].dynasty]);
          setExpandedGroups(expandedGroupsRef.current);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dynasty groups:', error);
    } finally {
      setLoading(false);
    }
  }, [getUserIdentity]);

  /**
   * 服务端文件：server/src/routes/paragraphs.ts
   * 接口：GET /api/v1/paragraphs/search
   * Query 参数：keyword: string, limit?: number, offset?: number
   */
  const searchFullText = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/paragraphs/search?keyword=${encodeURIComponent(keyword.trim())}&limit=20`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Full-text search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // 搜索防抖：输入时同时触发全文搜索
  useEffect(() => {
    if (searchText.trim()) {
      const timer = setTimeout(() => {
        searchFullText(searchText);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchText, searchFullText]);

  // 初始化 - 缓存优先加载
  // 使用函数式更新，避免依赖外部变量
  useFocusEffect(
    useCallback(() => {
      // 清除最近阅读缓存，确保每次进入首页都获取最新数据
      clearRecentReadCache();

      // 在回调内部检查缓存
      const cached = getDynastyGroupsCache();

      if (cached) {
        // 有缓存：静默刷新（不阻塞 UI）
        fetchRecentRead(true);
        fetchDynastyGroups(true);
      } else {
        // 无缓存：正常加载
        fetchRecentRead();
        fetchDynastyGroups();
      }
    }, [fetchRecentRead, fetchDynastyGroups])
  );

  // 切换分组展开/收起
  const toggleGroup = useCallback((dynasty: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(dynasty)) {
        next.delete(dynasty);
      } else {
        next.add(dynasty);
      }
      expandedGroupsRef.current = next;  // 同步更新 ref
      return next;
    });
  }, []);

  // 过滤分组（卷目搜索）
  const filteredGroups = useMemo(() => {
    let groups = dynastyGroups;

    // 按朝代筛选
    if (selectedDynasty) {
      groups = groups.filter(g => g.dynasty === selectedDynasty);
    }

    // 按搜索文本筛选
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      groups = groups.map(group => ({
        ...group,
        volumes: group.volumes.filter(v => {
          const volumeTitle = `第${v.volume}卷`;
          return volumeTitle.includes(keyword) || v.name.toLowerCase().includes(keyword);
        }),
      })).filter(g => g.volumes.length > 0);
    }

    return groups;
  }, [dynastyGroups, selectedDynasty, searchText]);

  const getStatusColor = (status: ReadingStatus) => {
    switch (status) {
      case 'reading': return theme.statusReading || '#D97706';
      case 'read': return theme.statusRead || '#059669';
      case 'unread': return theme.statusUnread || '#9CA3AF';
      default: return theme.textMuted;
    }
  };

  const getStatusText = (status: ReadingStatus) => {
    switch (status) {
      case 'reading': return '在读';
      case 'read': return '已读';
      case 'unread': return '未读';
      default: return '';
    }
  };

  const getStatusIcon = (status: ReadingStatus) => {
    switch (status) {
      case 'reading': return 'bookmark';
      case 'read': return 'star';
      case 'unread': return 'circle';
      default: return 'circle';
    }
  };

  // 渲染朝代筛选标签
  const renderDynastyTags = () => (
    <View style={styles.filterSection}>
      <ThemedText variant="labelSmall" color={theme.textMuted} style={styles.filterLabel}>
        快速筛选
      </ThemedText>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTagsContainer}
        >
        <TouchableOpacity
          key="all"
          style={[styles.filterTag, selectedDynasty === null && styles.filterTagActive]}
          onPress={() => setSelectedDynasty(null)}
        >
          <ThemedText
            variant="small"
            color={selectedDynasty === null ? theme.buttonPrimaryText : theme.textPrimary}
          >
            全部
          </ThemedText>
        </TouchableOpacity>
        {dynastyGroups.map(group => (
          <TouchableOpacity
            key={group.dynasty}
            style={[styles.filterTag, selectedDynasty === group.dynasty && styles.filterTagActive]}
            onPress={() => setSelectedDynasty(group.dynasty)}
          >
            <ThemedText
              variant="small"
              color={selectedDynasty === group.dynasty ? theme.buttonPrimaryText : theme.textPrimary}
            >
              {group.dynastyLabel}
            </ThemedText>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>
    </View>
  );

  // 渲染可折叠分组
  const renderDynastyGroup = (group: DynastyGroup) => {
    const isExpanded = expandedGroups.has(group.dynasty);
    const readCount = group.volumes.filter(v => v.status === 'read').length;
    const readingCount = group.volumes.filter(v => v.status === 'reading').length;

    return (
      <View key={group.dynasty} style={styles.groupContainer}>
        {/* 分组头部 */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroup(group.dynasty)}
          activeOpacity={0.7}
        >
          <View style={styles.groupHeaderLeft}>
            <FontAwesome6
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={14}
              color={theme.textSecondary}
            />
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.groupTitle}>
              {group.dynastyLabel}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              （共{group.count}卷）
            </ThemedText>
          </View>
          <View style={styles.groupStats}>
            {readCount > 0 && (
              <View style={[styles.miniBadge, { backgroundColor: (theme.statusRead || '#059669') + '20' }]}>
                <ThemedText variant="tiny" color={theme.statusRead || '#059669'}>
                  {readCount}已读
                </ThemedText>
              </View>
            )}
            {readingCount > 0 && (
              <View style={[styles.miniBadge, { backgroundColor: (theme.statusReading || '#D97706') + '20' }]}>
                <ThemedText variant="tiny" color={theme.statusReading || '#D97706'}>
                  {readingCount}在读
                </ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* 分组内容 */}
        {isExpanded && (
          <View style={styles.groupContent}>
            {group.volumes.map(volume => {
              // 格式化年份范围
              const formatYearRange = () => {
                if (volume.year_start && volume.year_end) {
                  const startStr = volume.year_start < 0 
                    ? `前${Math.abs(volume.year_start)}` 
                    : `${volume.year_start}`;
                  const endStr = volume.year_end < 0 
                    ? `前${Math.abs(volume.year_end)}` 
                    : `${volume.year_end}`;
                  return `${startStr}-${endStr}年`;
                }
                return null;
              };
              const yearRange = formatYearRange();
              
              return (
                <TouchableOpacity
                  key={volume.id}
                  style={styles.volumeItem}
                  onPress={() => router.push('/volume-detail', { id: volume.volume })}
                  activeOpacity={0.7}
                >
                  <View style={styles.volumeIcon}>
                    <FontAwesome6 name="book" size={14} color={theme.textMuted} />
                  </View>
                  <View style={styles.volumeInfo}>
                    <ThemedText variant="body" color={theme.textPrimary}>
                      第{volume.volume}卷 · {volume.name}
                    </ThemedText>
                    {yearRange && (
                      <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 2 }}>
                        公元{yearRange}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.volumeStatus}>
                    <FontAwesome6
                      name={getStatusIcon(volume.status)}
                      size={12}
                      color={getStatusColor(volume.status)}
                      solid={volume.status === 'read'}
                    />
                    <ThemedText variant="tiny" color={getStatusColor(volume.status)} style={{ marginLeft: 4 }}>
                      {getStatusText(volume.status)}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.md }}>
            加载中...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h1" color={theme.textPrimary}>资治通鉴</ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: Spacing.xs }}>
            司马光 · 编年体通史
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: Spacing.xs }}>
            胡三省 · 音注
          </ThemedText>
        </ThemedView>

        {/* Recent Reading */}
        <ThemedView level="root" style={styles.recentReading}>
          {recentRead ? (
            <>
              <ThemedText variant="labelSmall" color={theme.textMuted} style={styles.recentLabel}>
                上次读到
              </ThemedText>
              <View style={styles.recentContent}>
                <View style={styles.recentInfo}>
                  <ThemedText variant="h4" color={theme.textPrimary}>
                    第{recentRead.volume}卷 · {recentRead.name}
                  </ThemedText>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.recentMeta}>
                    {recentRead.era} · {recentRead.year} · 已读 {recentRead.progress}%
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={() => router.push('/volume-detail', {
                    id: recentRead.volume,
                    scrollToParagraphId: recentRead.progress > 0 ? recentRead.lastParagraphIndex : undefined,
                  })}
                >
                  <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                    继续阅读
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ThemedText variant="labelSmall" color={theme.textMuted} style={styles.recentLabel}>
                开始阅读
              </ThemedText>
              <View style={styles.recentContent}>
                <View style={styles.recentInfo}>
                  <ThemedText variant="h4" color={theme.textPrimary}>
                    第1卷 · 周纪一
                  </ThemedText>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.recentMeta}>
                    周 · 前403-前369年
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={() => router.push('/volume-detail', { id: 1 })}
                >
                  <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                    开始阅读
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ThemedView>

        {/* Search Bar */}
        <ThemedView level="default" style={styles.searchBox}>
          <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索卷目或全文..."
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

        {/* Full-text Search Results */}
        {searchText.trim() && (
          <View style={styles.searchResultsSection}>
            <View style={styles.searchResultHeader}>
              <ThemedText variant="labelSmall" color={theme.textMuted}>
                {searching ? t('全文搜索中...') : `${t('全文搜索')} ${searchResults.length} ${t('条结果')}`}
              </ThemedText>
            </View>
            
            {searching ? (
              <View style={[styles.centerContainer, { paddingVertical: Spacing.xl }]}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.searchResultsList}>
                {searchResults.slice(0, 5).map((result, index) => (
                  <TouchableOpacity
                    key={result.id || index}
                    style={styles.searchResultItem}
                    onPress={() => router.push('/volume-detail', { 
                      id: result.volume_number,
                      highlightId: result.id 
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultHeader}>
                      <ThemedText variant="smallMedium" color={theme.primary}>
                        {t('第')}{result.volume_number}{t('卷')}
                      </ThemedText>
                      <ThemedText variant="tiny" color={theme.textMuted}>
                        {result.emperor} · {result.year_mark}
                      </ThemedText>
                    </View>
                    <ThemedText variant="body" color={theme.textPrimary} numberOfLines={2}>
                      {result.content_highlight || result.content}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
                {searchResults.length > 5 && (
                  <TouchableOpacity 
                    style={styles.moreResultsButton}
                    onPress={() => router.push('/volume-detail', { id: searchResults[0].volume_number })}
                  >
                    <ThemedText variant="small" color={theme.primary}>
                      {t('查看更多结果')}...
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>
        )}

        {/* Dynasty Filter Tags */}
        {renderDynastyTags()}

        {/* Dynasty Groups */}
        <View style={styles.groupsContainer}>
          {filteredGroups.map(group => renderDynastyGroup(group))}
        </View>

        {/* Empty State */}
        {filteredGroups.length === 0 && !searchText.trim() && (
          <View style={styles.centerContainer}>
            <FontAwesome6 name="magnifying-glass" size={32} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.md }}>
              {t('未找到相关内容')}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

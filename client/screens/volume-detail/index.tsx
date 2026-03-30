import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Text, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, Pressable } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/contexts/SettingsContext';
import { useScriptText } from '@/hooks/useScriptText';
import { Screen } from '@/components/Screen';
import { VerticalReader } from '@/components/VerticalReader';
import { HorizontalReader } from '@/components/HorizontalReader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createAudioPlayer, AudioPlayer, AudioStatus } from 'expo-audio';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { updateReadingProgress, getReadingRecords } from '@/utils/readingProgress';
import { getDeviceId } from '@/utils/deviceId';
import {
  loadReadingSettings,
  getCachedSettings,
  saveFontSize as saveFontSizeToStorage,
  saveBackgroundTheme as saveBackgroundThemeToStorage,
  saveViewMode as saveViewModeToStorage,
  saveTextLayout as saveTextLayoutToStorage,
  saveTtsVoice as saveTtsVoiceToStorage,
  saveTtsSpeed as saveTtsSpeedToStorage,
} from '@/utils/readingSettings';
import {
  getCachedVolume,
  setCachedVolume,
  Paragraph,
  YearGroup,
  VolumeData,
  CatalogYear,
  CatalogEmperor,
  CatalogData,
} from '@/utils/volumeCache';
import { createUserNote, fetchUserNotes, updateUserNote, deleteUserNote, TextSelection, NoteMarker, UserNote } from '@/utils/notes';

// TTS朗读分段（按条目）
interface TTSSegment {
  id: number;           // paragraph id
  yearIndex: number;    // 年份索引
  paragraphIndex: number; // 条目索引（在年份内）
  yearMark: string;     // 年份标识
  emperor: string;      // 帝王名
  text: string;         // 朗读文本
}

interface VolumeMeta {
  volume_number: number;
  volume_name: string;
  dynasty: string;
  year_start: number | null;
  year_end: number | null;
  time_range: string | null;
  introduction: string | null;  // 卷首注
}

type ViewMode = 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation' | 'translation';
type TextLayout = 'horizontal' | 'vertical';
type BackgroundTheme = 'light' | 'dark' | 'sepia';
type SettingsTab = 'catalog' | 'font' | 'background' | 'viewMode' | 'tts' | null;

const FONT_SIZES = [
  { label: '小', value: 16 },
  { label: '中', value: 18 },
  { label: '大', value: 20 },
  { label: '特大', value: 22 },
];

const BACKGROUND_THEMES: Record<BackgroundTheme, { background: string; text: string; name: string; color: string }> = {
  light: { background: '#FFFFFF', text: '#1E1E1E', name: '亮色', color: '#FFFFFF' },
  dark: { background: '#121212', text: '#E8E8E8', name: '暗色', color: '#121212' },
  sepia: { background: '#F5E6D3', text: '#4A3C31', name: '护眼', color: '#F5E6D3' },
};

// TTS音色选项
const TTS_VOICES = [
  { id: 'default', name: '小何', desc: '通用女声，清晰自然' },
  { id: 'male', name: '云舟', desc: '标准男声，沉稳大气' },
  { id: 'female', name: 'Vivi', desc: '中英双语女声' },
  { id: 'audiobook', name: '有声书', desc: '有声书专用女声，适合长篇朗读' },
  { id: 'elegant_male', name: '儒雅', desc: '儒雅男声，适合古文朗读' },
];

// TTS语速选项
const TTS_SPEEDS = [
  { label: '慢速', value: -20 },
  { label: '正常', value: 0 },
  { label: '快速', value: 20 },
  { label: '极快', value: 40 },
];

export default function VolumeDetailScreen() {
  const { theme } = useTheme();
  const { scriptMode, setScriptMode, fontFamily, setFontFamily } = useSettings();
  const { t } = useScriptText();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id, highlightId, keyword, yearMark, emperor, scrollToParagraphId } = useSafeSearchParams<{ 
    id: string; 
    highlightId?: string;
    keyword?: string;
    yearMark?: string;
    emperor?: string;
    scrollToParagraphId?: number;  // 从首页传递的段落ID，用于直接恢复位置
  }>();
  const volumeNumber = id ? parseInt(id) : null;  // 当前卷号
  const htmlWebViewRef = useRef<any>(null);  // HTML 读者的 WebView 引用
  const scrollToTargetRef = useRef(0);  // 当前滚动目标段落 ID（用于判断重试是否过期）
  const scrollToSucceededRef = useRef(false);  // 当前滚动是否已成功
  const textLayoutRef = useRef<TextLayout>('horizontal');  // 避免 stale closure
  const globalIndexRef = useRef(0);  // 当前可见段落的全局索引（用于计算阅读进度）
  const lastTitleTapTime = useRef(0);  // 用于双击标题检测

  // 工具栏和面板状态
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>(null);
  const [swipeHint, setSwipeHint] = useState<'prev' | 'next' | null>(null);  // 滑动提示

  // 书签相关状态
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkSubmitting, setBookmarkSubmitting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 当前可见位置（用于书签定位和阅读进度保存）
  const [currentVisibleYear, setCurrentVisibleYear] = useState<{ yearMark: string; emperor: string } | null>(null);
  const currentVisibleParagraphIdRef = useRef<number>(0);  // 当前可见的第一个段落ID（用于保存阅读进度）
  const totalParagraphsRef = useRef<number>(0);  // 总段落数（用于计算进度）

  // TTS 播放相关状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);
  const [totalSegments, setTotalSegments] = useState(0);
  const [playingProgress, setPlayingProgress] = useState(''); // 播放进度文字
  const [highlightedParagraphId, setHighlightedParagraphId] = useState<number | null>(null); // 当前高亮的条目ID
  
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const ttsSegmentsRef = useRef<TTSSegment[]>([]); // TTS分段数据（按条目）
  const audioCacheRef = useRef<Map<number, string>>(new Map()); // 音频缓存
  const isPlayingRef = useRef(false); // 播放状态引用
  const currentPlayingIndexRef = useRef(-1); // 当前播放索引引用
  const preloadAbortRef = useRef<boolean>(false); // 预加载中断标志

  // 阅读偏好设置（从缓存初始化）
  const cachedSettings = getCachedSettings();
  const [fontSize, setFontSize] = useState(cachedSettings.fontSize);
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>(cachedSettings.backgroundTheme);
  const [viewMode, setViewMode] = useState<ViewMode>(cachedSettings.viewMode);
  const [textLayout, setTextLayout] = useState<TextLayout>(cachedSettings.textLayout);
  const [ttsVoice, setTtsVoice] = useState(cachedSettings.ttsVoice);
  const [ttsSpeed, setTtsSpeed] = useState(cachedSettings.ttsSpeed);

  // 同步 textLayoutRef
  useEffect(() => {
    textLayoutRef.current = textLayout;
  }, [textLayout]);

  const [volumeData, setVolumeData] = useState<VolumeData | null>(null);
  const [volumeMeta, setVolumeMeta] = useState<VolumeMeta | null>(null);
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // 文本选择状态
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showMarkMenu, setShowMarkMenu] = useState(false);
  const [selectedMarkType, setSelectedMarkType] = useState<'background' | 'underline' | 'wavy'>('background');
  const [selectedMarkColor, setSelectedMarkColor] = useState('#FECACA');

  // 用户标注数据
  const [userNotes, setUserNotes] = useState<NoteMarker[]>([]);
  const [clickedNote, setClickedNote] = useState<NoteMarker | null>(null);
  const [showNoteDetail, setShowNoteDetail] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteColor, setEditNoteColor] = useState('');
  const [editNoteMarkType, setEditNoteMarkType] = useState<'background' | 'underline' | 'wavy'>('background');
  const [savingEditNote, setSavingEditNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);

  const initializedRef = useRef(false);
  const currentVolumeRef = useRef<number | null>(null);
  const loadedParagraphsRef = useRef(0);
  const pendingJumpRef = useRef<{ bcYear: number | null; yearName?: string; emperorName?: string } | null>(null);
  // 字体大小切换
  const handleSetFontSize = useCallback(async (size: number) => {
    setFontSize(size);
    await saveFontSizeToStorage(size);
  }, []);

  // 背景主题切换
  const handleSetBackgroundTheme = useCallback(async (theme: BackgroundTheme) => {
    setBackgroundTheme(theme);
    await saveBackgroundThemeToStorage(theme);
  }, []);

  // 显示模式切换
  const handleSetViewMode = useCallback(async (mode: ViewMode) => {
    setViewMode(mode);
    await saveViewModeToStorage(mode);
  }, []);

  // 文字排版方向切换
  const handleSetTextLayout = useCallback(async (layout: TextLayout) => {
    setTextLayout(layout);
    await saveTextLayoutToStorage(layout);
  }, []);

  // TTS音色切换
  const handleSetTtsVoice = useCallback(async (voice: string) => {
    setTtsVoice(voice);
    await saveTtsVoiceToStorage(voice);
  }, []);

  // TTS语速切换
  const handleSetTtsSpeed = useCallback(async (speed: number) => {
    setTtsSpeed(speed);
    await saveTtsSpeedToStorage(speed);
  }, []);

  // 打开添加书签弹窗
  const handleOpenBookmarkModal = useCallback(() => {
    // 预设标题为当前卷名
    const defaultTitle = volumeMeta?.volume_name || `第${volumeNumber}卷`;
    setBookmarkTitle(defaultTitle);
    setBookmarkNote('');
    
    // 计算当前可见的第一个年份作为书签位置
    if (volumeData?.years && volumeData.years.length > 0) {
      // WebView 模式：使用可见段落索引来估算年份
      const visibleIndex = globalIndexRef.current;
      let totalParagraphs = 0;
      
      for (const year of volumeData.years) {
        totalParagraphs += year.paragraphs.length;
        if (visibleIndex < totalParagraphs) {
          setCurrentVisibleYear({
            yearMark: year.year_mark,
            emperor: year.emperor,
          });
          break;
        }
      }
    }
    
    setBookmarkModalVisible(true);
  }, [volumeMeta, volumeNumber, volumeData]);

  // 提交书签
  const handleSubmitBookmark = useCallback(async () => {
    if (bookmarkSubmitting) return;
    
    setBookmarkSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          volumeNumber: volumeNumber,
          yearMark: currentVisibleYear?.yearMark,
          emperor: currentVisibleYear?.emperor,
          title: bookmarkTitle.trim() || undefined,
          note: bookmarkNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsBookmarked(true);
        setBookmarkModalVisible(false);
      }
    } catch (error) {
      console.error('添加书签失败:', error);
    } finally {
      setBookmarkSubmitting(false);
    }
  }, [bookmarkTitle, bookmarkNote, bookmarkSubmitting, volumeNumber, currentVisibleYear]);

  // 检查当前卷是否已添加书签
  const checkBookmarkStatus = useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bookmarks?deviceId=${deviceId}&volumeNumber=${volumeNumber}`
      );
      if (res.ok) {
        const result = await res.json();
        setIsBookmarked(result.data && result.data.length > 0);
      }
    } catch (error) {
      console.error('检查书签状态失败:', error);
    }
  }, [volumeNumber]);

  // 初始化时检查书签状态
  useEffect(() => {
    checkBookmarkStatus();
  }, [checkBookmarkStatus]);

  // ==================== 阅读统计 ====================
  const readingStartTimeRef = useRef<number>(0);  // 开始阅读的时间戳
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);  // 定时提交
  const lastSubmitTimeRef = useRef<number>(0);  // 上次提交时间
  const isTrackingTimeRef = useRef<boolean>(false);  // 是否正在计时

  // 提交阅读统计
  const submitReadingStats = useCallback(async (duration: number) => {
    if (duration <= 0 || !volumeNumber) return;
    
    try {
      const deviceId = await getDeviceId();
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/reading-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          volumeNumber,
          duration: Math.floor(duration),  // 秒
          paragraphsRead: 1,  // 至少读了1段
        }),
      });
    } catch (error) {
      console.error('提交阅读统计失败:', error);
    }
  }, [volumeNumber]);

  // 开始统计阅读时长
  useFocusEffect(
    useCallback(() => {
      // 页面获得焦点时开始计时
      isTrackingTimeRef.current = true;
      readingStartTimeRef.current = Date.now();
      lastSubmitTimeRef.current = Date.now();

      // 每30秒提交一次统计数据
      statsIntervalRef.current = setInterval(() => {
        if (!isTrackingTimeRef.current) return;
        
        const now = Date.now();
        const elapsed = Math.floor((now - lastSubmitTimeRef.current) / 1000);
        if (elapsed >= 30) {
          submitReadingStats(elapsed);
          lastSubmitTimeRef.current = now;
        }
      }, 30000);

      // 页面失去焦点时停止计时并提交剩余时长
      return () => {
        isTrackingTimeRef.current = false;
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
        const finalElapsed = Math.floor((Date.now() - lastSubmitTimeRef.current) / 1000);
        if (finalElapsed > 0) {
          submitReadingStats(finalElapsed);
        }
      };
    }, [submitReadingStats])
  );

  // 清理音频资源
  useEffect(() => {
    return () => {
      preloadAbortRef.current = true;
      isPlayingRef.current = false;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
      audioCacheRef.current.clear();
    };
  }, []);

  // 获取当前显示的文本内容
  const getDisplayText = useCallback((paragraph: Paragraph): string => {
    const showAnnotation = viewMode.includes('annotation');
    
    if (scriptMode === 'traditional') {
      if (showAnnotation && paragraph.with_notes_traditional) {
        return paragraph.with_notes_traditional;
      }
      return paragraph.content_traditional || paragraph.content;
    } else {
      if (showAnnotation && paragraph.with_notes) {
        return paragraph.with_notes;
      }
      return paragraph.content;
    }
  }, [viewMode, scriptMode]);

  // 提取所有条目的文本（按条目分段，保存完整信息）
  const extractSegments = useCallback((): TTSSegment[] => {
    if (!volumeData?.years) return [];
    
    const segments: TTSSegment[] = [];
    
    for (let yearIndex = 0; yearIndex < volumeData.years.length; yearIndex++) {
      const year = volumeData.years[yearIndex];
      for (let pIndex = 0; pIndex < year.paragraphs.length; pIndex++) {
        const paragraph = year.paragraphs[pIndex];
        const text = getDisplayText(paragraph);
        if (text && text.trim()) {
          segments.push({
            id: paragraph.id,
            yearIndex,
            paragraphIndex: pIndex,
            yearMark: year.year_mark,
            emperor: year.emperor,
            text: text.trim(),
          });
        }
      }
    }
    return segments;
  }, [volumeData, getDisplayText]);

  // 获取单段音频（带缓存）
  const fetchAudioForSegment = useCallback(async (index: number): Promise<string | null> => {
    const segments = ttsSegmentsRef.current;
    console.log('[TTS] fetchAudioForSegment called, index:', index, 'segments length:', segments.length);
    if (index < 0 || index >= segments.length) return null;
    
    // 检查缓存
    const cached = audioCacheRef.current.get(index);
    if (cached) {
      console.log('[TTS] Using cached audio for index:', index);
      return cached;
    }
    
    const segment = segments[index];
    if (!segment?.text) {
      console.log('[TTS] No text for segment:', index);
      return null;
    }
    
    console.log('[TTS] Fetching audio for text:', segment.text.substring(0, 50));
    
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: segment.text.substring(0, 500), // 限制长度
          speaker: ttsVoice,
          speechRate: ttsSpeed,
        }),
      });

      if (!res.ok) {
        console.log('[TTS] API response not ok:', res.status);
        return null;
      }
      
      const result = await res.json();
      console.log('[TTS] API result:', result.success, 'audioUri:', result.data?.audioUri ? 'exists' : 'missing');
      if (result.success && result.data?.audioUri) {
        audioCacheRef.current.set(index, result.data.audioUri);
        return result.data.audioUri;
      }
    } catch (error) {
      console.error(`获取第${index}段音频失败:`, error);
    }
    return null;
  }, [ttsVoice, ttsSpeed]);

  // 预加载接下来的音频
  const preloadNextSegments = useCallback(async (fromIndex: number, count: number = 3) => {
    if (preloadAbortRef.current) return;
    
    const segments = ttsSegmentsRef.current;
    for (let i = fromIndex; i < Math.min(fromIndex + count, segments.length); i++) {
      if (preloadAbortRef.current) break;
      if (!audioCacheRef.current.has(i)) {
        await fetchAudioForSegment(i);
      }
    }
  }, [fetchAudioForSegment]);

  // 滚动到指定条目
  const scrollToParagraph = useCallback((yearIndex: number, paragraphIndex: number) => {
    // 通过 WebView JS 滚动
    const segments = ttsSegmentsRef.current;
    const segment = segments.find(s => s.yearIndex === yearIndex && s.paragraphIndex === paragraphIndex);
    if (segment) {
      injectScroll(`window.__scrollToParagraph && window.__scrollToParagraph(${segment.id});`);
    } else {
      injectScroll(`window.__scrollToYear && window.__scrollToYear(${yearIndex});`);
    }
  }, []);

  // 播放指定索引的段落
  const playSegment = useCallback(async (index: number) => {
    const segments = ttsSegmentsRef.current;
    console.log('[TTS] playSegment called, index:', index, 'segments length:', segments.length, 'isPlaying:', isPlayingRef.current);
    
    if (index < 0 || index >= segments.length) {
      // 播放完毕
      console.log('[TTS] Playback finished');
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentPlayingIndex(-1);
      currentPlayingIndexRef.current = -1;
      setPlayingProgress('');
      setHighlightedParagraphId(null);
      return;
    }

    const segment = segments[index];
    console.log('[TTS] Playing segment:', segment.yearMark, 'text:', segment.text.substring(0, 30));
    
    // 更新状态
    currentPlayingIndexRef.current = index;
    setCurrentPlayingIndex(index);
    setHighlightedParagraphId(segment.id); // 高亮当前条目
    
    // 更新进度显示（年份和条目信息）
    const yearStartIndex = segments.findIndex(s => 
      s.yearIndex === segment.yearIndex && s.paragraphIndex === 0
    );
    const itemInYear = index - yearStartIndex + 1;
    const totalInYear = segments.filter(s => s.yearIndex === segment.yearIndex).length;
    setPlayingProgress(`${segment.yearMark} · ${itemInYear}/${totalInYear}`);

    // 获取音频URL
    let audioUri: string | undefined = audioCacheRef.current.get(index);
    console.log('[TTS] Cache check for index:', index, 'result:', audioUri ? 'found' : 'not found');
    if (!audioUri) {
      console.log('[TTS] Fetching audio for index:', index);
      const fetchedUri = await fetchAudioForSegment(index);
      audioUri = fetchedUri || undefined;
      console.log('[TTS] Fetched audio result:', audioUri ? 'success' : 'failed');
    }

    console.log('[TTS] Before play check - audioUri:', !!audioUri, 'isPlayingRef:', isPlayingRef.current);
    if (!audioUri || !isPlayingRef.current) {
      console.log('[TTS] Stopping - no audio or not playing');
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    // 滚动到当前条目（如果需要）
    scrollToParagraph(segment.yearIndex, segment.paragraphIndex);

    try {
      // 卸载之前的音频
      if (audioPlayerRef.current) {
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }

      // 创建新的音频播放器
      const player = createAudioPlayer({ uri: audioUri });
      
      // 监听播放状态变化
      player.addListener('playbackStatusUpdate', async (status: AudioStatus) => {
        if (status.didJustFinish) {
          // 播放完毕，自动播放下一段
          if (isPlayingRef.current) {
            playSegment(currentPlayingIndexRef.current + 1);
          }
        }
      });

      audioPlayerRef.current = player;
      
      // 开始播放
      player.play();

      // 后台预加载接下来的段落
      preloadNextSegments(index + 1, 2);
    } catch (error) {
      console.error('播放音频失败:', error);
      // 跳过当前段，继续播放下一段
      if (isPlayingRef.current) {
        playSegment(index + 1);
      }
    }
  }, [fetchAudioForSegment, preloadNextSegments, scrollToParagraph]);

  // 开始朗读
  const handleStartPlay = useCallback(async () => {
    console.log('[TTS] handleStartPlay called');
    if (!volumeData?.years) {
      Alert.alert('提示', '没有可朗读的内容');
      return;
    }

    const segments = extractSegments();
    console.log('[TTS] Extracted segments:', segments.length);
    if (segments.length === 0) {
      Alert.alert('提示', '没有可朗读的内容');
      return;
    }

    // 初始化
    ttsSegmentsRef.current = segments;
    audioCacheRef.current.clear();
    preloadAbortRef.current = false;
    setTotalSegments(segments.length);

    // 先预加载第一段
    setPlayingProgress('加载中...');
    console.log('[TTS] Pre-loading first segment...');
    const firstAudio = await fetchAudioForSegment(0);
    console.log('[TTS] First audio loaded:', !!firstAudio);
    if (!firstAudio) {
      Alert.alert('提示', '语音加载失败，请稍后重试');
      setPlayingProgress('');
      return;
    }

    // 开始播放
    isPlayingRef.current = true;
    setIsPlaying(true);
    console.log('[TTS] Starting playback...');
    playSegment(0);

    // 后台预加载接下来的段落
    preloadNextSegments(1, 3);
  }, [volumeData, extractSegments, fetchAudioForSegment, playSegment, preloadNextSegments]);

  // 跳转到上一个条目
  const handlePreviousItem = useCallback(() => {
    if (currentPlayingIndexRef.current > 0) {
      playSegment(currentPlayingIndexRef.current - 1);
    }
  }, [playSegment]);

  // 跳转到下一个条目
  const handleNextItem = useCallback(() => {
    if (currentPlayingIndexRef.current < ttsSegmentsRef.current.length - 1) {
      playSegment(currentPlayingIndexRef.current + 1);
    }
  }, [playSegment]);

  // 暂停朗读
  const handlePausePlay = useCallback(() => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
      } catch (e) {
        console.error('暂停失败:', e);
      }
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  // 继续播放
  const handleResumePlay = useCallback(() => {
    if (audioPlayerRef.current) {
      try {
        if (!audioPlayerRef.current.playing) {
          audioPlayerRef.current.play();
          isPlayingRef.current = true;
          setIsPlaying(true);
          return;
        }
      } catch (e) {
        console.error('继续播放失败:', e);
      }
    }
    
    // 如果没有音频或无法继续，从头开始
    handleStartPlay();
  }, [handleStartPlay]);

  // 切换播放状态
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      handlePausePlay();
    } else {
      if (currentPlayingIndex >= 0 && audioPlayerRef.current) {
        handleResumePlay();
      } else {
        handleStartPlay();
      }
    }
  }, [isPlaying, currentPlayingIndex, handlePausePlay, handleResumePlay, handleStartPlay]);

  // 停止朗读
  const handleStopPlay = useCallback(() => {
    preloadAbortRef.current = true;
    isPlayingRef.current = false;
    
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.remove();
      } catch (e) {
        console.error('停止播放失败:', e);
      }
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingIndex(-1);
    currentPlayingIndexRef.current = -1;
    setPlayingProgress('');
    setHighlightedParagraphId(null);
    audioCacheRef.current.clear();
  }, []);

  const currentTheme = BACKGROUND_THEMES[backgroundTheme];

  // 根据阅读主题确定注解颜色
  const getAnnotationColor = () => {
    if (backgroundTheme === 'sepia') {
      return '#8B5A3C'; // 护眼模式 - 棕红古注色
    }
    return theme.textAnnotation || theme.textSecondary;
  };
  const annotationColorForReader = getAnnotationColor();

  // 用 ref 存储 volumeData 用于合并，避免 useCallback 依赖导致无限循环
  const volumeDataRef = useRef<VolumeData | null>(null);
  
  // 同步 volumeDataRef
  useEffect(() => {
    volumeDataRef.current = volumeData;
  }, [volumeData]);

  // 合并年份组数据
  const mergeYearGroups = useCallback((existing: YearGroup[], newGroups: YearGroup[]): YearGroup[] => {
    const yearMap = new Map<number, YearGroup>();
    
    // 先添加已有的
    for (const year of existing) {
      if (year.bc_year !== null) {
        yearMap.set(year.bc_year, year);
      }
    }

    for (const year of newGroups) {
      if (year.bc_year !== null) {
        if (yearMap.has(year.bc_year)) {
          // 合并段落数组
          const existingYear = yearMap.get(year.bc_year)!;
          const existingIds = new Set(existingYear.paragraphs.map(p => p.id));
          const newParagraphs = year.paragraphs.filter(p => !existingIds.has(p.id));
          existingYear.paragraphs = [...existingYear.paragraphs, ...newParagraphs];
        } else {
          yearMap.set(year.bc_year, year);
        }
      }
    }
    
    // 按年份排序
    return Array.from(yearMap.values()).sort((a, b) => {
      if (a.bc_year === null && b.bc_year === null) return 0;
      if (a.bc_year === null) return 1;
      if (b.bc_year === null) return -1;
      return a.bc_year - b.bc_year;
    });
  }, []);

  /**
   * 服务端文件：server/src/routes/paragraphs.ts
   * 接口：GET /api/v1/paragraphs/volume/:volumeNumber
   * Path 参数：volumeNumber: number
   * Query 参数：offset?: number, limit?: number
   */
  const fetchVolumeData = useCallback(async (volumeNumber: number, isSilentRefresh: boolean, append: boolean = false) => {
    // 检查缓存（仅首次加载）
    if (!append) {
      const cached = getCachedVolume(volumeNumber);
      if (cached.volumeData) {
        setVolumeData(cached.volumeData);
        setCatalogData(cached.catalogData);
        setLoading(false);
        return;
      }
    }

    if (append) {
      setLoadingMore(true);
    } else if (!isSilentRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const limit = 50;
      const offset = append ? loadedParagraphsRef.current : 0;
      const url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/paragraphs/volume/${volumeNumber}?offset=${offset}&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch volume data');
      }

      const result = await response.json();

      if (result.success) {
        totalParagraphsRef.current = result.total;  // 保存服务器返回的总段落数（用于进度计算）
        setHasMore(result.hasMore);
        
        // 使用 ref 获取当前数据，避免依赖 volumeData
        const currentData = volumeDataRef.current;
        if (append && currentData) {
          // 合并数据
          const mergedYears = mergeYearGroups(currentData.years, result.data.years);
          setVolumeData({
            volume_number: volumeNumber,
            years: mergedYears,
          });
        } else {
          setVolumeData(result.data);
        }
        
        // 更新已加载的段落数
        const newLoaded = offset + (result.data.years?.reduce((sum: number, y: YearGroup) => sum + y.paragraphs.length, 0) || 0);
        loadedParagraphsRef.current = newLoaded;
      } else {
        setError(result.message || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [mergeYearGroups]); // 移除 volumeData 依赖

  /**
   * 加载更多段落
   */
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && currentVolumeRef.current) {
      fetchVolumeData(currentVolumeRef.current, true, true);
    }
  }, [loadingMore, hasMore, fetchVolumeData]);

  /**
   * 服务端文件：server/src/routes/volumes.ts
   * 接口：GET /api/v1/volumes/:id
   * Path 参数：id: number（卷号）
   * 获取卷元数据
   */
  const fetchVolumeMeta = useCallback(async (volumeNumber: number) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/volumes/${volumeNumber}`);

      if (!response.ok) {
        throw new Error('Failed to fetch volume meta');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setVolumeMeta({
          volume_number: result.data.volume_number,
          volume_name: result.data.title || result.data.name || '',
          dynasty: result.data.era || '',
          year_start: result.data.year_start,
          year_end: result.data.year_end,
          time_range: result.data.time_range || null,
          introduction: result.data.introduction || null,
        });
      }
    } catch (err) {
      console.error('获取卷元数据失败:', err);
    }
  }, []);

  /**
   * 服务端文件：server/src/routes/volumes.ts
   * 接口：GET /api/v1/volumes/:id/catalog
   * Path 参数：id: number（卷号）
   */
  const fetchCatalog = useCallback(async (volumeNumber: number) => {
    // 如果已经有缓存就不请求
    if (catalogData) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/volumes/${volumeNumber}/catalog`);

      if (!response.ok) {
        throw new Error('Failed to fetch catalog');
      }

      const result = await response.json();

      if (result.success) {
        setCatalogData(result.data);
        // 缓存数据和目录（使用 ref 获取当前数据）
        const currentData = volumeDataRef.current;
        if (currentData) {
          setCachedVolume(volumeNumber, currentData, result.data);
        }
      }
    } catch (err) {
      console.error('获取目录失败:', err);
    }
  }, [catalogData]); // 移除 volumeData 依赖

  // 获取当前卷的用户标注
  const fetchUserNotesForVolume = useCallback(async (volumeNumber: number) => {
    try {
      const notes = await fetchUserNotes({ volumeNumber });
      // 转换为 NoteMarker 格式
      const markers: NoteMarker[] = notes.map(note => ({
        id: note.id,
        paragraphId: note.paragraphId,
        startOffset: note.startOffset,
        endOffset: note.endOffset,
        highlightedText: note.highlightedText,
        noteContent: note.noteContent,
        color: note.color || '#FECACA',
        markType: note.markType || 'background',
      }));
      setUserNotes(markers);
    } catch (err) {
      console.error('获取用户标注失败:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const volumeNumber = id ? parseInt(id) : null;
      if (!volumeNumber) return;

      // 判断是否是同一卷（用于静默刷新）
      const isSameVolume = currentVolumeRef.current === volumeNumber;
      
      // 切换卷时重置状态
      if (!isSameVolume) {
        loadedParagraphsRef.current = 0;
        currentVisibleParagraphIdRef.current = 0;  // 重置段落ID
        hasRestoredPositionRef.current = false;    // 重置恢复标志
        setVolumeData(null);
        setHasMore(false);
        setUserNotes([]);  // 重置标注数据
      }

      // 判断是否是静默刷新（已初始化且是同一卷）
      const isSilentRefresh = initializedRef.current && isSameVolume;

      // 首次加载设置
      if (!initializedRef.current) {
        loadReadingSettings().then(settings => {
          setFontSize(settings.fontSize);
          setBackgroundTheme(settings.backgroundTheme);
          setViewMode(settings.viewMode);
          setTextLayout(settings.textLayout);
          setTtsVoice(settings.ttsVoice);
          setTtsSpeed(settings.ttsSpeed);
        });
        initializedRef.current = true;
      }

      // 加载数据
      fetchVolumeData(volumeNumber, isSilentRefresh);
      fetchCatalog(volumeNumber);
      fetchVolumeMeta(volumeNumber);
      fetchUserNotesForVolume(volumeNumber);
      // 注意：不再重置进度，进入页面时不应该修改阅读进度
      currentVolumeRef.current = volumeNumber;
    }, [id, fetchVolumeData, fetchCatalog, fetchVolumeMeta, fetchUserNotesForVolume])
  );

  // 缓存数据到 volumeCache（当 volumeData 变化时）
  useEffect(() => {
    if (volumeData && currentVolumeRef.current) {
      setCachedVolume(currentVolumeRef.current, volumeData, catalogData);
      
      // 计算总段落数
      let totalP = 0;
      for (const year of volumeData.years) {
        totalP += year.paragraphs.length;
      }

      // 初始化：如果还没有设置段落ID，设置为第一个年份的第一个段落
      if (currentVisibleParagraphIdRef.current === 0 && volumeData.years?.length > 0 && volumeData.years[0].paragraphs?.length > 0) {
        currentVisibleParagraphIdRef.current = volumeData.years[0].paragraphs[0].id;
      }
    }
  }, [volumeData, catalogData]);

  // HTML 模式辅助：通过 WebView JS 滚动
  const injectScroll = useCallback((js: string) => {
    htmlWebViewRef.current?.injectJavaScript(js);
  }, []);

  // 滚动到指定年份段落
  const scrollToYear = useCallback((yearIndex: number) => {
    // 通过 WebView JS 滚动
    setShowToolbar(false);
    setActiveTab(null);
    setTimeout(() => {
      injectScroll(`window.__scrollToYear && window.__scrollToYear(${yearIndex});`);
    }, 350);
  }, []);

  // 滚动到高亮段落（从搜索结果跳转）
  const scrollToHighlightParagraph = useCallback((paragraphId: number, retryCount = 0) => {
    // 首次调用时重置状态
    if (retryCount === 0) {
      scrollToTargetRef.current = paragraphId;
      scrollToSucceededRef.current = false;
    }
    // 目标已变更 或 已成功 → 停止重试
    if (scrollToSucceededRef.current || scrollToTargetRef.current !== paragraphId) return;

    if (htmlWebViewRef.current) {
      injectScroll(`window.__scrollToParagraph && window.__scrollToParagraph(${paragraphId});`);
    }

    // 未成功才重试
    if (retryCount < 15) {
      if (retryCount === 0 && hasMore && !loadingMore && currentVolumeRef.current) {
        fetchVolumeData(currentVolumeRef.current, true, true);
      }
      setTimeout(() => scrollToHighlightParagraph(paragraphId, retryCount + 1), 500);
    } else {
      setShowToolbar(false);
      setActiveTab(null);
    }
  }, [hasMore, loadingMore, fetchVolumeData]);

  // 处理从搜索结果跳转到高亮段落
  useEffect(() => {
    if (!highlightId || !volumeData?.years || loading) return;
    
    const paragraphId = parseInt(highlightId);
    
    // 检查段落是否已加载
    let found = false;
    for (const year of volumeData.years) {
      if (year.paragraphs.some(p => p.id === paragraphId)) {
        found = true;
        break;
      }
    }
    
    if (found) {
      // 段落已加载，延迟滚动确保 ref 已更新
      setTimeout(() => scrollToHighlightParagraph(paragraphId), 200);
    } else if (hasMore && !loadingMore && currentVolumeRef.current) {
      // 段落未加载，加载更多数据
      fetchVolumeData(currentVolumeRef.current, true, true);
    }
  }, [highlightId, volumeData, loading, hasMore, loadingMore, scrollToHighlightParagraph, fetchVolumeData]);

  // 保存阅读进度（页面失去焦点时）- 使用 useFocusEffect 确保在页面离开时保存
  useFocusEffect(
    useCallback(() => {
      // 页面失去焦点时保存进度
      return () => {
        const currentVolume = currentVolumeRef.current;
        const paragraphId = currentVisibleParagraphIdRef.current;

        if (!currentVolume || paragraphId <= 0) return;

        const contentType = (viewMode === 'translation') ? 1 : 0;
        // 用服务端返回的卷总段落数计算百分比
        const totalInVolume = totalParagraphsRef.current || 1;

        // 使用全局索引计算准确的阅读百分比
        const globalIndex = globalIndexRef.current;
        const readPercent = Math.min(100, Math.round(((globalIndex + 1) / totalInVolume) * 100));
        updateReadingProgress({ volumeNumber: currentVolume, paraId: paragraphId, readPercent, contentType });
      };
    }, [viewMode])
  );

  // 恢复阅读位置（首次加载时）
  const hasRestoredPositionRef = useRef(false);
  useEffect(() => {
    // 只在首次加载且没有从搜索/书签跳转时恢复位置
    if (!volumeData?.years || loading || hasRestoredPositionRef.current || highlightId) {
      return;
    }
    
    const currentVolume = currentVolumeRef.current;
    if (!currentVolume) return;

    // 如果从首页传递了段落ID，直接使用（避免额外请求）
    if (scrollToParagraphId && scrollToParagraphId > 0) {
      hasRestoredPositionRef.current = true;
      setTimeout(() => {
        scrollToHighlightParagraph(scrollToParagraphId);
      }, 500);
      return;
    }

    // 否则从服务器获取阅读记录
    getReadingRecords().then(records => {
      const record = records.find(r => r.volumeNumber === currentVolume);
      
      // 有段落记录就恢复位置
      if (record && record.paraId > 0) {
        hasRestoredPositionRef.current = true;
        // 延迟滚动确保 ref 已更新
        setTimeout(() => {
          scrollToHighlightParagraph(record.paraId);
        }, 500);
      }
    }).catch(err => {
      console.error('恢复阅读位置失败:', err);
    });
  }, [volumeData, loading, highlightId, scrollToHighlightParagraph, scrollToParagraphId]);

  // 从目录跳转
  const handleCatalogItemClick = useCallback((yearName: string, emperorName: string, bcYear: number | null) => {
    // 先用 bc_year 匹配
    let yearIndex = volumeData?.years.findIndex(y => y.bc_year === bcYear) ?? -1;
    if (yearIndex < 0) {
      // 备用匹配：用年份名和帝王名匹配
      yearIndex = volumeData?.years.findIndex(y => y.year_mark === yearName && y.emperor === emperorName) ?? -1;
    }
    if (yearIndex >= 0) {
      scrollToYear(yearIndex);
    } else if (hasMore && currentVolumeRef.current && !loadingMore) {
      pendingJumpRef.current = { bcYear, yearName, emperorName };
      fetchVolumeData(currentVolumeRef.current, true, true);
    }
  }, [volumeData?.years, scrollToYear, hasMore, loadingMore, fetchVolumeData]);

  // 处理待跳转目标：当数据加载完成后执行跳转
  useEffect(() => {
    if (!pendingJumpRef.current || !volumeData?.years) return;

    const { bcYear, yearName, emperorName } = pendingJumpRef.current;
    let yearIndex = volumeData.years.findIndex(y => y.bc_year === bcYear);
    if (yearIndex < 0 && yearName && emperorName) {
      yearIndex = volumeData.years.findIndex(y => y.year_mark === yearName && y.emperor === emperorName);
    }

    if (yearIndex >= 0) {
      pendingJumpRef.current = null;
      setTimeout(() => scrollToYear(yearIndex), 100);
    } else if (hasMore && !loadingMore && currentVolumeRef.current) {
      fetchVolumeData(currentVolumeRef.current, true, true);
    }
  }, [volumeData, hasMore, loadingMore, scrollToYear, fetchVolumeData]);

  // 处理书签跳转：当 URL 参数中有 yearMark 和 emperor 时
  useEffect(() => {
    if (!yearMark || !emperor || !volumeData?.years) return;
    
    // 已经在处理中，避免重复执行
    if (pendingJumpRef.current) return;
    
    const yearIndex = volumeData.years.findIndex(
      y => y.year_mark === yearMark && y.emperor === emperor
    );

    if (yearIndex >= 0) {
      // 目标已加载，执行跳转
      setTimeout(() => scrollToYear(yearIndex), 100);
    } else if (hasMore && !loadingMore && currentVolumeRef.current) {
      // 目标未加载，设置待跳转目标并触发加载
      pendingJumpRef.current = { bcYear: null, yearName: yearMark, emperorName: emperor };
      fetchVolumeData(currentVolumeRef.current, true, true);
    }
  }, [yearMark, emperor, volumeData?.years, hasMore, loadingMore, scrollToYear, fetchVolumeData]);

  // 点击屏幕处理 - 判断是点击还是滚动
  const activeTabRef = useRef<SettingsTab>(null);
  activeTabRef.current = activeTab;
  const handleScreenTap = useCallback(() => {
    if (activeTabRef.current) {
      setActiveTab(null);
    } else {
      setShowToolbar(prev => !prev);
    }
  }, []);

  // 可见段落变化回调（使用 ref 避免重新创建）
  const handleVisibleParagraphChange = useCallback((pId: number, gIdx: number) => {
    currentVisibleParagraphIdRef.current = pId;
    globalIndexRef.current = gIdx;
  }, []);

  // 滚动结果回调（使用 ref 避免重新创建）
  const handleScrollToResult = useCallback((targetId: number, success: boolean) => {
    if (targetId === scrollToTargetRef.current && success) {
      scrollToSucceededRef.current = true;
    }
  }, []);

  // 处理文本选择
  const handleTextSelection = useCallback((selection: TextSelection | null) => {
    setTextSelection(selection);
    if (selection) {
      // 隐藏工具栏，显示选择菜单
      setShowToolbar(false);
    }
  }, []);

  // 取消文本选择
  const handleCancelSelection = useCallback(() => {
    setTextSelection(null);
    setNoteContent('');
  }, []);

  // 打开标注输入框
  const handleOpenNoteModal = useCallback(() => {
    setShowNoteModal(true);
  }, []);

  // 点击标注下划线
  const handleNoteClick = useCallback((note: NoteMarker) => {
    setClickedNote(note);
    setEditNoteContent(note.noteContent || '');
    setEditNoteColor(note.color || MARK_COLORS[0].value);
    setEditNoteMarkType(note.markType || 'background');
    setIsEditingNote(false);
    setShowNoteDetail(true);
  }, []);

  // 开始编辑笔记
  const handleStartEditNote = useCallback(() => {
    setIsEditingNote(true);
  }, []);

  // 取消编辑
  const handleCancelEditNote = useCallback(() => {
    setIsEditingNote(false);
    setEditNoteContent(clickedNote?.noteContent || '');
    setEditNoteColor(clickedNote?.color || MARK_COLORS[0].value);
    setEditNoteMarkType(clickedNote?.markType || 'background');
  }, [clickedNote]);

  // 保存编辑的笔记
  const handleSaveEditNote = useCallback(async () => {
    if (!clickedNote) return;

    setSavingEditNote(true);
    try {
      await updateUserNote(clickedNote.id, {
        noteContent: editNoteContent.trim() || undefined,
        color: editNoteColor,
        markType: editNoteMarkType,
      });

      // 更新本地数据
      setUserNotes(prev => prev.map(n =>
        n.id === clickedNote.id
          ? { ...n, noteContent: editNoteContent.trim() || null, color: editNoteColor, markType: editNoteMarkType }
          : n
      ));

      // 更新点击的笔记
      setClickedNote(prev => prev ? {
        ...prev,
        noteContent: editNoteContent.trim() || null,
        color: editNoteColor,
        markType: editNoteMarkType,
      } : null);

      setIsEditingNote(false);
      Alert.alert('成功', '笔记已更新');
    } catch (error) {
      console.error('更新笔记失败:', error);
      Alert.alert('错误', '更新笔记失败，请重试');
    } finally {
      setSavingEditNote(false);
    }
  }, [clickedNote, editNoteContent, editNoteColor, editNoteMarkType]);

  // 删除笔记
  const handleDeleteNote = useCallback(async () => {
    if (!clickedNote || !volumeData) return;

    Alert.alert(
      '确认删除',
      '确定要删除这条标注吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            setDeletingNote(true);
            try {
              await deleteUserNote(clickedNote.id);

              // 更新本地数据
              setUserNotes(prev => prev.filter(n => n.id !== clickedNote.id));

              setShowNoteDetail(false);
              setClickedNote(null);
              Alert.alert('成功', '标注已删除');
            } catch (error) {
              console.error('删除笔记失败:', error);
              Alert.alert('错误', '删除笔记失败，请重试');
            } finally {
              setDeletingNote(false);
            }
          },
        },
      ]
    );
  }, [clickedNote, volumeData]);

  // 保存标注（带笔记）
  const handleSaveNote = useCallback(async () => {
    if (!textSelection || !volumeData) return;

    setSavingNote(true);
    try {
      await createUserNote(
        {
          volumeNumber: volumeData.volume_number,
          paragraphId: textSelection.paragraphId || 0,
          startOffset: textSelection.startOffset,
          endOffset: textSelection.endOffset,
          highlightedText: textSelection.selectedText,
          noteContent: noteContent.trim() || undefined,
          markType: selectedMarkType,
          color: selectedMarkColor,
        }
      );

      // 刷新标注数据
      fetchUserNotesForVolume(volumeData.volume_number);

      // 重置状态
      setShowNoteModal(false);
      setTextSelection(null);
      setNoteContent('');
      Alert.alert('成功', '标注已保存');
    } catch (error) {
      console.error('保存标注失败:', error);
      Alert.alert('错误', '保存标注失败，请重试');
    } finally {
      setSavingNote(false);
    }
  }, [textSelection, volumeData, noteContent, fetchUserNotesForVolume, selectedMarkType, selectedMarkColor]);

  // 画线类型和颜色配置
  const MARK_TYPES = [
    { type: 'background' as const, label: '背景色', icon: 'fill' },
    { type: 'underline' as const, label: '横线', icon: 'minus' },
    { type: 'wavy' as const, label: '波浪线', icon: 'water' },
  ];

  const MARK_COLORS = [
    { name: '粉色', value: '#FECACA' },  // 浅红
    { name: '紫色', value: '#DDD6FE' },  // 浅紫
    { name: '蓝色', value: '#BFDBFE' },  // 浅蓝
    { name: '绿色', value: '#BBF7D0' },  // 浅绿
    { name: '黄色', value: '#FEF08A' },  // 浅黄
    { name: '橙色', value: '#FED7AA' },  // 浅橙
  ];

  // 快速画线（不带笔记）
  const handleQuickMark = useCallback(async () => {
    if (!textSelection || !volumeData) return;

    setSavingNote(true);
    try {
      await createUserNote({
        volumeNumber: volumeData.volume_number,
        paragraphId: textSelection.paragraphId || 0,
        startOffset: textSelection.startOffset,
        endOffset: textSelection.endOffset,
        highlightedText: textSelection.selectedText,
        color: selectedMarkColor,
        markType: selectedMarkType,
      });

      // 刷新标注数据
      fetchUserNotesForVolume(volumeData.volume_number);

      // 重置状态
      setShowMarkMenu(false);
      setTextSelection(null);
    } catch (error) {
      console.error('画线失败:', error);
      Alert.alert('错误', '画线失败，请重试');
    } finally {
      setSavingNote(false);
    }
  }, [textSelection, volumeData, fetchUserNotesForVolume, selectedMarkType, selectedMarkColor]);

  // 打开画线菜单
  const handleOpenMarkMenu = useCallback(() => {
    setShowMarkMenu(true);
  }, []);

  // 导航到上一卷
  const goToPreviousVolume = useCallback(() => {
    const currentVolume = currentVolumeRef.current;
    if (currentVolume && currentVolume > 1) {
      setSwipeHint('prev');
      setTimeout(() => {
        router.replace('/volume-detail', { id: String(currentVolume - 1) });
        setSwipeHint(null);
      }, 200);
    }
  }, [router]);

  // 导航到下一卷
  const goToNextVolume = useCallback(() => {
    const currentVolume = currentVolumeRef.current;
    if (currentVolume && currentVolume < 294) {  // 资治通鉴共294卷
      setSwipeHint('next');
      setTimeout(() => {
        router.replace('/volume-detail', { id: String(currentVolume + 1) });
        setSwipeHint(null);
      }, 200);
    }
  }, [router]);

  // 滚动到页面顶部
  const scrollToTop = useCallback(() => {
    injectScroll(`window.__scrollToTop && window.__scrollToTop();`);
  }, [injectScroll]);

  // 双击标题处理
  const handleTitleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;  // 双击间隔时间（毫秒）
    
    if (now - lastTitleTapTime.current < DOUBLE_TAP_DELAY) {
      // 双击触发，滚动到顶部
      scrollToTop();
      lastTitleTapTime.current = 0;
    } else {
      // 记录第一次点击时间
      lastTitleTapTime.current = now;
    }
  }, [scrollToTop]);

  // 工具栏按钮点击
  const handleTabPress = useCallback((tab: SettingsTab) => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
  }, [activeTab]);

  // 渲染目录面板
  const renderCatalogPanel = () => {
    const formatYear = (bcYear: number | null) => {
      if (bcYear === null) return '';
      if (bcYear < 0) return `公元前${Math.abs(bcYear)}年`;
      if (bcYear > 0) return `公元${bcYear}年`;
      return '';
    };

    return (
    <View style={[styles.panel, { backgroundColor: currentTheme.background }]}>
      <View style={styles.panelHeader}>
        <ThemedText variant="h4" color={currentTheme.text}>目录</ThemedText>
        <TouchableOpacity onPress={() => setActiveTab(null)}>
          <FontAwesome6 name="xmark" size={18} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.panelContent} nestedScrollEnabled>
        {catalogData?.catalog.map((group) => (
          <View key={group.emperor.id} style={styles.emperorGroup}>
            {/* 帝王标题 */}
            <View style={styles.emperorHeader}>
              <ThemedText variant="bodyMedium" color={currentTheme.text}>
                {group.emperor.name}
              </ThemedText>
              <ThemedText variant="caption" color={currentTheme.text}>
                {group.years.length}年
              </ThemedText>
            </View>

            {/* 年份列表 */}
            <View style={styles.yearList}>
              {group.years.map((year, yearIndex) => {
                const yearItemKey = `${group.emperor.name}-${year.bc_year || yearIndex}`;

                return (
                  <TouchableOpacity
                    key={yearItemKey}
                    style={styles.yearItem}
                    onPress={() => handleCatalogItemClick(year.year_name, group.emperor.name, year.bc_year)}
                  >
                    <ThemedText variant="small" color={currentTheme.text}>
                      {year.year_display || year.year_name}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      {formatYear(year.bc_year)}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
    );
  };

  // 渲染字体设置面板
  const FONT_FAMILY_OPTIONS = [
    { label: '系统默认', value: 'system' as const, desc: '苹方/思源黑体' },
    { label: '宋体', value: 'serif' as const, desc: '传统印刷风格' },
    { label: '楷体', value: 'kaiti' as const, desc: '古典书法韵味' },
    { label: '隶书', value: 'lishu' as const, desc: '典雅庄重风格' },
    { label: '正楷', value: 'zhengkai' as const, desc: '规范楷书风格' },
  ];

  const renderFontPanel = () => (
    <View style={[styles.panel, { backgroundColor: currentTheme.background }]}>
      <View style={styles.panelHeader}>
        <ThemedText variant="h4" color={currentTheme.text}>字体设置</ThemedText>
        <TouchableOpacity onPress={() => setActiveTab(null)}>
          <FontAwesome6 name="xmark" size={18} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.panelContent} contentContainerStyle={styles.panelScrollContent} showsVerticalScrollIndicator={false}>
        {/* 字体大小 */}
        <ThemedText variant="smallMedium" color={theme.textMuted} style={{ marginBottom: 8 }}>
          字体大小
        </ThemedText>
        <View style={styles.fontSizeList}>
          {FONT_SIZES.map((size, index) => (
            <TouchableOpacity
              key={size.value}
              style={[
                styles.fontSizeItem,
                fontSize === size.value && { backgroundColor: theme.primary },
              ]}
              onPress={() => handleSetFontSize(size.value)}
            >
              <Text style={[
                styles.fontSizeLabel,
                { color: fontSize === size.value ? '#FFFFFF' : currentTheme.text },
                { fontSize: 14 + index * 2 },
              ]}>
                A
              </Text>
              <Text style={[
                styles.fontSizeName,
                { color: fontSize === size.value ? '#FFFFFF' : currentTheme.text },
              ]}>
                {t(size.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 字体风格 */}
        <ThemedText variant="smallMedium" color={theme.textMuted} style={{ marginTop: 16, marginBottom: 8 }}>
          字体风格
        </ThemedText>
        <View style={styles.fontFamilyList}>
          {FONT_FAMILY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.fontFamilyItem,
                { borderColor: fontFamily === option.value ? theme.primary : theme.border },
                fontFamily === option.value && { backgroundColor: theme.primary + '10' },
              ]}
              onPress={() => setFontFamily(option.value)}
            >
              <ThemedText
                variant="body"
                color={fontFamily === option.value ? theme.primary : currentTheme.text}
              >
                {option.label}
              </ThemedText>
              <ThemedText
                variant="caption"
                color={theme.textMuted}
              >
                {option.desc}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // 渲染背景设置面板
  const renderBackgroundPanel = () => (
    <View style={[styles.panel, { backgroundColor: currentTheme.background }]}>
      <View style={styles.panelHeader}>
        <ThemedText variant="h4" color={currentTheme.text}>背景主题</ThemedText>
        <TouchableOpacity onPress={() => setActiveTab(null)}>
          <FontAwesome6 name="xmark" size={18} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.panelContent}>
        <View style={styles.backgroundList}>
          {(Object.keys(BACKGROUND_THEMES) as BackgroundTheme[]).map(key => {
            const bg = BACKGROUND_THEMES[key];
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.backgroundItem,
                  { backgroundColor: bg.color },
                  backgroundTheme === key && { borderColor: theme.primary, borderWidth: 2 },
                ]}
                onPress={() => handleSetBackgroundTheme(key)}
              >
                <Text style={[
                  styles.backgroundName,
                  { color: bg.text },
                  backgroundTheme === key && { fontWeight: '600' },
                ]}>
                  {t(bg.name)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  // 渲染视图模式面板
  const renderViewModePanel = () => (
    <View style={[styles.panel, { backgroundColor: currentTheme.background }]}>
      <View style={styles.panelHeader}>
        <ThemedText variant="h4" color={currentTheme.text}>显示模式</ThemedText>
        <TouchableOpacity onPress={() => setActiveTab(null)}>
          <FontAwesome6 name="xmark" size={18} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.panelContent} nestedScrollEnabled>
        <View style={styles.viewModeList}>
          {[
            { key: 'original' as ViewMode, label: '纯原文', desc: '仅显示原文' },
            { key: 'original+annotation' as ViewMode, label: '原文+注', desc: '原文与注文' },
            { key: 'original+translation' as ViewMode, label: '原文+译', desc: '原文与白话译文' },
            { key: 'original+annotation+translation' as ViewMode, label: '全部', desc: '原文、注文、译文' },
            { key: 'translation' as ViewMode, label: '纯译文', desc: '仅显示白话译文' },
          ].map(mode => {
            return (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.viewModeItem,
                viewMode === mode.key && { backgroundColor: theme.primary + '20' },
              ]}
              onPress={() => handleSetViewMode(mode.key)}
            >
              <View style={styles.viewModeItemLeft}>
                <Text style={[
                  styles.viewModeLabel,
                  { color: currentTheme.text },
                  viewMode === mode.key && { fontWeight: '600' },
                ]}>
                  {t(mode.label)}
                </Text>
                <Text style={[styles.viewModeDesc, { color: currentTheme.text }]}>
                  {t(mode.desc)}
                </Text>
              </View>
              {viewMode === mode.key && (
                <FontAwesome6 name="check" size={16} color={theme.primary} />
              )}
            </TouchableOpacity>
            );
          })}
        </View>

        {/* 排版方向 */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.scriptModeSection}>
          <Text style={[styles.sectionLabel, { color: currentTheme.text }]}>{t('排版')}</Text>
          <View style={styles.scriptModeButtons}>
            <TouchableOpacity
              style={[
                styles.scriptButton,
                textLayout === 'horizontal' && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
              ]}
              onPress={() => handleSetTextLayout('horizontal')}
            >
              <Text style={[
                styles.scriptButtonText,
                { color: textLayout === 'horizontal' ? theme.primary : currentTheme.text },
              ]}>
                {t('横排')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.scriptButton,
                textLayout === 'vertical' && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
              ]}
              onPress={() => handleSetTextLayout('vertical')}
            >
              <Text style={[
                styles.scriptButtonText,
                { color: textLayout === 'vertical' ? theme.primary : currentTheme.text },
              ]}>
                {t('竖排')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 简繁切换 */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.scriptModeSection}>
          <Text style={[styles.sectionLabel, { color: currentTheme.text }]}>{t('字体')}</Text>
          <View style={styles.scriptModeButtons}>
            <TouchableOpacity
              style={[
                styles.scriptButton,
                scriptMode === 'simplified' && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
              ]}
              onPress={() => setScriptMode('simplified')}
            >
              <Text style={[
                styles.scriptButtonText,
                { color: scriptMode === 'simplified' ? theme.primary : currentTheme.text },
              ]}>
                {t('简体')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.scriptButton,
                scriptMode === 'traditional' && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
              ]}
              onPress={() => setScriptMode('traditional')}
            >
              <Text style={[
                styles.scriptButtonText,
                { color: scriptMode === 'traditional' ? theme.primary : currentTheme.text },
              ]}>
                {t('繁體')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // 渲染TTS朗读设置面板
  const renderTtsPanel = () => (
    <View style={[styles.panel, { backgroundColor: currentTheme.background }]}>
      <View style={styles.panelHeader}>
        <ThemedText variant="h4" color={currentTheme.text}>朗读设置</ThemedText>
        <TouchableOpacity onPress={() => setActiveTab(null)}>
          <FontAwesome6 name="xmark" size={18} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.panelContent} nestedScrollEnabled>
        {/* 音色选择 */}
        <Text style={[styles.sectionLabel, { color: currentTheme.text }]}>{t('朗读音色')}</Text>
        <View style={styles.ttsVoiceList}>
          {TTS_VOICES.map(voice => (
            <TouchableOpacity
              key={voice.id}
              style={[
                styles.ttsVoiceItem,
                ttsVoice === voice.id && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
              ]}
              onPress={() => handleSetTtsVoice(voice.id)}
            >
              <View style={styles.ttsVoiceInfo}>
                <Text style={[
                  styles.ttsVoiceName,
                  { color: currentTheme.text },
                  ttsVoice === voice.id && { fontWeight: '600' },
                ]}>
                  {voice.name}
                </Text>
                <Text style={[styles.ttsVoiceDesc, { color: currentTheme.text }]}>
                  {voice.desc}
                </Text>
              </View>
              {ttsVoice === voice.id && (
                <FontAwesome6 name="check" size={16} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 语速选择 */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.sectionLabel, { color: currentTheme.text }]}>{t('朗读语速')}</Text>
        <View style={styles.ttsSpeedList}>
          {TTS_SPEEDS.map(speed => (
            <TouchableOpacity
              key={speed.value}
              style={[
                styles.ttsSpeedItem,
                ttsSpeed === speed.value && { backgroundColor: theme.primary },
              ]}
              onPress={() => handleSetTtsSpeed(speed.value)}
            >
              <Text style={[
                styles.ttsSpeedLabel,
                { color: ttsSpeed === speed.value ? '#FFFFFF' : currentTheme.text },
              ]}>
                {t(speed.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // 渲染底部工具栏
  const renderToolbar = () => {
    if (!showToolbar) return null;

    return (
      <View style={[styles.toolbar, { backgroundColor: currentTheme.background }]}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => handleTabPress('catalog')}
        >
          <FontAwesome6
            name="list"
            size={20}
            color={activeTab === 'catalog' ? theme.primary : currentTheme.text}
          />
          <Text style={[
            styles.toolbarButtonText,
            { color: activeTab === 'catalog' ? theme.primary : currentTheme.text },
          ]}>
            {t('目录')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => handleTabPress('font')}
        >
          <FontAwesome6
            name="font"
            size={20}
            color={activeTab === 'font' ? theme.primary : currentTheme.text}
          />
          <Text style={[
            styles.toolbarButtonText,
            { color: activeTab === 'font' ? theme.primary : currentTheme.text },
          ]}>
            {t('字体')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => handleTabPress('background')}
        >
          <FontAwesome6
            name="palette"
            size={20}
            color={activeTab === 'background' ? theme.primary : currentTheme.text}
          />
          <Text style={[
            styles.toolbarButtonText,
            { color: activeTab === 'background' ? theme.primary : currentTheme.text },
          ]}>
            {t('背景')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => handleTabPress('viewMode')}
        >
          <FontAwesome6
            name="eye"
            size={20}
            color={activeTab === 'viewMode' ? theme.primary : currentTheme.text}
          />
          <Text style={[
            styles.toolbarButtonText,
            { color: activeTab === 'viewMode' ? theme.primary : currentTheme.text },
          ]}>
            {t('模式')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => handleTabPress('tts')}
        >
          <FontAwesome6
            name="headphones"
            size={20}
            color={activeTab === 'tts' ? theme.primary : currentTheme.text}
          />
          <Text style={[
            styles.toolbarButtonText,
            { color: activeTab === 'tts' ? theme.primary : currentTheme.text },
          ]}>
            {t('朗读')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen preset="fixed" backgroundColor={currentTheme.background} statusBarStyle={backgroundTheme === 'dark' ? 'light' : 'dark'}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.text} />
        </View>
      </Screen>
    );
  }

  if (error || !volumeData) {
    return (
      <Screen preset="fixed" backgroundColor={currentTheme.background} statusBarStyle={backgroundTheme === 'dark' ? 'light' : 'dark'}>
        <View style={styles.centerContainer}>
          <FontAwesome6 name="circle-exclamation" size={32} color={currentTheme.text} />
          <ThemedText variant="body" color={currentTheme.text} style={{ marginTop: Spacing.md }}>
            {error || t('数据加载失败')}
          </ThemedText>
          <TouchableOpacity
            style={{ marginTop: Spacing.lg, padding: Spacing.md }}
            onPress={() => router.back()}
          >
            <ThemedText variant="smallMedium" color={theme.primary}>返回目录</ThemedText>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const hasYears = volumeData.years && volumeData.years.length > 0;

  return (
    <Screen preset="fixed" backgroundColor={currentTheme.background} statusBarStyle={backgroundTheme === 'dark' ? 'light' : 'dark'}>
      {/* 滑动切换章节提示 */}
      {swipeHint && (
        <View style={[
          styles.swipeHint, 
          swipeHint === 'prev' ? styles.swipeHintLeft : styles.swipeHintRight,
          { backgroundColor: theme.primary }
        ]}>
          <FontAwesome6 
            name={swipeHint === 'prev' ? 'chevron-left' : 'chevron-right'} 
            size={24} 
            color="#FFFFFF" 
          />
          <Text style={styles.swipeHintText}>
            {swipeHint === 'prev' ? '上一卷' : '下一卷'}
          </Text>
        </View>
      )}
      
      {/* 顶部栏 - 标题始终占位，按钮联动显示/隐藏 */}
      <View style={[styles.header, { backgroundColor: currentTheme.background }]}>
        {showToolbar ? (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={18} color={currentTheme.text} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.backButton, { backgroundColor: 'transparent' }]} />
        )}
        <TouchableOpacity
          style={styles.headerTitle}
          onPress={handleTitleDoubleTap}
          activeOpacity={0.7}
        >
          <ThemedText variant="h4" color={currentTheme.text}>
            第{volumeData.volume_number}卷 · {volumeMeta?.volume_name}
          </ThemedText>
        </TouchableOpacity>
        {showToolbar ? (
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={handleOpenBookmarkModal}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name={isBookmarked ? "bookmark" : "bookmark"}
              size={18}
              color={isBookmarked ? theme.primary : currentTheme.text}
              solid={isBookmarked}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.bookmarkButton} />
        )}

        {/* 播放按钮 */}
        {showToolbar ? (
          <TouchableOpacity
            style={styles.playButton}
            onPress={handleTogglePlay}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name={isPlaying ? "pause" : "play"}
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.playButton} />
        )}
      </View>

      {/* 内容区域 */}
      <View style={{ flex: 1 }}>
        {(textLayout === 'vertical' || textLayout === 'horizontal') && volumeData && hasYears ? (
          textLayout === 'vertical' ? (
            <VerticalReader
              volumeData={volumeData}
              volumeMeta={volumeMeta}
              viewMode={viewMode}
              scriptMode={scriptMode}
              fontSize={fontSize}
              fontFamily={fontFamily}
              textColor={currentTheme.text}
              bgColor={currentTheme.background}
              annotationColor={annotationColorForReader}
              translationColor={theme.textTranslation || theme.textSecondary}
              accentColor={theme.accent}
              textMuted={theme.textMuted}
              highlightKeyword={keyword}
              highlightedParagraphId={highlightedParagraphId || (highlightId ? parseInt(highlightId) : null)}
              userNotes={userNotes}
              onTap={handleScreenTap}
              onLoadMore={handleLoadMore}
              onVisibleParagraphChange={handleVisibleParagraphChange}
              onScrollToResult={handleScrollToResult}
              onTextSelection={handleTextSelection}
              onNoteClick={handleNoteClick}
              readerWebViewRef={htmlWebViewRef}
            />
          ) : (
            // 横排模式：支持边缘滑动切换章节
            <View style={{ flex: 1 }}>
              <HorizontalReader
                volumeData={volumeData}
                volumeMeta={volumeMeta}
                viewMode={viewMode}
                scriptMode={scriptMode}
                fontSize={fontSize}
                fontFamily={fontFamily}
                textColor={currentTheme.text}
                bgColor={currentTheme.background}
                annotationColor={annotationColorForReader}
                translationColor={theme.textTranslation || theme.textSecondary}
                accentColor={theme.accent}
                textMuted={theme.textMuted}
                highlightKeyword={keyword}
                highlightedParagraphId={highlightedParagraphId || (highlightId ? parseInt(highlightId) : null)}
                userNotes={userNotes}
                onTap={handleScreenTap}
                onLoadMore={handleLoadMore}
                onVisibleParagraphChange={handleVisibleParagraphChange}
                onScrollToResult={handleScrollToResult}
                onTextSelection={handleTextSelection}
                onNoteClick={handleNoteClick}
                readerWebViewRef={htmlWebViewRef}
              />
              {/* 左边缘触摸区域 - 上一章 */}
              <Pressable
                style={styles.edgeTapLeft}
                onPress={goToPreviousVolume}
              />
              {/* 右边缘触摸区域 - 下一章 */}
              <Pressable
                style={styles.edgeTapRight}
                onPress={goToNextVolume}
              />
            </View>
          )
        ) : null}
      </View>

      {/* TTS 播放控制条 */}
      {(isPlaying || playingProgress) && (
        <View style={[styles.ttsControlBar, { backgroundColor: theme.backgroundDefault }]}>
          {/* 上一条 */}
          <TouchableOpacity 
            style={styles.ttsControlBtn}
            onPress={handlePreviousItem}
            disabled={currentPlayingIndex <= 0}
          >
            <FontAwesome6 
              name="backward-step" 
              size={20} 
              color={currentPlayingIndex <= 0 ? theme.textMuted : theme.primary} 
            />
          </TouchableOpacity>

          {/* 播放/暂停 */}
          <TouchableOpacity 
            style={[styles.ttsPlayBtn, { backgroundColor: theme.primary }]}
            onPress={isPlaying ? handlePausePlay : handleResumePlay}
          >
            {playingProgress === '加载中...' ? (
              <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
            ) : (
              <FontAwesome6 
                name={isPlaying ? "pause" : "play"} 
                size={22} 
                color={theme.buttonPrimaryText} 
              />
            )}
          </TouchableOpacity>

          {/* 下一条 */}
          <TouchableOpacity 
            style={styles.ttsControlBtn}
            onPress={handleNextItem}
            disabled={currentPlayingIndex >= totalSegments - 1}
          >
            <FontAwesome6 
              name="forward-step" 
              size={20} 
              color={currentPlayingIndex >= totalSegments - 1 ? theme.textMuted : theme.primary} 
            />
          </TouchableOpacity>

          {/* 进度信息 */}
          <View style={styles.ttsProgressInfo}>
            <ThemedText variant="smallMedium" color={theme.textPrimary} numberOfLines={1}>
              {playingProgress === '加载中...' ? '加载中...' : playingProgress}
            </ThemedText>
            <ThemedText variant="tiny" color={theme.textMuted}>
              {totalSegments > 0 ? `${currentPlayingIndex + 1}/${totalSegments}条` : ''}
            </ThemedText>
          </View>

          {/* 停止按钮 */}
          <TouchableOpacity 
            style={styles.ttsStopBtn}
            onPress={handleStopPlay}
          >
            <FontAwesome6 name="xmark" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* 底部工具栏 */}
      {renderToolbar()}

      {/* 设置面板 */}
      {activeTab === 'catalog' && renderCatalogPanel()}
      {activeTab === 'font' && renderFontPanel()}
      {activeTab === 'background' && renderBackgroundPanel()}
      {activeTab === 'viewMode' && renderViewModePanel()}
      {activeTab === 'tts' && renderTtsPanel()}

      {/* 添加书签 Modal */}
      <Modal
        visible={bookmarkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBookmarkModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.bookmarkModal, { backgroundColor: currentTheme.background }]}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <ThemedText variant="h4" color={currentTheme.text}>添加书签</ThemedText>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setBookmarkModalVisible(false)}>
                    <FontAwesome6 name="xmark" size={20} color={currentTheme.text} />
                  </TouchableOpacity>
                </View>

                {/* Modal Body */}
                <View style={styles.modalBody}>
                  <ThemedText variant="small" color={theme.textMuted} style={styles.inputLabel}>
                    标题（可选）
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.backgroundTertiary,
                      color: currentTheme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="默认使用卷名"
                    placeholderTextColor={theme.textMuted}
                    value={bookmarkTitle}
                    onChangeText={setBookmarkTitle}
                    maxLength={100}
                  />

                  <ThemedText variant="small" color={theme.textMuted} style={styles.inputLabel}>
                    备注（可选）
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { 
                      backgroundColor: theme.backgroundTertiary,
                      color: currentTheme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="添加备注..."
                    placeholderTextColor={theme.textMuted}
                    value={bookmarkNote}
                    onChangeText={setBookmarkNote}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>

                {/* Modal Footer */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => setBookmarkModalVisible(false)}
                  >
                    <ThemedText variant="bodyMedium" color={currentTheme.text}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]} 
                    onPress={handleSubmitBookmark}
                    disabled={bookmarkSubmitting}
                  >
                    {bookmarkSubmitting ? (
                      <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                    ) : (
                      <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>保存</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 文本选择菜单 - 固定在底部 */}
      {textSelection && !showMarkMenu && (
        <>
          {/* 透明遮罩层，点击关闭 */}
          <Pressable
            style={styles.selectionOverlay}
            onPress={handleCancelSelection}
          />
          {/* 底部菜单 */}
          <View style={styles.selectionMenu}>
            <TouchableOpacity
              style={[styles.selectionMenuItem, { backgroundColor: theme.primary }]}
              onPress={handleOpenMarkMenu}
            >
              <FontAwesome6 name="highlighter" size={14} color="#FFFFFF" />
              <ThemedText variant="bodyMedium" color="#FFFFFF">标注</ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* 标注菜单 */}
      {textSelection && showMarkMenu && (
        <>
          <Pressable
            style={styles.selectionOverlay}
            onPress={() => setShowMarkMenu(false)}
          />
          <View style={[styles.markMenu, { backgroundColor: currentTheme.background }]}>
            {/* 画线类型 - 三选一 */}
            <View style={styles.markSectionLabel}>
              <ThemedText variant="small" color={theme.textMuted}>画线样式</ThemedText>
            </View>
            <View style={styles.markTypeRow}>
              {MARK_TYPES.map(item => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.markTypeItem,
                    selectedMarkType === item.type && { backgroundColor: theme.primary + '15' },
                  ]}
                  onPress={() => setSelectedMarkType(item.type)}
                >
                  <View style={[
                    styles.markTypeIcon,
                    { backgroundColor: selectedMarkType === item.type ? theme.primary : theme.backgroundSecondary },
                  ]}>
                    <FontAwesome6
                      name={item.icon}
                      size={16}
                      color={selectedMarkType === item.type ? '#FFFFFF' : theme.textPrimary}
                    />
                  </View>
                  <ThemedText
                    variant="tiny"
                    color={selectedMarkType === item.type ? theme.primary : theme.textMuted}
                  >
                    {item.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* 分隔线 */}
            <View style={[styles.markDivider, { backgroundColor: theme.border }]} />

            {/* 颜色选择 */}
            <View style={styles.markSectionLabel}>
              <ThemedText variant="small" color={theme.textMuted}>选择颜色</ThemedText>
            </View>
            <View style={styles.markColorRow}>
              {MARK_COLORS.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.markColorItem,
                    { backgroundColor: item.value },
                    selectedMarkColor === item.value && { borderColor: theme.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedMarkColor(item.value)}
                />
              ))}
            </View>

            {/* 分隔线 */}
            <View style={[styles.markDivider, { backgroundColor: theme.border }]} />

            {/* 操作按钮 */}
            <View style={styles.markActionRow}>
              {/* 完成按钮 - 只画线不加笔记 */}
              <TouchableOpacity
                style={[styles.markActionButton, { backgroundColor: theme.primary }]}
                onPress={handleQuickMark}
                disabled={savingNote}
              >
                {savingNote ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome6 name="check" size={16} color="#FFFFFF" />
                    <ThemedText variant="bodyMedium" color="#FFFFFF">完成</ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {/* 添加笔记按钮 */}
              <TouchableOpacity
                style={[styles.markActionButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary, borderWidth: 1 }]}
                onPress={() => {
                  setShowMarkMenu(false);
                  setShowNoteModal(true);
                }}
              >
                <FontAwesome6 name="pen-to-square" size={16} color={theme.primary} />
                <ThemedText variant="bodyMedium" color={theme.primary}>添加笔记</ThemedText>
              </TouchableOpacity>
            </View>

            {/* 取消按钮 */}
            <TouchableOpacity
              style={styles.markCancelButton}
              onPress={() => setShowMarkMenu(false)}
            >
              <ThemedText variant="bodyMedium" color={theme.textMuted}>取消</ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* 标注输入 Modal */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNoteModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.noteModalContent, { backgroundColor: currentTheme.background }]}>
                <View style={styles.modalHeader}>
                  <ThemedText variant="h4" color={currentTheme.text}>添加标注</ThemedText>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowNoteModal(false)}>
                    <FontAwesome6 name="xmark" size={20} color={currentTheme.text} />
                  </TouchableOpacity>
                </View>

                {/* 选中的文字 */}
                <View style={[styles.selectedTextContainer, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText variant="small" color={theme.textMuted}>选中文字：</ThemedText>
                  <ThemedText variant="body" color={currentTheme.text} style={styles.selectedText}>
                    {textSelection?.selectedText}
                  </ThemedText>
                </View>

                {/* 笔记输入 */}
                <ThemedText variant="small" color={theme.textMuted} style={styles.inputLabel}>
                  笔记（可选）
                </ThemedText>
                <TextInput
                  style={[styles.textInput, styles.textArea, {
                    backgroundColor: theme.backgroundTertiary,
                    color: currentTheme.text,
                    borderColor: theme.border,
                  }]}
                  placeholder="添加笔记..."
                  placeholderTextColor={theme.textMuted}
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  textAlignVertical="top"
                  autoFocus
                />

                {/* 按钮 */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowNoteModal(false)}
                  >
                    <ThemedText variant="bodyMedium" color={currentTheme.text}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                    onPress={handleSaveNote}
                    disabled={savingNote}
                  >
                    {savingNote ? (
                      <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                    ) : (
                      <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>保存</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 标注详情 Modal */}
      <Modal
        visible={showNoteDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoteDetail(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => !isEditingNote && setShowNoteDetail(false)}>
            <View style={[styles.noteDetailModal, { backgroundColor: currentTheme.background }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.noteDetailScrollContent}
              >
                <TouchableWithoutFeedback>
                  <View>
                    <View style={styles.modalHeader}>
                      <ThemedText variant="h4" color={currentTheme.text}>我的标注</ThemedText>
                      <TouchableOpacity style={styles.closeButton} onPress={() => setShowNoteDetail(false)}>
                        <FontAwesome6 name="xmark" size={20} color={currentTheme.text} />
                      </TouchableOpacity>
                    </View>

                    {/* 标注的文本 - 简略显示 */}
                    <View style={[styles.highlightedTextCompact, { backgroundColor: theme.backgroundSecondary }]}>
                      <ThemedText variant="body" color={currentTheme.text} numberOfLines={2}>
                        {clickedNote?.highlightedText && clickedNote.highlightedText.length > 50
                          ? clickedNote.highlightedText.substring(0, 50) + '...'
                          : clickedNote?.highlightedText}
                      </ThemedText>
                    </View>

                    {/* 画线类型选择 - 始终显示 */}
                    <View style={styles.modalBody}>
                      <ThemedText variant="small" color={theme.textMuted} style={styles.inputLabel}>
                        画线样式
                      </ThemedText>
                      <View style={styles.editMarkTypeRow}>
                        {MARK_TYPES.map(item => (
                          <TouchableOpacity
                            key={item.type}
                            style={[
                              styles.editMarkTypeItem,
                              editNoteMarkType === item.type && { backgroundColor: theme.primary + '15', borderColor: theme.primary },
                            ]}
                            onPress={() => {
                              setEditNoteMarkType(item.type);
                              // 立即保存
                              if (clickedNote) {
                                updateUserNote(clickedNote.id, { markType: item.type });
                                setUserNotes(prev => prev.map(n =>
                                  n.id === clickedNote.id ? { ...n, markType: item.type } : n
                                ));
                                setClickedNote(prev => prev ? { ...prev, markType: item.type } : null);
                              }
                            }}
                          >
                            <FontAwesome6
                              name={item.icon}
                              size={14}
                              color={editNoteMarkType === item.type ? theme.primary : theme.textMuted}
                            />
                            <ThemedText
                              variant="tiny"
                              color={editNoteMarkType === item.type ? theme.primary : theme.textMuted}
                            >
                              {item.label}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* 颜色选择 - 始终显示 */}
                      <ThemedText variant="small" color={theme.textMuted} style={[styles.inputLabel, { marginTop: 12 }]}>
                        标注颜色
                      </ThemedText>
                      <View style={styles.editColorRow}>
                        {MARK_COLORS.map(item => (
                          <TouchableOpacity
                            key={item.value}
                            style={[
                              styles.editColorItem,
                              { backgroundColor: item.value },
                              editNoteColor === item.value && { borderColor: theme.primary, borderWidth: 2 },
                            ]}
                            onPress={() => {
                              setEditNoteColor(item.value);
                              // 立即保存
                              if (clickedNote) {
                                updateUserNote(clickedNote.id, { color: item.value });
                                setUserNotes(prev => prev.map(n =>
                                  n.id === clickedNote.id ? { ...n, color: item.value } : n
                                ));
                                setClickedNote(prev => prev ? { ...prev, color: item.value } : null);
                              }
                            }}
                          />
                        ))}
                      </View>
                    </View>

                    {/* 笔记内容 - 查看/编辑模式 */}
                    {isEditingNote ? (
                      <View style={styles.modalBody}>
                        <ThemedText variant="small" color={theme.textMuted} style={styles.inputLabel}>
                          编辑笔记
                        </ThemedText>
                        <TextInput
                          style={[styles.textInput, styles.textAreaLarge, {
                            backgroundColor: theme.backgroundTertiary,
                            color: currentTheme.text,
                            borderColor: theme.border,
                          }]}
                          placeholder="添加笔记..."
                          placeholderTextColor={theme.textMuted}
                          value={editNoteContent}
                          onChangeText={setEditNoteContent}
                          multiline
                          numberOfLines={6}
                          maxLength={1000}
                          textAlignVertical="top"
                          autoFocus
                        />
                      </View>
                    ) : (
                      clickedNote?.noteContent ? (
                        <View style={styles.modalBody}>
                          <ThemedText variant="small" color={theme.textMuted} style={styles.inputLabel}>
                            我的笔记
                          </ThemedText>
                          <View style={[styles.noteContentBox, { backgroundColor: theme.backgroundSecondary }]}>
                            <ThemedText variant="body" color={currentTheme.text}>
                              {clickedNote.noteContent}
                            </ThemedText>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.modalBody}>
                          <ThemedText variant="small" color={theme.textMuted}>
                            暂无笔记内容，点击编辑添加
                          </ThemedText>
                        </View>
                      )
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </ScrollView>

              {/* 操作按钮 - 固定在底部 */}
              <View style={[styles.modalFooterFixed, { backgroundColor: currentTheme.background }]}>
                {isEditingNote ? (
                  <View style={styles.modalFooterButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCancelEditNote}
                      disabled={savingEditNote}
                    >
                      <ThemedText variant="bodyMedium" color={currentTheme.text}>取消</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                      onPress={handleSaveEditNote}
                      disabled={savingEditNote}
                    >
                      {savingEditNote ? (
                        <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                      ) : (
                        <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>保存</ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.modalFooterButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton, styles.deleteButton]}
                      onPress={handleDeleteNote}
                      disabled={deletingNote}
                    >
                      {deletingNote ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <FontAwesome6 name="trash" size={14} color="#EF4444" />
                          <ThemedText variant="bodyMedium" color="#EF4444">删除</ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                      onPress={handleStartEditNote}
                    >
                      <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>编辑</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </Screen>
  );
}

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Text, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/contexts/SettingsContext';
import { useScriptText } from '@/hooks/useScriptText';
import { Screen } from '@/components/Screen';
import { ParagraphWithAnnotation } from '@/components/ParagraphWithAnnotation';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createAudioPlayer, AudioPlayer, AudioStatus } from 'expo-audio';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { updateReadingProgress, getReadingRecords } from '@/utils/readingProgress';
import { scrollToSection } from './scrollHelper';
import { getDeviceId } from '@/utils/deviceId';
import {
  loadReadingSettings,
  getCachedSettings,
  saveFontSize as saveFontSizeToStorage,
  saveBackgroundTheme as saveBackgroundThemeToStorage,
  saveViewMode as saveViewModeToStorage,
  saveTtsVoice as saveTtsVoiceToStorage,
  saveTtsSpeed as saveTtsSpeedToStorage,
} from '@/utils/readingSettings';
import {
  getCachedVolume,
  setCachedVolume,
} from '@/utils/volumeCache';

interface Paragraph {
  id: number;
  volume_number: number;
  year_mark: string;
  emperor: string;
  bc_year: number | null;
  event_index: number;
  paragraph_index: number;
  content: string;
  content_traditional?: string | null;  // 繁体内容
  with_notes: string | null;
  with_notes_traditional?: string | null;  // 繁体注解内容
  translation: string | null;
  translation_traditional?: string | null;  // 繁体译文
  is_chenguangyue: boolean;
}

// TTS朗读分段（按条目）
interface TTSSegment {
  id: number;           // paragraph id
  yearIndex: number;    // 年份索引
  paragraphIndex: number; // 条目索引（在年份内）
  yearMark: string;     // 年份标识
  emperor: string;      // 帝王名
  text: string;         // 朗读文本
}

interface YearGroup {
  emperor: string;
  year_mark: string;
  year_display?: string;  // 格式化后的年份显示（含干支）
  era_name?: string | null;  // 年号
  gan_zhi?: string | null;  // 干支
  bc_year: number | null;
  emperor_note?: string | null;  // 帝王注解（胡三省注）
  paragraphs: Paragraph[];
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

interface VolumeData {
  volume_number: number;
  years: YearGroup[];
}

interface CatalogYear {
  id: number;
  year_name: string;
  year_display: string;  // 格式化后的年份显示
  year_num: number;
  bc_year: number;
}

interface CatalogEmperor {
  emperor: {
    id: number;
    name: string;
  };
  years: CatalogYear[];
}

interface CatalogData {
  volume: {
    id: number;
    volume_number: number;
    title?: string;
  };
  catalog: CatalogEmperor[];
}

type ViewMode = 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation' | 'translation';
type BackgroundTheme = 'light' | 'dark' | 'sepia';
type SettingsTab = 'catalog' | 'font' | 'background' | 'viewMode' | 'tts' | null;

const FONT_SIZES = [
  { label: '小', value: 16 },
  { label: '中', value: 18 },
  { label: '大', value: 20 },
  { label: '特大', value: 22 },
];

const BACKGROUND_THEMES: Record<BackgroundTheme, { background: string; text: string; name: string; color: string }> = {
  light: { background: '#FFFFFF', text: '#1F2937', name: '亮色', color: '#FFFFFF' },
  dark: { background: '#1F2937', text: '#F3F4F6', name: '暗色', color: '#1F2937' },
  sepia: { background: '#F5F0E6', text: '#5C4B37', name: '护眼', color: '#F5F0E6' },
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
  const { scriptMode, setScriptMode } = useSettings();
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
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const yearSectionRefs = useRef<Map<number, View | React.Component>>(new Map());
  const yearLayoutsRef = useRef<Map<number, number>>(new Map());  // 记录年份组的布局位置 (y 坐标)
  const currentScrollYRef = useRef(0);  // 记录当前滚动位置
  const paragraphRefs = useRef<Map<number, View>>(new Map());
  const paragraphLayoutsRef = useRef<Map<number, { y: number; height: number }>>(new Map());  // 段落布局位置
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
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
  const [ttsVoice, setTtsVoice] = useState(cachedSettings.ttsVoice);
  const [ttsSpeed, setTtsSpeed] = useState(cachedSettings.ttsSpeed);

  const [volumeData, setVolumeData] = useState<VolumeData | null>(null);
  const [volumeMeta, setVolumeMeta] = useState<VolumeMeta | null>(null);
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalParagraphs, setTotalParagraphs] = useState(0);
  const initializedRef = useRef(false);
  const currentVolumeRef = useRef<number | null>(null);
  const loadedParagraphsRef = useRef(0);
  const pendingJumpRef = useRef<{ bcYear: number } | null>(null);

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
      // 查找当前滚动位置对应的年份
      let foundYear = null;
      const scrollY = currentScrollYRef.current;
      
      // 遍历年份布局，找到第一个可见的
      for (let i = 0; i < volumeData.years.length; i++) {
        const layoutY = yearLayoutsRef.current.get(i);
        if (layoutY !== undefined && layoutY >= scrollY - 100) {  // 允许一点误差
          foundYear = volumeData.years[i];
          break;
        }
      }
      
      // 如果没找到，使用第一个年份
      if (!foundYear) {
        foundYear = volumeData.years[0];
      }
      
      setCurrentVisibleYear({
        yearMark: foundYear.year_mark,
        emperor: foundYear.emperor,
      });
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

  // 获取当前播放条目的显示信息
  const getPlayingSegmentInfo = useCallback((): string => {
    if (!ttsSegmentsRef.current || currentPlayingIndex < 0) return '';
    const segment = ttsSegmentsRef.current[currentPlayingIndex];
    if (!segment) return '';
    
    // 获取年份内的条目序号
    const yearStartIndex = ttsSegmentsRef.current.findIndex(s => 
      s.yearIndex === segment.yearIndex && s.paragraphIndex === 0
    );
    const itemInYear = currentPlayingIndex - yearStartIndex + 1;
    const totalInYear = ttsSegmentsRef.current.filter(s => s.yearIndex === segment.yearIndex).length;
    
    return `${segment.yearMark} · ${itemInYear}/${totalInYear}`;
  }, [currentPlayingIndex]);

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
    // 从segment中获取paragraphId
    const segments = ttsSegmentsRef.current;
    const segment = segments.find(s => s.yearIndex === yearIndex && s.paragraphIndex === paragraphIndex);
    
    if (!segment || !scrollViewRef.current || !scrollContentRef.current) return;
    
    const paragraphRef = paragraphRefs.current.get(segment.id); // segment.id 就是 paragraph.id
    
    if (paragraphRef) {
      scrollToSection({
        sectionRef: paragraphRef,
        scrollViewRef,
        scrollContentRef,
        onSuccess: () => {
          // 滚动成功
        },
        onError: () => {
          // 滚动失败，回退到年份区域
          const y = yearLayoutsRef.current.get(yearIndex);
          if (y !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y, animated: true });
          }
        },
      });
    } else {
      // 如果找不到段落引用，回退到年份区域
      const y = yearLayoutsRef.current.get(yearIndex);
      if (y !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y, animated: true });
      }
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
    
    // 合并新的
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
        setTotalParagraphs(result.total);
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
        paragraphLayoutsRef.current.clear();       // 清空段落布局
        setVolumeData(null);
        setHasMore(false);
      }

      // 判断是否是静默刷新（已初始化且是同一卷）
      const isSilentRefresh = initializedRef.current && isSameVolume;

      // 首次加载设置
      if (!initializedRef.current) {
        loadReadingSettings().then(settings => {
          setFontSize(settings.fontSize);
          setBackgroundTheme(settings.backgroundTheme);
          setViewMode(settings.viewMode);
          setTtsVoice(settings.ttsVoice);
          setTtsSpeed(settings.ttsSpeed);
        });
        initializedRef.current = true;
      }

      // 加载数据
      fetchVolumeData(volumeNumber, isSilentRefresh);
      fetchCatalog(volumeNumber);
      fetchVolumeMeta(volumeNumber);
      // 注意：不再重置进度，进入页面时不应该修改阅读进度
      currentVolumeRef.current = volumeNumber;
    }, [id, fetchVolumeData, fetchCatalog, fetchVolumeMeta])
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
      totalParagraphsRef.current = totalP;
      
      // 初始化：如果还没有设置段落ID，设置为第一个年份的第一个段落
      if (currentVisibleParagraphIdRef.current === 0 && volumeData.years?.length > 0 && volumeData.years[0].paragraphs?.length > 0) {
        currentVisibleParagraphIdRef.current = volumeData.years[0].paragraphs[0].id;
      }
    }
  }, [volumeData, catalogData]);

  // 滚动到指定年份段落
  const scrollToYear = useCallback((yearIndex: number, retryCount = 0) => {
    const sectionRef = yearSectionRefs.current.get(yearIndex);
    if (!sectionRef || !scrollViewRef.current || !scrollContentRef.current) {
      if (retryCount < 10) {
        setTimeout(() => {
          scrollToYear(yearIndex, retryCount + 1);
        }, 300);
      } else {
        console.warn('scrollToYear: max retries reached, cannot find section ref');
      }
      return;
    }

    scrollToSection({
      sectionRef,
      scrollViewRef,
      scrollContentRef,
      onSuccess: () => {
        setShowToolbar(false);
        setActiveTab(null);
      },
      onError: () => {
        setShowToolbar(false);
        setActiveTab(null);
      },
    });
  }, []);

  // 滚动到高亮段落（从搜索结果跳转）
  const scrollToHighlightParagraph = useCallback((paragraphId: number, retryCount = 0) => {
    const paragraphRef = paragraphRefs.current.get(paragraphId);
    
    if (!paragraphRef || !scrollViewRef.current || !scrollContentRef.current) {
      if (retryCount < 20) {
        // 如果段落未加载，尝试加载更多数据
        if (hasMore && !loadingMore && currentVolumeRef.current) {
          fetchVolumeData(currentVolumeRef.current, true, true);
        }
        setTimeout(() => {
          scrollToHighlightParagraph(paragraphId, retryCount + 1);
        }, 500);
      } else {
        console.warn('scrollToHighlightParagraph: max retries reached');
      }
      return;
    }

    scrollToSection({
      sectionRef: paragraphRef,
      scrollViewRef,
      scrollContentRef,
      onSuccess: () => {
        setShowToolbar(false);
        setActiveTab(null);
      },
      onError: () => {
        setShowToolbar(false);
        setActiveTab(null);
      },
    });
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
        
        if (currentVolume && paragraphId > 0 && paragraphLayoutsRef.current.size > 0) {
          // 计算进度：段落索引 / 总段落数
          const sortedParagraphs = Array.from(paragraphLayoutsRef.current.keys())
            .sort((a, b) => a - b);
          const paragraphIndex = sortedParagraphs.indexOf(paragraphId);
          const progress = sortedParagraphs.length > 0 
            ? Math.round((paragraphIndex / sortedParagraphs.length) * 100) 
            : 0;
          
          // 异步保存
          updateReadingProgress(currentVolume, progress, paragraphId);
        }
      };
    }, [])
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
      
      // 只有当进度 > 0 且有段落记录时才恢复位置
      // 进度为 0% 表示用户在顶部，不需要滚动
      if (record && record.progress > 0 && record.lastParagraphIndex > 0) {
        hasRestoredPositionRef.current = true;
        // 延迟滚动确保 ref 已更新
        setTimeout(() => {
          scrollToHighlightParagraph(record.lastParagraphIndex);
        }, 500);
      }
    }).catch(err => {
      console.error('恢复阅读位置失败:', err);
    });
  }, [volumeData, loading, highlightId, scrollToHighlightParagraph, scrollToParagraphId]);

  // 从目录跳转
  const handleCatalogItemClick = useCallback((yearName: string, emperorName: string, bcYear: number) => {
    const yearIndex = volumeData?.years.findIndex(y => y.bc_year === bcYear);
    if (yearIndex !== undefined && yearIndex >= 0) {
      // 目标已加载，直接滚动
      scrollToYear(yearIndex);
    } else if (hasMore && currentVolumeRef.current && !loadingMore) {
      // 目标未加载，设置待跳转目标并触发加载
      pendingJumpRef.current = { bcYear };
      fetchVolumeData(currentVolumeRef.current, true, true);
    }
  }, [volumeData?.years, scrollToYear, hasMore, loadingMore, fetchVolumeData]);

  // 处理待跳转目标：当数据加载完成后执行跳转
  useEffect(() => {
    if (!pendingJumpRef.current || !volumeData?.years) return;

    const { bcYear } = pendingJumpRef.current;
    const yearIndex = volumeData.years.findIndex(y => y.bc_year === bcYear);

    if (yearIndex >= 0) {
      // 目标已加载，执行跳转
      pendingJumpRef.current = null;
      // 延迟一帧确保 ref 已更新
      setTimeout(() => scrollToYear(yearIndex), 100);
    } else if (hasMore && !loadingMore && currentVolumeRef.current) {
      // 目标仍未加载，继续加载
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
      pendingJumpRef.current = { yearName: yearMark, emperorName: emperor };
      fetchVolumeData(currentVolumeRef.current, true, true);
    }
  }, [yearMark, emperor, volumeData?.years, hasMore, loadingMore, scrollToYear, fetchVolumeData]);

  // 点击屏幕处理 - 判断是点击还是滚动
  const handleScreenTap = useCallback(() => {
    if (activeTab) {
      setActiveTab(null);
    } else {
      setShowToolbar(prev => !prev);
    }
  }, [activeTab]);

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
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

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

  // 触摸开始
  const handleTouchStart = useCallback((e: any) => {
    touchStartX.current = e.nativeEvent.locationX;
    touchStartY.current = e.nativeEvent.locationY;
    touchStartTime.current = Date.now();
  }, []);

  // 触摸结束 - 判断是否为点击或滑动
  const handleTouchEnd = useCallback((e: any) => {
    const endX = e.nativeEvent.locationX;
    const endY = e.nativeEvent.locationY;
    const endTime = Date.now();
    
    const dx = endX - touchStartX.current;
    const dy = endY - touchStartY.current;
    const dt = endTime - touchStartTime.current;
    
    // 滑动手势检测参数
    const SWIPE_THRESHOLD = 80;  // 最小滑动距离（提高阈值减少误触）
    const SWIPE_TIME_LIMIT = 500;  // 最大滑动时间（毫秒）
    
    // 检测水平滑动（要求水平距离明显大于垂直距离，避免与垂直滚动冲突）
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > SWIPE_THRESHOLD && dt < SWIPE_TIME_LIMIT) {
      if (dx > 0) {
        // 右滑 -> 上一章节
        goToPreviousVolume();
      } else {
        // 左滑 -> 下一章节
        goToNextVolume();
      }
      return;
    }
    
    // 如果移动距离小于10px，认为是点击
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      handleScreenTap();
    }
  }, [handleScreenTap, goToPreviousVolume, goToNextVolume]);

  // 工具栏按钮点击
  const handleTabPress = useCallback((tab: SettingsTab) => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
  }, [activeTab]);

  // 渲染目录面板
  const renderCatalogPanel = () => (
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

            {/* 年份列表 - 直接展示 */}
            <View style={styles.yearList}>
              {group.years.map((year, yearIndex) => {
                // 公元纪年格式化
                const formatYear = (bcYear: number) => {
                  if (bcYear < 0) return `公元前${Math.abs(bcYear)}年`;
                  if (bcYear > 0) return `公元${bcYear}年`;
                  return year.year_name;
                };
                
                // 使用 emperor name + bc_year 作为稳定的 key
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

  // 渲染字体设置面板
  const renderFontPanel = () => (
    <View style={[styles.panel, { backgroundColor: currentTheme.background }]}>
      <View style={styles.panelHeader}>
        <ThemedText variant="h4" color={currentTheme.text}>字体大小</ThemedText>
        <TouchableOpacity onPress={() => setActiveTab(null)}>
          <FontAwesome6 name="xmark" size={18} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.panelContent}>
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
      </View>
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
          ].map(mode => (
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
          ))}
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
      <Screen backgroundColor={currentTheme.background} statusBarStyle={backgroundTheme === 'dark' ? 'light' : 'dark'}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.text} />
        </View>
      </Screen>
    );
  }

  if (error || !volumeData) {
    return (
      <Screen backgroundColor={currentTheme.background} statusBarStyle={backgroundTheme === 'dark' ? 'light' : 'dark'}>
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
    <Screen backgroundColor={currentTheme.background} statusBarStyle={backgroundTheme === 'dark' ? 'light' : 'dark'}>
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
      
      {/* 顶部栏 */}
      <View style={[styles.header, { backgroundColor: currentTheme.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={18} color={currentTheme.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerTitle} 
          onPress={handleTitleDoubleTap}
          activeOpacity={0.7}
        >
          <ThemedText variant="h4" color={currentTheme.text}>
            {volumeMeta?.volume_name || catalogData?.volume.title || `第${volumeData.volume_number}卷`}
          </ThemedText>
        </TouchableOpacity>
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
        
        {/* 播放按钮 */}
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
      </View>

      {/* 内容区域 */}
      <View style={{ flex: 1 }}>
        <ScrollView 
          ref={scrollViewRef} 
          contentContainerStyle={styles.scrollContent}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onScrollBeginDrag={() => {
            // 滚动开始时自动关闭工具栏和面板
            if (showToolbar || activeTab) {
              setShowToolbar(false);
              setActiveTab(null);
            }
          }}
          scrollEventThrottle={400}
          onScroll={({ nativeEvent }) => {
            // 记录当前滚动位置
            currentScrollYRef.current = nativeEvent.contentOffset.y;
            
            // 计算屏幕中心位置对应的段落
            const screenCenterY = nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height / 2;
            
            // 遍历所有段落布局，找到中心位置所在的段落
            if (paragraphLayoutsRef.current.size > 0) {
              let centerParagraphId = 0;
              
              // 将段落布局按 y 坐标排序
              const sortedParagraphs = Array.from(paragraphLayoutsRef.current.entries())
                .sort((a, b) => a[1].y - b[1].y);
              
              for (const [pId, layout] of sortedParagraphs) {
                const paragraphBottom = layout.y + layout.height;
                if (screenCenterY >= layout.y && screenCenterY < paragraphBottom) {
                  centerParagraphId = pId;
                  break;
                }
                // 如果中心位置在当前段落之后，继续找
                if (screenCenterY >= paragraphBottom) {
                  centerParagraphId = pId;
                }
              }
              
              if (centerParagraphId > 0 && centerParagraphId !== currentVisibleParagraphIdRef.current) {
                currentVisibleParagraphIdRef.current = centerParagraphId;
              }
            }
            
            // 滚动到 70% 时加载更多
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const scrollPercent = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
            if (scrollPercent > 0.7 && hasMore && !loadingMore) {
              handleLoadMore();
            }
          }}
        >
          <View ref={scrollContentRef} style={styles.content}>
              {/* 卷元数据 */}
              {volumeMeta?.time_range && (
                <ThemedText variant="caption" color={theme.textMuted} style={styles.metaText}>
                  {volumeMeta.time_range}
                </ThemedText>
              )}
              
              {/* 卷首注 */}
              {volumeMeta?.introduction && viewMode.includes('annotation') && (
                <ThemedText variant="caption" color={theme.textAnnotation || theme.textSecondary} style={styles.introductionText}>
                  {volumeMeta.introduction.replace(/^[〈《]|[》〉]$/g, '')}
                </ThemedText>
              )}
              
              {hasYears ? (
                volumeData.years.map((year, yearIndex) => {
                  // 使用 emperor + bc_year 作为稳定的 key，避免数据更新后 key 冲突
                  const yearKey = `${year.emperor}-${year.bc_year || yearIndex}`;
                  return (
                    <View
                      key={yearKey}
                      ref={(ref) => {
                        if (ref) {
                          yearSectionRefs.current.set(yearIndex, ref);
                          }
                        }}
                        style={styles.yearSection}
                        onLayout={(event) => {
                          // 记录每个年份组的布局位置
                          const { y } = event.nativeEvent.layout;
                          yearLayoutsRef.current.set(yearIndex, y);
                        }}
                      >
                        <View style={[styles.yearHeader, { backgroundColor: backgroundTheme === 'dark' ? '#374151' : theme.backgroundTertiary }]}>
                          <View style={styles.yearLabelContainer}>
                            <FontAwesome6 name="calendar-day" size={14} color={theme.accent} />
                            <ThemedText variant="h4" color={theme.accent} style={styles.yearLabel}>
                              {year.year_display || year.year_mark}
                            </ThemedText>
                            {/* 干支显示 */}
                            {year.gan_zhi && (
                              <ThemedText variant="caption" color={theme.textMuted}>
                                （{year.gan_zhi}）
                              </ThemedText>
                            )}
                            {year.bc_year && (
                              <ThemedText variant="caption" color={theme.textMuted} style={styles.yearBcText}>
                                {year.bc_year < 0 ? `公元前${Math.abs(year.bc_year)}年` : `公元${year.bc_year}年`}
                              </ThemedText>
                            )}
                          </View>
                        </View>
                        
                        {/* 帝王注解（胡三省注） */}
                        {year.emperor_note && viewMode.includes('annotation') && (
                          <View style={[styles.emperorNoteInline, { backgroundColor: theme.backgroundTertiary }]}>
                            <ThemedText variant="annotation" color={theme.textAnnotation || theme.textSecondary}>
                              {year.emperor_note}
                            </ThemedText>
                          </View>
                        )}

                        <View style={styles.yearContent}>
                          {year.paragraphs.map((paragraph, pIndex) => {
                            // 根据脚本模式和显示模式选择内容
                            // 繁体 + 注解模式：优先使用 with_notes_traditional
                            // 繁体 + 无注解：使用 content_traditional
                            // 简体 + 注解模式：优先使用 with_notes
                            // 简体 + 无注解：使用 content
                            const showAnnotation = viewMode.includes('annotation');
                            
                            let displayContent: string;
                            if (scriptMode === 'traditional') {
                              if (showAnnotation && paragraph.with_notes_traditional) {
                                displayContent = paragraph.with_notes_traditional;
                              } else {
                                displayContent = paragraph.content_traditional || paragraph.content;
                              }
                            } else {
                              if (showAnnotation && paragraph.with_notes) {
                                displayContent = paragraph.with_notes;
                              } else {
                                displayContent = paragraph.content;
                              }
                            }
                            
                            const displayTranslation = scriptMode === 'traditional' && paragraph.translation_traditional
                              ? paragraph.translation_traditional
                              : paragraph.translation;

                            // 检查是否是高亮段落（搜索高亮 或 TTS播放高亮）
                            const isSearchHighlighted = highlightId ? parseInt(highlightId) === paragraph.id : false;
                            const isTtsHighlighted = highlightedParagraphId === paragraph.id;

                            return (
                            <View 
                              key={paragraph.id || pIndex} 
                              ref={(ref) => {
                                if (ref) {
                                  paragraphRefs.current.set(paragraph.id, ref);
                                }
                              }}
                              onLayout={(event) => {
                                // 记录段落的布局位置
                                const { y, height } = event.nativeEvent.layout;
                                paragraphLayoutsRef.current.set(paragraph.id, { y, height });
                              }}
                              style={[
                                { marginBottom: Spacing.md },
                                isTtsHighlighted && { 
                                  backgroundColor: theme.primary + '10',
                                  borderRadius: BorderRadius.md,
                                  marginHorizontal: -Spacing.sm,
                                  paddingHorizontal: Spacing.sm,
                                  paddingVertical: Spacing.xs,
                                }
                              ]}
                            >
                              <ParagraphWithAnnotation
                                volumeNumber={volumeData.volume_number}
                                paragraphId={paragraph.id}
                                content={displayContent}
                                translation={displayTranslation || undefined}
                                viewMode={viewMode}
                                fontSize={fontSize}
                                textColor={currentTheme.text}
                                highlightKeyword={keyword}
                                isHighlighted={isSearchHighlighted}
                              />
                            </View>
                          );})}
                        </View>
                      </View>
                    );
                  })
                ) : (
                <View style={styles.centerContainer}>
                  <FontAwesome6 name="book-open" size={32} color={currentTheme.text} />
                  <ThemedText variant="body" color={currentTheme.text} style={{ marginTop: Spacing.md }}>
                    暂无内容
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              {loadingMore ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={currentTheme.text} />
                  <ThemedText variant="caption" color={currentTheme.text} style={{ marginLeft: Spacing.sm }}>
                    加载中...
                  </ThemedText>
                </View>
              ) : hasMore ? (
                <ThemedText variant="caption" color={currentTheme.text}>
                  — 向下滚动加载更多 —
                </ThemedText>
              ) : (
                <ThemedText variant="caption" color={currentTheme.text}>
                  — 点击屏幕显示设置 —
                </ThemedText>
              )}
            </View>
          </ScrollView>
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
                  <TouchableOpacity onPress={() => setBookmarkModalVisible(false)}>
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
    </Screen>
  );
}

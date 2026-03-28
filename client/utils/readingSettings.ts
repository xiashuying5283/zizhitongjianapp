import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  fontSize: '@reading_font_size',
  backgroundTheme: '@reading_background_theme',
  viewMode: '@reading_view_mode',
  textLayout: '@reading_text_layout',
  ttsVoice: '@reading_tts_voice',
  ttsSpeed: '@reading_tts_speed',
};

type BackgroundTheme = 'light' | 'dark' | 'sepia';
type ViewMode = 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation' | 'translation';
type TextLayout = 'horizontal' | 'vertical';

interface ReadingSettings {
  fontSize: number;
  backgroundTheme: BackgroundTheme;
  viewMode: ViewMode;
  textLayout: TextLayout;
  ttsVoice: string;
  ttsSpeed: number;
}

// 内存缓存
let cachedSettings: ReadingSettings | null = null;
let initialized = false;

// 默认值
const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  backgroundTheme: 'light',
  viewMode: 'original+annotation',
  textLayout: 'horizontal',
  ttsVoice: 'audiobook',
  ttsSpeed: 0,
};

/**
 * 一次性加载所有阅读设置（带内存缓存）
 */
export async function loadReadingSettings(): Promise<ReadingSettings> {
  if (initialized && cachedSettings) {
    return cachedSettings;
  }

  try {
    const [fontSize, backgroundTheme, viewMode, textLayout, ttsVoice, ttsSpeed] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.fontSize),
      AsyncStorage.getItem(STORAGE_KEYS.backgroundTheme),
      AsyncStorage.getItem(STORAGE_KEYS.viewMode),
      AsyncStorage.getItem(STORAGE_KEYS.textLayout),
      AsyncStorage.getItem(STORAGE_KEYS.ttsVoice),
      AsyncStorage.getItem(STORAGE_KEYS.ttsSpeed),
    ]);

    cachedSettings = {
      fontSize: fontSize ? parseInt(fontSize) : DEFAULT_SETTINGS.fontSize,
      backgroundTheme: (backgroundTheme as BackgroundTheme) || DEFAULT_SETTINGS.backgroundTheme,
      viewMode: (viewMode as ViewMode) || DEFAULT_SETTINGS.viewMode,
      textLayout: (textLayout as TextLayout) || DEFAULT_SETTINGS.textLayout,
      ttsVoice: ttsVoice || DEFAULT_SETTINGS.ttsVoice,
      ttsSpeed: ttsSpeed ? parseInt(ttsSpeed) : DEFAULT_SETTINGS.ttsSpeed,
    };
    initialized = true;
    return cachedSettings;
  } catch (e) {
    console.error('加载阅读设置失败:', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 获取缓存的设置（同步，需先调用 loadReadingSettings）
 */
export function getCachedSettings(): ReadingSettings {
  return cachedSettings || DEFAULT_SETTINGS;
}

/**
 * 保存字体大小
 */
export async function saveFontSize(size: number): Promise<void> {
  if (cachedSettings) {
    cachedSettings.fontSize = size;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.fontSize, String(size));
}

/**
 * 保存背景主题
 */
export async function saveBackgroundTheme(theme: BackgroundTheme): Promise<void> {
  if (cachedSettings) {
    cachedSettings.backgroundTheme = theme;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.backgroundTheme, theme);
}

/**
 * 保存显示模式
 */
export async function saveViewMode(mode: ViewMode): Promise<void> {
  if (cachedSettings) {
    cachedSettings.viewMode = mode;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.viewMode, mode);
}

/**
 * 保存TTS音色
 */
export async function saveTtsVoice(voice: string): Promise<void> {
  if (cachedSettings) {
    cachedSettings.ttsVoice = voice;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.ttsVoice, voice);
}

/**
 * 保存TTS语速
 */
export async function saveTtsSpeed(speed: number): Promise<void> {
  if (cachedSettings) {
    cachedSettings.ttsSpeed = speed;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.ttsSpeed, String(speed));
}

/**
 * 保存文字排版方向
 */
export async function saveTextLayout(layout: TextLayout): Promise<void> {
  if (cachedSettings) {
    cachedSettings.textLayout = layout;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.textLayout, layout);
}

export type { ViewMode, BackgroundTheme, TextLayout };

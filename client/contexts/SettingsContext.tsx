import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ScriptMode = 'simplified' | 'traditional';
export type ReadingMode = 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation' | 'translation';
export type FontFamily = 'system' | 'serif' | 'kaiti' | 'lishu' | 'zhengkai';

interface SettingsContextType {
  // 字体设置
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: FontFamily;
  setFontFamily: (family: FontFamily) => void;
  
  // 主题设置
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  
  // 阅读模式
  readingMode: ReadingMode;
  setReadingMode: (mode: ReadingMode) => void;
  
  // 简繁切换
  scriptMode: ScriptMode;
  setScriptMode: (mode: ScriptMode) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  FONT_SIZE: 'settings_font_size',
  FONT_FAMILY: 'settings_font_family',
  THEME_MODE: 'settings_theme_mode',
  READING_MODE: 'settings_reading_mode',
  SCRIPT_MODE: 'settings_script_mode',
};

// 字体大小范围
export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 28;
export const FONT_SIZE_DEFAULT = 18;

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState(FONT_SIZE_DEFAULT);
  const [fontFamily, setFontFamilyState] = useState<FontFamily>('system');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [readingMode, setReadingModeState] = useState<ReadingMode>('original+annotation');
  const [scriptMode, setScriptModeState] = useState<ScriptMode>('simplified');
  const [loaded, setLoaded] = useState(false);

  // 加载保存的设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedFontSize, savedFontFamily, savedThemeMode, savedReadingMode, savedScriptMode] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE),
          AsyncStorage.getItem(STORAGE_KEYS.FONT_FAMILY),
          AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE),
          AsyncStorage.getItem(STORAGE_KEYS.READING_MODE),
          AsyncStorage.getItem(STORAGE_KEYS.SCRIPT_MODE),
        ]);

        if (savedFontSize) {
          setFontSizeState(Number(savedFontSize));
        }
        if (savedFontFamily) {
          setFontFamilyState(savedFontFamily as FontFamily);
        }
        if (savedThemeMode) {
          setThemeModeState(savedThemeMode as ThemeMode);
        }
        if (savedReadingMode) {
          setReadingModeState(savedReadingMode as any);
        }
        if (savedScriptMode) {
          setScriptModeState(savedScriptMode as ScriptMode);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const setFontSize = useCallback(async (size: number) => {
    const clampedSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
    setFontSizeState(clampedSize);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, String(clampedSize));
    } catch (error) {
      console.error('Failed to save font size:', error);
    }
  }, []);

  const setFontFamily = useCallback(async (family: FontFamily) => {
    setFontFamilyState(family);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_FAMILY, family);
    } catch (error) {
      console.error('Failed to save font family:', error);
    }
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  }, []);

  const setReadingMode = useCallback(async (mode: ReadingMode) => {
    setReadingModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.READING_MODE, mode);
    } catch (error) {
      console.error('Failed to save reading mode:', error);
    }
  }, []);

  const setScriptMode = useCallback(async (mode: ScriptMode) => {
    setScriptModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCRIPT_MODE, mode);
    } catch (error) {
      console.error('Failed to save script mode:', error);
    }
  }, []);

  // 等待设置加载完成
  if (!loaded) {
    return null;
  }

  return (
    <SettingsContext.Provider
      value={{
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        themeMode,
        setThemeMode,
        readingMode,
        setReadingMode,
        scriptMode,
        setScriptMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

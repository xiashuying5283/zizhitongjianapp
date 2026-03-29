import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useSettings, FONT_SIZE_MIN, FONT_SIZE_MAX } from '@/contexts/SettingsContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { fontSize, setFontSize, fontFamily, setFontFamily, themeMode, setThemeMode, readingMode, setReadingMode, scriptMode, setScriptMode } = useSettings();

  const fontSizeOptions = [
    { label: '小', value: 14 },
    { label: '中', value: 18 },
    { label: '大', value: 22 },
    { label: '特大', value: 26 },
  ];

  const fontFamilyOptions = [
    { label: '系统默认', value: 'system' as const, desc: '苹方/思源黑体' },
    { label: '宋体', value: 'serif' as const, desc: '传统印刷风格' },
    { label: '楷体', value: 'kaiti' as const, desc: '古典书法韵味' },
    { label: '隶书', value: 'lishu' as const, desc: '典雅庄重风格' },
    { label: '正楷', value: 'zhengkai' as const, desc: '规范楷书风格' },
  ];

  const themeOptions = [
    { label: '跟随系统', value: 'system' as const, icon: 'mobile-screen' as const },
    { label: '浅色模式', value: 'light' as const, icon: 'sun' as const },
    { label: '深色模式', value: 'dark' as const, icon: 'moon' as const },
  ];

  const readingModeOptions = [
    { label: '仅原文', value: 'original' as const, desc: '只显示古文原文' },
    { label: '原文+注解', value: 'original+annotation' as const, desc: '原文配合司马光注解' },
    { label: '原文+译文', value: 'original+translation' as const, desc: '原文配合白话翻译' },
    { label: '全部显示', value: 'original+annotation+translation' as const, desc: '原文、注解、译文' },
    { label: '纯译文', value: 'translation' as const, desc: '仅显示白话译文' },
  ];

  const scriptModeOptions = [
    { label: '简体字', value: 'simplified' as const, desc: '使用简体中文字符' },
    { label: '繁体字', value: 'traditional' as const, desc: '使用繁体中文字符' },
  ];

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>设置</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 字体设置 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            字体大小
          </ThemedText>
          
          <View style={styles.fontSizePreview}>
            <ThemedText style={{ fontSize, color: theme.textPrimary, lineHeight: fontSize * 1.8 }}>
              资治通鉴 · 周纪一
            </ThemedText>
          </View>

          <View style={styles.fontSizeOptions}>
            {fontSizeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.fontSizeButton,
                  fontSize === option.value && styles.fontSizeButtonActive,
                  { borderColor: fontSize === option.value ? theme.primary : theme.border },
                ]}
                onPress={() => setFontSize(option.value)}
              >
                <ThemedText
                  variant="smallMedium"
                  color={fontSize === option.value ? theme.primary : theme.textPrimary}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fontSizeSlider}>
            <TouchableOpacity onPress={() => setFontSize(Math.max(FONT_SIZE_MIN, fontSize - 2))}>
              <FontAwesome6 name="minus" size={20} color={theme.textMuted} />
            </TouchableOpacity>
            <ThemedText variant="body" color={theme.textPrimary}>{fontSize}px</ThemedText>
            <TouchableOpacity onPress={() => setFontSize(Math.min(FONT_SIZE_MAX, fontSize + 2))}>
              <FontAwesome6 name="plus" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* 字体风格 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            字体风格
          </ThemedText>

          {fontFamilyOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.settingItem}
              onPress={() => setFontFamily(option.value)}
            >
              <View style={styles.settingInfoWithDesc}>
                <ThemedText variant="body" color={theme.textPrimary}>{option.label}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>{option.desc}</ThemedText>
              </View>
              <View style={[
                styles.radioButton,
                { borderColor: fontFamily === option.value ? theme.primary : theme.border },
                fontFamily === option.value && { backgroundColor: theme.primary }
              ]}>
                {fontFamily === option.value && (
                  <FontAwesome6 name="check" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* 主题设置 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            显示模式
          </ThemedText>
          
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.settingItem}
              onPress={() => setThemeMode(option.value)}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primary + '15' }]}>
                  <FontAwesome6 name={option.icon} size={18} color={theme.primary} />
                </View>
                <ThemedText variant="body" color={theme.textPrimary}>{option.label}</ThemedText>
              </View>
              <View style={[
                styles.radioButton,
                { borderColor: themeMode === option.value ? theme.primary : theme.border },
                themeMode === option.value && { backgroundColor: theme.primary }
              ]}>
                {themeMode === option.value && (
                  <FontAwesome6 name="check" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* 阅读模式 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            阅读模式
          </ThemedText>
          
          {readingModeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.settingItem}
              onPress={() => setReadingMode(option.value)}
            >
              <View style={styles.settingInfoWithDesc}>
                <ThemedText variant="body" color={theme.textPrimary}>{option.label}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>{option.desc}</ThemedText>
              </View>
              <View style={[
                styles.radioButton,
                { borderColor: readingMode === option.value ? theme.primary : theme.border },
                readingMode === option.value && { backgroundColor: theme.primary }
              ]}>
                {readingMode === option.value && (
                  <FontAwesome6 name="check" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* 简繁切换 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            字体风格
          </ThemedText>
          
          {scriptModeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.settingItem}
              onPress={() => setScriptMode(option.value)}
            >
              <View style={styles.settingInfoWithDesc}>
                <ThemedText variant="body" color={theme.textPrimary}>{option.label}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>{option.desc}</ThemedText>
              </View>
              <View style={[
                styles.radioButton,
                { borderColor: scriptMode === option.value ? theme.primary : theme.border },
                scriptMode === option.value && { backgroundColor: theme.primary }
              ]}>
                {scriptMode === option.value && (
                  <FontAwesome6 name="check" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* 关于 */}
        <ThemedView level="root" style={styles.section}>
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/about')}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#8B5CF615' }]}>
                <FontAwesome6 name="circle-info" size={18} color="#8B5CF6" />
              </View>
              <ThemedText variant="body" color={theme.textPrimary}>关于资治通鉴</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </ThemedView>

        {/* 重置 */}
        <ThemedView level="root" style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setFontSize(18);
              setFontFamily('system');
              setThemeMode('system');
              setReadingMode('original+annotation');
              setScriptMode('simplified');
            }}
          >
            <ThemedText variant="smallMedium" color={theme.textSecondary}>恢复默认设置</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

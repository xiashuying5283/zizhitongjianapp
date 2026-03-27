import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

export default function AboutScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const handleOpenLink = (url: string) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>关于</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo & Name */}
        <View style={styles.appInfo}>
          <View style={[styles.appLogo, { backgroundColor: theme.primary + '15' }]}>
            <FontAwesome6 name="book-open" size={48} color={theme.primary} />
          </View>
          <ThemedText variant="h2" color={theme.textPrimary} style={{ marginTop: Spacing.lg }}>
            资治通鉴
          </ThemedText>
          <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: Spacing.sm }}>
            版本 1.0.0
          </ThemedText>
        </View>

        {/* 简介 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            关于《资治通鉴》
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.paragraph}>
            《资治通鉴》是北宋司马光主编的一部多卷本编年体史书，共294卷，历时19年完成。记载了从战国到五代共1362年的史实。
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.paragraph}>
            本书以政治、军事和民族关系为主，兼及经济、文化和历史人物评价，目的是通过对事关国家盛衰、民族兴亡的统治阶级政策的描述警示后人。
          </ThemedText>
        </ThemedView>

        {/* 作者简介 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            关于作者
          </ThemedText>
          <View style={styles.authorCard}>
            <View style={[styles.authorAvatar, { backgroundColor: theme.primary + '15' }]}>
              <FontAwesome6 name="user" size={24} color={theme.primary} />
            </View>
            <View style={styles.authorInfo}>
              <ThemedText variant="h4" color={theme.textPrimary}>司马光</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>1019年 - 1086年</ThemedText>
            </View>
          </View>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.paragraph}>
            司马光，字君实，号迂叟，陕州夏县（今山西夏县）人。北宋政治家、史学家、文学家，历仕仁宗、英宗、神宗、哲宗四朝，卒谥&ldquo;文正&rdquo;。
          </ThemedText>
        </ThemedView>

        {/* 功能特点 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            应用功能
          </ThemedText>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <FontAwesome6 name="book" size={16} color={theme.primary} />
              <ThemedText variant="body" color={theme.textPrimary}>按卷阅读原文内容</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <FontAwesome6 name="language" size={16} color={theme.primary} />
              <ThemedText variant="body" color={theme.textPrimary}>白话文翻译对照阅读</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <FontAwesome6 name="pencil" size={16} color={theme.primary} />
              <ThemedText variant="body" color={theme.textPrimary}>添加个人批注与高亮</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <FontAwesome6 name="bookmark" size={16} color={theme.primary} />
              <ThemedText variant="body" color={theme.textPrimary}>阅读进度自动保存</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <FontAwesome6 name="user-group" size={16} color={theme.primary} />
              <ThemedText variant="body" color={theme.textPrimary}>历史人物关系图谱</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* 数据来源 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            数据来源
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.paragraph}>
            本应用原文数据来源于中华文库等公开资源，翻译内容由AI辅助生成，仅供参考。
          </ThemedText>
        </ThemedView>

        {/* 版权信息 */}
        <View style={styles.footer}>
          <ThemedText variant="caption" color={theme.textMuted}>
            2024 资治通鉴阅读应用
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: Spacing.xs }}>
            仅供学习交流使用
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

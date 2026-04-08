import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { openWechat, openWeibo, copyToClipboard } from '@/utils/share';

interface ContactItem {
  icon: string;
  title: string;
  value: string;
  action: () => void;
  actionText: string;
}

export default function ContactScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:zizhitongjian@example.com').catch(() => {
      Alert.alert('提示', '无法打开邮件应用');
    });
  };

  const handleWechat = async () => {
    Alert.alert('微信号', 'ZiZhiTongJian_Reader', [
      { 
        text: '复制微信号', 
        onPress: async () => {
          await copyToClipboard('ZiZhiTongJian_Reader');
          Alert.alert('已复制', '微信号已复制到剪贴板');
        }
      },
      { text: '取消', style: 'cancel' }
    ]);
  };

  const handleGithub = () => {
    Linking.openURL('https://github.com/zizhitongjian-reader').catch(() => {
      Alert.alert('提示', '无法打开浏览器');
    });
  };

  // 打开微信
  const handleOpenWechat = async () => {
    await openWechat();
  };

  // 打开微博
  const handleOpenWeibo = async () => {
    await openWeibo();
  };

  const contacts: ContactItem[] = [
    {
      icon: 'envelope',
      title: '邮箱',
      value: 'zizhitongjian@example.com',
      action: handleEmail,
      actionText: '发送邮件',
    },
    {
      icon: 'comments',
      title: '微信',
      value: 'ZiZhiTongJian_Reader',
      action: handleWechat,
      actionText: '复制微信号',
    },
    {
      icon: 'github',
      title: 'GitHub',
      value: 'github.com/zizhitongjian-reader',
      action: handleGithub,
      actionText: '访问主页',
    },
  ];

  const teamMembers = [
    { name: '司马光', role: '原著作者', desc: '北宋政治家、史学家' },
    { name: '开发团队', role: '应用开发', desc: '致力于推广传统文化' },
  ];

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>联系作者</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Author Introduction */}
        <ThemedView level="root" style={styles.authorCard}>
          <View style={styles.authorAvatar}>
            <FontAwesome6 name="feather-pointed" size={40} color={theme.primary} />
          </View>
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.authorName}>
            司马光
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.authorBio}>
            北宋政治家、史学家、文学家。历仕四朝，主持编纂《资治通鉴》，
            历时十九年完成，为后世留下宝贵的历史遗产。
          </ThemedText>
        </ThemedView>

        {/* Contact Methods */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            联系方式
          </ThemedText>
          {contacts.map((item, index) => (
            <View key={index} style={styles.contactItem}>
              <View style={styles.contactInfo}>
                <View style={[styles.contactIcon, { backgroundColor: theme.primary + '15' }]}>
                  <FontAwesome6 name={item.icon as any} size={18} color={theme.primary} />
                </View>
                <View style={styles.contactText}>
                  <ThemedText variant="small" color={theme.textMuted}>{item.title}</ThemedText>
                  <ThemedText variant="body" color={theme.textPrimary}>{item.value}</ThemedText>
                </View>
              </View>
              <TouchableOpacity style={styles.contactAction} onPress={item.action}>
                <ThemedText variant="smallMedium" color={theme.primary}>{item.actionText}</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </ThemedView>

        {/* Team */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            项目团队
          </ThemedText>
          {teamMembers.map((member, index) => (
            <View key={index} style={styles.teamItem}>
              <View style={[styles.teamAvatar, { backgroundColor: theme.backgroundTertiary }]}>
                <FontAwesome6 name="user" size={20} color={theme.textSecondary} />
              </View>
              <View style={styles.teamInfo}>
                <ThemedText variant="body" color={theme.textPrimary}>{member.name}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>{member.role} · {member.desc}</ThemedText>
              </View>
            </View>
          ))}
        </ThemedView>

        {/* Appreciation */}
        <ThemedView level="root" style={styles.appreciationCard}>
          <FontAwesome6 name="heart" size={24} color="#E11D48" style={styles.appreciationIcon} />
          <ThemedText variant="body" color={theme.textPrimary} style={styles.appreciationText}>
            感谢您对《资治通鉴》的关注{'\n'}
            我们会持续优化产品，为您带来更好的阅读体验
          </ThemedText>
        </ThemedView>

        {/* Social Links */}
        <View style={styles.socialLinks}>
          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: theme.backgroundTertiary }]}
            onPress={handleOpenWechat}
          >
            <FontAwesome6 name="weixin" size={24} color="#07C160" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: theme.backgroundTertiary }]}
            onPress={handleOpenWeibo}
          >
            <FontAwesome6 name="weibo" size={24} color="#E6162D" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: theme.backgroundTertiary }]}
            onPress={handleGithub}
          >
            <FontAwesome6 name="github" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={styles.copyright}>
          <ThemedText variant="caption" color={theme.textMuted}>
            2026 资治通鉴阅读团队{'\n'}
            保留所有权利
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

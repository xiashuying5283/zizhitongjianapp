import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface VipPlan {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  duration: string;
  features: string[];
  recommended?: boolean;
}

export default function VipScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>('year');

  const plans: VipPlan[] = [
    {
      id: 'month',
      name: '月度会员',
      price: '12',
      duration: '1个月',
      features: ['无广告阅读体验', '专属字体选择', '云同步阅读进度'],
    },
    {
      id: 'year',
      name: '年度会员',
      price: '98',
      originalPrice: '144',
      duration: '12个月',
      features: ['无广告阅读体验', '专属字体选择', '云同步阅读进度', '离线下载功能', '优先客服支持'],
      recommended: true,
    },
    {
      id: 'lifetime',
      name: '终身会员',
      price: '298',
      originalPrice: '498',
      duration: '永久',
      features: ['所有年度会员权益', '永久免费更新', '专属会员标识', '历史人物图谱', '定制阅读主题'],
    },
  ];

  const vipBenefits = [
    { icon: 'ban' as const, title: '免广告体验', desc: '沉浸式阅读，无广告打扰' },
    { icon: 'cloud' as const, title: '云端同步', desc: '多设备无缝切换，进度不丢失' },
    { icon: 'palette' as const, title: '专属主题', desc: '多款精美主题随心切换' },
    { icon: 'download' as const, title: '离线阅读', desc: '下载卷目，无网络也能读' },
    { icon: 'headset' as const, title: '专属客服', desc: '优先响应，贴心服务' },
    { icon: 'crown' as const, title: '会员标识', desc: '专属身份标识彰显尊贵' },
  ];

  const handleSubscribe = () => {
    alert('会员功能仍在筹备中，当前页面用于展示规划权益。');
  };

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>会员中心</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* VIP Header */}
        <View style={styles.vipHeader}>
          <View style={styles.vipIconContainer}>
            <FontAwesome6 name="crown" size={40} color="#FFD700" />
          </View>
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.vipTitle}>
            会员功能规划
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.vipSubtitle}>
            会员体系仍在筹备中，以下为计划中的权益方向
          </ThemedText>
        </View>

        {/* Benefits Grid */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            会员特权
          </ThemedText>
          <View style={styles.benefitsGrid}>
            {vipBenefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: theme.primary + '15' }]}>
                  <FontAwesome6 name={benefit.icon} size={18} color={theme.primary} />
                </View>
                <ThemedText variant="smallMedium" color={theme.textPrimary}>{benefit.title}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>{benefit.desc}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>

        {/* Plans */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            选择套餐
          </ThemedText>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.recommended && styles.planCardRecommended,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.recommended && (
                <View style={styles.recommendedTag}>
                  <ThemedText variant="caption" color="#fff">推荐</ThemedText>
                </View>
              )}
              <View style={styles.planHeader}>
                <View>
                  <ThemedText variant="h3" color={theme.textPrimary}>{plan.name}</ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted}>{plan.duration}</ThemedText>
                </View>
                <View style={styles.priceContainer}>
                  <ThemedText variant="h2" color={theme.primary}>¥{plan.price}</ThemedText>
                  {plan.originalPrice && (
                    <ThemedText variant="caption" color={theme.textMuted} style={styles.originalPrice}>
                      ¥{plan.originalPrice}
                    </ThemedText>
                  )}
                </View>
              </View>
              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <FontAwesome6 name="check" size={12} color={theme.primary} />
                    <ThemedText variant="small" color={theme.textSecondary}>{feature}</ThemedText>
                  </View>
                ))}
              </View>
              <View style={[
                styles.planRadio,
                { borderColor: selectedPlan === plan.id ? theme.primary : theme.border },
                selectedPlan === plan.id && { backgroundColor: theme.primary }
              ]}>
                {selectedPlan === plan.id && (
                  <FontAwesome6 name="check" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Subscribe Button */}
        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
          <ThemedText variant="body" color={theme.buttonPrimaryText}>查看上线说明</ThemedText>
        </TouchableOpacity>

        {/* Terms */}
        <View style={styles.terms}>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.termsText}>
            当前暂未开放购买，页面内容为功能规划展示{'\n'}
            实际上线权益请以后续正式说明为准
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

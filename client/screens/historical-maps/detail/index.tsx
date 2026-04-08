import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface MapDetailParams {
  id: string;
  type: 'dynasty' | 'topic';
}

const DYNASTY_MAPS: Record<string, any> = {
  qin: {
    title: '秦朝',
    years: '公元前221年 - 公元前207年',
    description: '统一六国后的大一统疆域',
    color: '#EF4444',
    imageUrl: 'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=800&h=500&fit=crop',
    details: '公元前221年，秦王嬴政统一六国，建立了中国历史上第一个大一统的封建王朝。秦朝疆域东至大海，西至陇西，南至南海，北至长城，奠定了中国两千多年来的基本版图。',
  },
  han: {
    title: '汉朝',
    years: '公元前202年 - 公元220年',
    description: '西汉与东汉的疆域变迁',
    color: '#F59E0B',
    mapUrl: 'https://fef96567-52b1-42de-98f1-87e6947e88c4.dev.coze.site/map/3b7f1d25dbed03ac25485678d69bcc18',
    imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=500&fit=crop',
    details: '汉朝分为西汉和东汉两个时期。西汉时期疆域东至朝鲜半岛，西至葱岭，北至大漠，南至南海。东汉时期，虽然西域控制有所减弱，但整体疆域依然辽阔，丝绸之路得到进一步发展。',
  },
  'three-kingdoms': {
    title: '三国',
    years: '公元220年 - 公元280年',
    description: '魏蜀吴三足鼎立',
    color: '#4F46E5',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=500&fit=crop',
    details: '三国时期，魏、蜀、吴三足鼎立。魏占据北方，蜀占据西南，吴占据东南。这一时期的疆域格局对后世产生了深远影响，特别是在民族融合和地区发展方面。',
  },
  jin: {
    title: '晋朝',
    years: '公元265年 - 公元420年',
    description: '西晋短暂统一与东晋偏安',
    color: '#0891B2',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop',
    details: '晋朝分为西晋和东晋两个时期。西晋时期短暂实现了大一统，但很快爆发八王之乱和永嘉之乱。东晋时期偏安江南，北方进入五胡十六国时期。',
  },
  sui: {
    title: '隋朝',
    years: '公元581年 - 公元618年',
    description: '再次大一统与大运河',
    color: '#10B981',
    imageUrl: 'https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&h=500&fit=crop',
    details: '隋朝结束了南北朝长期的分裂局面，实现了大一统。隋朝开凿了大运河，连接了南北经济文化交流，对后世产生了深远影响。',
  },
  tang: {
    title: '唐朝',
    years: '公元618年 - 公元907年',
    description: '盛唐时期疆域扩张',
    color: '#8B5CF6',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=500&fit=crop',
    details: '唐朝是中国历史上疆域最为辽阔的王朝之一。盛唐时期疆域东至朝鲜半岛，西至咸海，北至贝加尔湖，南至南海，是中国古代疆域的巅峰时期。',
  },
  song: {
    title: '宋朝',
    years: '公元960年 - 公元1279年',
    description: '北宋与南宋的版图',
    color: '#EC4899',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=500&fit=crop',
    details: '宋朝分为北宋和南宋两个时期。北宋时期疆域相对较小，南宋时期进一步缩小，但经济文化达到了前所未有的繁荣。',
  },
  yuan: {
    title: '元朝',
    years: '公元1271年 - 公元1368年',
    description: '蒙古帝国与四大汗国',
    color: '#F97316',
    imageUrl: 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=800&h=500&fit=crop',
    details: '元朝是蒙古族建立的王朝，疆域极为辽阔。元朝时期，西藏正式纳入中国版图，云南也被完全纳入中央集权统治，奠定了现代中国疆域的基础。',
  },
};

const TOPIC_MAPS: Record<string, any> = {
  'battle-chibi': {
    title: '赤壁之战',
    category: '战争',
    description: '三国时期著名的水战，奠定三国鼎立基础',
    color: '#EF4444',
    imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&h=500&fit=crop',
    details: '赤壁之战是东汉末年孙刘联军在长江赤壁一带大破曹操大军的战役。此战奠定了三国鼎立的基础，是中国历史上以少胜多的著名战役。',
  },
  'silk-road': {
    title: '丝绸之路',
    category: '贸易',
    description: '古代东西方文化交流的重要通道',
    color: '#F59E0B',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=500&fit=crop',
    details: '丝绸之路是古代连接中西方的商道，起始于古代中国，连接亚洲、非洲和欧洲的古代商业贸易路线。它不仅是一条贸易通道，更是一条文化、宗教、技术交流的通道。',
  },
  'great-wall': {
    title: '长城防线',
    category: '军事',
    description: '历代长城修筑历程与防御体系',
    color: '#4F46E5',
    imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop',
    details: '长城是中国古代的军事防御工程，始建于春秋战国时期，秦始皇统一六国后连接并扩建长城。此后历代王朝都有修筑长城，形成了今天我们看到的万里长城。',
  },
  'grand-canal': {
    title: '大运河',
    category: '工程',
    description: '隋唐时期开凿的人工运河',
    color: '#0891B2',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop',
    details: '大运河是世界上开凿最早、里程最长的人工运河，北起北京，南至杭州，全长约1794公里。大运河的开通大大促进了中国南北经济文化交流。',
  },
  'battle-tingzhou': {
    title: '定州之战',
    category: '战争',
    description: '安史之乱中的关键战役',
    color: '#EC4899',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop',
    details: '定州之战是安史之乱中的关键战役之一，唐军在此战中击败叛军，对平定安史之乱具有重要意义。',
  },
  'capital-locations': {
    title: '历代都城',
    category: '政治',
    description: '中国历代都城位置变迁',
    color: '#8B5CF6',
    imageUrl: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&h=500&fit=crop',
    details: '中国历代都城经历了多次迁移，从长安、洛阳到南京、北京，每个都城的选择都反映了当时的政治、经济、地理考量。',
  },
  'hundred-schools': {
    title: '百家争鸣',
    category: '文化',
    description: '战国时期思想文化繁荣景象',
    color: '#10B981',
    imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&h=500&fit=crop',
    details: '百家争鸣是战国时期思想文化繁荣的景象，儒家、道家、法家、墨家等各家学派竞相争鸣，形成了中国古代思想文化的高峰。',
  },
  'tribute-system': {
    title: '朝贡体系',
    category: '外交',
    description: '古代中国的外交体系',
    color: '#F97316',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=500&fit=crop',
    details: '朝贡体系是古代中国以中国为中心建立的外交体系，周边国家通过向中国朝贡获得承认和保护。',
  },
  'yellow-river': {
    title: '黄河变迁',
    category: '地理',
    description: '黄河河道的历史变迁',
    color: '#6366F1',
    imageUrl: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=800&h=500&fit=crop',
    details: '黄河是中国的母亲河，其河道在历史上多次变迁，对中国历史发展产生了深远影响。',
  },
  'tianxia': {
    title: '天下一统',
    category: '统一',
    description: '中国历史上三次大一统',
    color: '#D946EF',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=500&fit=crop',
    details: '中国历史上出现了三次重要的大一统时期：秦汉、隋唐、元明清，每次大一统都推动了中国历史的发展。',
  },
  'cultural-exchange': {
    title: '文化交流',
    category: '文化',
    description: '古代中外文化交流路线',
    color: '#0EA5E9',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=500&fit=crop',
    details: '古代中外文化交流主要通过丝绸之路、海上丝绸之路等路线进行，促进了不同文明之间的交流与融合。',
  },
  'economic-centers': {
    title: '经济中心',
    category: '经济',
    description: '古代中国经济中心南移',
    color: '#84CC16',
    imageUrl: 'https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&h=500&fit=crop',
    details: '古代中国经济中心经历了从北向南的转移过程，江南地区逐渐成为中国的经济重心。',
  },
};

export default function MapDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id, type } = useSafeSearchParams<MapDetailParams>();

  const screenWidth = Dimensions.get('window').width;
  const imageWidth = screenWidth - Spacing["2xl"] * 2;

  let mapData = null;
  if (type === 'dynasty') {
    mapData = DYNASTY_MAPS[id];
  } else if (type === 'topic') {
    mapData = TOPIC_MAPS[id];
  }

  if (!mapData) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
        <View style={styles.container}>
          <ThemedText variant="h4" color={theme.textPrimary}>
            地图不存在
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h2" color={theme.textPrimary}>
              地图详情
            </ThemedText>
            <TouchableOpacity style={styles.shareButton}>
              <FontAwesome6 name="share-nodes" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Map */}
        <View style={styles.mapContainer}>
          {mapData.mapUrl ? (
            <WebView
              source={{ uri: mapData.mapUrl }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              scalesPageToFit={true}
              scrollEnabled={false}
              bounces={false}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
              }}
              onLoad={() => {
                console.log('WebView loaded');
              }}
            />
          ) : mapData.imageUrl ? (
            <Image
              source={{ uri: mapData.imageUrl }}
              style={styles.mapImage}
              resizeMode="contain"
            />
          ) : null}
        </View>

        {/* Map Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleSection}>
            <View style={[styles.badge, { backgroundColor: mapData.color }]}>
              <ThemedText variant="small" color="#FFFFFF">
                {mapData.category || '历朝'}
              </ThemedText>
            </View>
            <ThemedText variant="h2" color={theme.textPrimary}>
              {mapData.title}
            </ThemedText>
          </View>

          <ThemedText
            variant="body"
            color={mapData.color}
            style={styles.years}
          >
            {mapData.years}
          </ThemedText>

          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            地图简介
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.description}>
            {mapData.description}
          </ThemedText>

          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            详细介绍
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.details}>
            {mapData.details}
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

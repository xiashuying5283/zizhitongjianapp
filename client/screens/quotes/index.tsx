import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';

interface Quote {
  id: number;
  content: string;
  author: string;
  volume: number;
  year: string;
  category: string;
}

interface QuoteGroup {
  category: string;
  quotes: Quote[];
}

const categories = ['全部', '治国', '用人', '军事', '修身', '谋略'];

export default function QuotesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');

  // 示例数据
  const quotes: Quote[] = [
    {
      id: 1,
      content: '兼听则明，偏信则暗。',
      author: '魏征',
      volume: 194,
      year: '贞观二年',
      category: '治国',
    },
    {
      id: 2,
      content: '为政之要，惟在得人；用非其才，必难致治。',
      author: '唐太宗',
      volume: 192,
      year: '武德九年',
      category: '用人',
    },
    {
      id: 3,
      content: '水能载舟，亦能覆舟。',
      author: '魏征',
      volume: 194,
      year: '贞观六年',
      category: '治国',
    },
    {
      id: 4,
      content: '夫以铜为镜，可以正衣冠；以古为镜，可以知兴替；以人为镜，可以明得失。',
      author: '唐太宗',
      volume: 197,
      year: '贞观十七年',
      category: '修身',
    },
    {
      id: 5,
      content: '兵者，国之大事，死生之地，存亡之道，不可不察也。',
      author: '孙武',
      volume: 1,
      year: '周威烈王二十三年',
      category: '军事',
    },
    {
      id: 6,
      content: '不战而屈人之兵，善之善者也。',
      author: '孙武',
      volume: 1,
      year: '周威烈王二十三年',
      category: '谋略',
    },
    {
      id: 7,
      content: '国之将兴，必有祯祥；国之将亡，必有妖孽。',
      author: '司马光',
      volume: 1,
      year: '周威烈王二十三年',
      category: '治国',
    },
    {
      id: 8,
      content: '明主之任人，如巧匠之制木。',
      author: '唐太宗',
      volume: 198,
      year: '贞观二十年',
      category: '用人',
    },
  ];

  const quoteGroups: QuoteGroup[] = useMemo(() => {
    const filtered = quotes.filter(quote => {
      const matchCategory = selectedCategory === '全部' || quote.category === selectedCategory;
      const matchSearch = !searchText ||
        quote.content.toLowerCase().includes(searchText.toLowerCase()) ||
        quote.author.toLowerCase().includes(searchText.toLowerCase());
      return matchCategory && matchSearch;
    });

    // 按分类分组
    const groups: QuoteGroup[] = [];
    const categoryMap = new Map<string, Quote[]>();

    filtered.forEach(quote => {
      if (!categoryMap.has(quote.category)) {
        categoryMap.set(quote.category, []);
      }
      categoryMap.get(quote.category)!.push(quote);
    });

    categoryMap.forEach((quotes, category) => {
      groups.push({ category, quotes });
    });

    return groups;
  }, [selectedCategory, searchText]);

  const handleQuotePress = (quote: Quote) => {
    // TODO: 跳转到名句详情页
    console.log('Quote pressed:', quote);
  };

  const renderQuoteCard = (quote: Quote) => (
    <TouchableOpacity
      key={quote.id}
      style={styles.quoteCard}
      onPress={() => handleQuotePress(quote)}
      activeOpacity={0.7}
    >
      <View style={styles.quoteIcon}>
        <FontAwesome6 name="quote-left" size={20} color="#10B981" />
      </View>
      <View style={styles.quoteContent}>
        <ThemedText variant="h4" color={theme.textPrimary} style={styles.quoteText}>
          {quote.content}
        </ThemedText>
        <View style={styles.quoteMeta}>
          <ThemedText variant="caption" color={theme.textMuted}>
            {quote.author}
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            ·
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            第{quote.volume}卷 · {quote.year}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderQuoteGroup = (group: QuoteGroup) => (
    <View key={group.category} style={styles.quoteGroup}>
      <ThemedText variant="h4" color={theme.textPrimary} style={styles.groupTitle}>
        {group.category}
      </ThemedText>
      {group.quotes.map(renderQuoteCard)}
    </View>
  );

  return (
    <Screen preset="fixed" backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <ThemedText variant="h2" color={theme.textPrimary}>典著名句</ThemedText>
        <ThemedText variant="body" color={theme.textSecondary} style={styles.headerSubtitle}>
          资治通鉴经典语录
        </ThemedText>
      </ThemedView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索名句..."
          placeholderTextColor={theme.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(category)}
          >
            <ThemedText
              variant="small"
              color={selectedCategory === category ? theme.buttonPrimaryText : theme.textSecondary}
            >
              {category}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quotes List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {quoteGroups.length > 0 ? (
          quoteGroups.map(renderQuoteGroup)
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="quote-left" size={48} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
              暂无数据
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

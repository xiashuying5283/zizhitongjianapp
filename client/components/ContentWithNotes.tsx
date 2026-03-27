import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

interface ContentWithNotesProps {
  content: string;
  translation?: string;
  viewMode: 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation';
  selectable?: boolean; // 是否可选择文本
}

/**
 * 解析并渲染带注解的内容
 * 
 * 段落识别规则：
 * 1. 按换行符(\n)分段 - 这是原文的自然段落结构
 * 2. 【...】是胡三省注，〈...〉是校勘记
 * 3. ①②③是事件编号，不是段落标记
 */
export function ContentWithNotes({ content, translation, viewMode, selectable = true }: ContentWithNotesProps) {
  const { theme } = useTheme();

  if (!content) return null;

  const showNotes = viewMode === 'original+annotation' || viewMode === 'original+annotation+translation';
  const showTranslation = viewMode === 'original+translation' || viewMode === 'original+annotation+translation';

  // 按换行符分段（保留原文的自然段落结构）
  const splitIntoParagraphs = (text: string): string[] => {
    // 按换行符分割，过滤空行
    return text.split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  };

  // 解析段落：识别【〈...〉】和【...】格式的注解
  const parseParagraph = (text: string) => {
    const parts: Array<{ type: 'text' | 'note'; content: string }> = [];
    
    // 匹配优先级：
    // 1. 【〈...〉】 - 胡三省注（完整格式，中间可能包含嵌套的【...】）
    // 2. 【...】 - 校勘记（不包含嵌套）
    // 3. 〈...〉 - 校勘记
    const regex = /【〈([\s\S]*?)〉】|【([^】]*)】|〈([^〈]*?)〉/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // 添加注解前的正文
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }
      // 添加注解（取第一个非空捕获组）
      const noteContent = match[1] || match[2] || match[3] || '';
      parts.push({
        type: 'note',
        content: noteContent,
      });
      lastIndex = regex.lastIndex;
    }

    // 添加剩余的正文
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return parts;
  };

  // 解析翻译段落（按换行分段）
  const splitTranslationParagraphs = (text: string): string[] => {
    if (!text) return [];
    return text.split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  };

  const paragraphs = splitIntoParagraphs(content);
  const translations = showTranslation ? splitTranslationParagraphs(translation || '') : [];

  return (
    <View style={styles.container}>
      {paragraphs.map((para, paraIndex) => {
        const parts = parseParagraph(para);
        const translationText = translations[paraIndex];
        
        return (
          <View key={paraIndex} style={styles.paragraphWrapper}>
            {/* 原文段落 */}
            {parts.length === 0 || (parts.length === 1 && parts[0].type === 'text') ? (
              <ThemedText
                variant="original"
                color={theme.textOriginal || theme.textPrimary}
                style={styles.paragraph}
                selectable={selectable}
              >
                {para}
              </ThemedText>
            ) : (
              <ThemedText
                variant="original"
                color={theme.textOriginal || theme.textPrimary}
                style={styles.paragraph}
                selectable={selectable}
              >
                {parts.map((part, partIndex) => {
                  if (part.type === 'text') {
                    return <React.Fragment key={partIndex}>{part.content}</React.Fragment>;
                  } else if (showNotes) {
                    return (
                      <ThemedText
                        key={partIndex}
                        variant="annotation"
                        color={theme.textAnnotation || theme.textSecondary}
                      >
                        {part.content}
                      </ThemedText>
                    );
                  }
                  return null;
                })}
              </ThemedText>
            )}
            
            {/* 译文 */}
            {showTranslation && translationText && (
              <ThemedText
                variant="translation"
                color={theme.textSecondary}
                style={styles.translation}
              >
                {translationText}
              </ThemedText>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create<any>({
  container: {
    flexDirection: 'column',
  },
  paragraphWrapper: {
    marginBottom: Spacing.md,
  },
  paragraph: {
    textIndent: '2em' as any,
    lineHeight: 34,
  },
  translation: {
    textIndent: '2em' as any,
    lineHeight: 28,
    marginTop: Spacing.xs,
    opacity: 0.9,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    paddingLeft: Spacing.md,
  },
});

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Spacing, Typography } from '@/constants/theme';
import { ClickableText } from './ClickableText';
import { parseTextForEntities, TextSegment } from '@/utils/textParser';

interface ParagraphWithAnnotationProps {
  volumeNumber: number;
  paragraphId: number;
  content: string;
  translation?: string;
  viewMode: 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation' | 'translation';
  fontSize?: number;
  textColor?: string;
  highlightKeyword?: string;  // 高亮关键词
  isHighlighted?: boolean;    // 是否是高亮段落
}

/**
 * 高亮文本中的关键词
 */
function renderHighlightedText(
  text: string,
  keyword: string,
  style: TextStyle,
  highlightColor: string = '#F59E0B'
): React.ReactNode {
  if (!keyword.trim()) {
    return <Text style={style} selectable>{text}</Text>;
  }

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  
  // 找出所有匹配位置
  const matches: { start: number; end: number }[] = [];
  let searchPos = 0;
  
  while (true) {
    const pos = lowerText.indexOf(lowerKeyword, searchPos);
    if (pos === -1) break;
    matches.push({ start: pos, end: pos + keyword.length });
    searchPos = pos + 1;
  }

  if (matches.length === 0) {
    return <Text style={style} selectable>{text}</Text>;
  }

  // 构建分段文本
  const segments: { text: string; highlighted: boolean }[] = [];
  let lastEnd = 0;

  matches.forEach((match) => {
    if (match.start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, match.start), highlighted: false });
    }
    segments.push({ text: text.slice(match.start, match.end), highlighted: true });
    lastEnd = match.end;
  });

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), highlighted: false });
  }

  return (
    <Text style={style} selectable>
      {segments.map((segment, index) => (
        <Text
          key={index}
          style={segment.highlighted ? { backgroundColor: highlightColor } : undefined}
          selectable
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

export function ParagraphWithAnnotation({
  content,
  translation,
  viewMode,
  fontSize = 18,
  textColor,
  highlightKeyword,
  isHighlighted,
}: ParagraphWithAnnotationProps) {
  const { theme } = useTheme();
  const router = useSafeRouter();

  // 显示批注
  const showNotes = viewMode === 'original+annotation' || viewMode === 'original+annotation+translation';
  // 显示译文
  const showTrans = viewMode === 'original+translation' || viewMode === 'original+annotation+translation' || viewMode === 'translation';
  // 纯译文模式
  const isTranslationOnly = viewMode === 'translation';

  // 文本样式
  const textStyle: TextStyle = useMemo(() => ({
    ...Typography.original,
    color: textColor || theme.textOriginal || theme.textPrimary,
    lineHeight: fontSize * 1.8,
    fontSize,
    textAlign: 'justify',
  }), [theme, textColor, fontSize]);

  // 注文样式
  const noteStyle: TextStyle = useMemo(() => ({
    ...Typography.annotation,
    color: theme.textAnnotation || theme.textSecondary,
  }), [theme]);

  // 译文样式
  const translationStyle: TextStyle = useMemo(() => ({
    ...Typography.translation,
    color: textColor || theme.textSecondary,
    lineHeight: fontSize * 1.5,
    fontSize: isTranslationOnly ? fontSize : fontSize - 2,
    marginTop: isTranslationOnly ? 0 : Spacing.md,
    opacity: 0.9,
    borderLeftWidth: isTranslationOnly ? 0 : 2,
    borderLeftColor: theme.border,
    paddingLeft: isTranslationOnly ? 0 : Spacing.md,
    textAlign: 'justify',
  }), [theme, textColor, fontSize, isTranslationOnly]);

  // 解析正文中的文本部分（不含注文）
  const contentTextParts = useMemo(() => {
    const parts: Array<{ type: 'text' | 'note'; content: string }> = [];
    const regex = /【〈([\s\S]*?)〉】|【([^】]*)】|〈([^〈]*?)〉/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      const noteContent = match[1] || match[2] || match[3] || '';
      parts.push({ type: 'note', content: noteContent });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts;
  }, [content]);

  // 解析正文中每个文本部分的实体
  const parsedContentWithEntities = useMemo(() => {
    return contentTextParts.map(part => {
      if (part.type === 'text') {
        return {
          type: 'text' as const,
          content: part.content,
          segments: parseTextForEntities(part.content)
        };
      } else {
        return part;
      }
    });
  }, [contentTextParts]);

  // 解析正文中的百科实体
  const contentSegments = useMemo(() => {
    return parseTextForEntities(content);
  }, [content]);

  // 检查是否需要显示注文
  const hasNotes = contentTextParts.some(p => p.type === 'note');

  // 高亮背景色
  const highlightBg = isHighlighted ? 'rgba(251, 191, 36, 0.15)' : 'transparent';

  return (
    <View style={{ backgroundColor: highlightBg, borderRadius: 8, marginHorizontal: -Spacing.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs }}>
      {/* 纯译文模式 */}
      {isTranslationOnly ? (
        translation ? (
          highlightKeyword ? (
            <Text style={textStyle} selectable>
              {'\u3000\u3000'}
              {renderHighlightedText(translation, highlightKeyword, textStyle)}
            </Text>
          ) : (
            <Text style={textStyle} selectable>
              {'\u3000\u3000'}
              {translation}
            </Text>
          )
        ) : (
          <Text style={[textStyle, { opacity: 0.5 }]} selectable>
            {'\u3000\u3000'}（暂无译文）
          </Text>
        )
      ) : (
        <>
          {/* 正文内容 */}
          {showNotes && hasNotes ? (
            <Text style={textStyle} selectable>
              {'\u3000\u3000'}
              {parsedContentWithEntities.map((part, index) => {
                if (part.type === 'text') {
                  if (highlightKeyword) {
                    return renderHighlightedText(part.content, highlightKeyword, textStyle);
                  }
                  return part.segments.map((seg: TextSegment, segIndex: number) => (
                    <Text
                      key={`${index}-${segIndex}`}
                      style={seg.isEntity ? {
                        color: seg.entityType === 'character' ? theme.primary : theme.accent,
                        textDecorationLine: 'none',
                        borderBottomWidth: 2,
                        borderBottomColor: seg.entityType === 'character' ? theme.primary : theme.accent,
                        paddingBottom: 2,
                      } : undefined}
                      onPress={seg.isEntity ? () => {
                        router.push('/encyclopedia-detail', {
                          type: seg.entityType,
                          name: seg.entityName
                        });
                      } : undefined}
                    >
                      {seg.text}
                    </Text>
                  ));
                } else {
                  return (
                    <Text key={index} style={noteStyle} selectable>
                      {part.content}
                    </Text>
                  );
                }
              })}
            </Text>
          ) : (
            highlightKeyword ? (
              <Text style={textStyle} selectable>
                {'\u3000\u3000'}
                {renderHighlightedText(content, highlightKeyword, textStyle)}
              </Text>
            ) : (
              <ClickableText
                segments={[
                  { text: '\u3000\u3000', isEntity: false },
                  ...contentSegments
                ]}
                style={textStyle}
                variant="body"
              />
            )
          )}

          {/* 译文 */}
          {showTrans && translation && (
            <Text style={translationStyle} selectable>
              {'\u3000\u3000'}
              {translation}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

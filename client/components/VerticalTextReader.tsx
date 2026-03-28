import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VerticalTextReaderProps {
  content: string;
  translation?: string;
  viewMode: 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation' | 'translation';
  fontSize: number;
  textColor: string;
  annotationColor: string;
  translationColor: string;
  bgColor: string;
  highlightKeyword?: string;
}

/**
 * 将内容解析为正文和注解片段
 * 注解格式：【...】 或 〈...〉 或 【〈...〉】
 */
function parseContent(content: string): Array<{ type: 'text' | 'note'; content: string }> {
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
}

/**
 * 生成竖排 HTML
 */
function generateHTML(props: VerticalTextReaderProps): string {
  const {
    content,
    translation,
    viewMode,
    fontSize,
    textColor,
    annotationColor,
    translationColor,
    bgColor,
    highlightKeyword,
  } = props;

  const showNotes = viewMode === 'original+annotation' || viewMode === 'original+annotation+translation';
  const showTrans = viewMode === 'original+translation' || viewMode === 'original+annotation+translation' || viewMode === 'translation';
  const isTranslationOnly = viewMode === 'translation';

  // 高亮关键词包裹函数
  const highlight = (text: string): string => {
    if (!highlightKeyword?.trim()) return escapeHTML(text);
    const escaped = escapeHTML(text);
    const kw = escapeHTML(highlightKeyword);
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark class="hl">$1</mark>');
  };

  // 转义 HTML 特殊字符
  function escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 正文区
  let bodyHTML = '';

  if (isTranslationOnly) {
    // 纯译文 - 横排
    bodyHTML = `<div class="translation-horizontal">${highlight(translation || '')}</div>`;
  } else if (showNotes) {
    // 竖排 + 夹注
    const parts = parseContent(content);
    const mainChars = parts.map(part => {
      if (part.type === 'text') {
        if (highlightKeyword?.trim()) {
          // 高亮模式：不能逐字拆分，用 span 包裹
          return `<span class="main-text">${highlight(part.content)}</span>`;
        }
        return `<span class="main-text">${escapeHTML(part.content)}</span>`;
      } else {
        // 注解 - 逐字夹入
        if (highlightKeyword?.trim()) {
          return `<ruby class="note">${highlight(part.content)}</ruby>`;
        }
        return `<ruby class="note">${escapeHTML(part.content)}</ruby>`;
      }
    }).join('');
    bodyHTML = `<div class="vertical-text">${mainChars}</div>`;
  } else {
    // 纯竖排原文
    if (highlightKeyword?.trim()) {
      bodyHTML = `<div class="vertical-text">${highlight(content)}</div>`;
    } else {
      bodyHTML = `<div class="vertical-text">${escapeHTML(content)}</div>`;
    }
  }

  // 译文区（竖排模式下放在正文下方，横排显示）
  if (showTrans && translation && !isTranslationOnly) {
    bodyHTML += `<div class="translation-sep"></div>`;
    bodyHTML += `<div class="translation-horizontal">${highlight(translation)}</div>`;
  }

  const rubyFontSize = Math.round(fontSize * 0.5);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  html, body {
    width: 100%;
    min-height: 100vh;
    background-color: ${bgColor};
    color: ${textColor};
    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    -webkit-text-size-adjust: none;
    overflow-x: hidden;
  }

  /* 竖排正文 */
  .vertical-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: ${fontSize}px;
    line-height: 2.2;
    letter-spacing: 0.15em;
    padding: 16px 12px;
    min-height: 60vh;
  }

  .main-text {
    /* 正文样式 */
  }

  /* 夹注 - 用 ruby 实现双行夹注 */
  .note {
    ruby-align: center;
    font-size: ${rubyFontSize}px;
    color: ${annotationColor};
    line-height: 1;
    letter-spacing: 0;
    ruby-position: inter-character;
  }

  .note > .hl {
    color: ${annotationColor};
  }

  /* 译文 - 横排 */
  .translation-horizontal {
    writing-mode: horizontal-tb;
    font-size: ${Math.round(fontSize * 0.8)}px;
    line-height: 1.8;
    color: ${translationColor};
    padding: 12px 16px;
    border-left: 2px solid ${annotationColor}33;
    margin: 8px 12px;
    padding-left: 12px;
    opacity: 0.85;
    text-align: justify;
  }

  .translation-sep {
    height: 1px;
    background: ${textColor}15;
    margin: 8px 12px;
  }

  /* 纯译文横排 */
  .translation-horizontal:only-child {
    margin: 16px 12px;
    font-size: ${fontSize}px;
    opacity: 1;
  }

  /* 搜索高亮 */
  .hl {
    background-color: rgba(251, 191, 36, 0.35);
    border-radius: 2px;
    padding: 0 1px;
  }

  /* 文本选择样式 */
  ::selection {
    background-color: rgba(59, 130, 246, 0.3);
  }

  /* 隐藏滚动条（Webkit） */
  ::-webkit-scrollbar {
    display: none;
  }
</style>
</head>
<body>
${bodyHTML}
<script>
  // 通知 RN 当前内容高度
  function sendHeight() {
    const h = document.documentElement.scrollHeight;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: h }));
    }
  }
  
  // 内容加载后和 resize 时发送高度
  window.addEventListener('load', () => {
    setTimeout(sendHeight, 100);
  });
  
  const observer = new ResizeObserver(() => sendHeight());
  observer.observe(document.body);
</script>
</body>
</html>`;
}

export function VerticalTextReader(props: VerticalTextReaderProps) {
  const html = useMemo(() => generateHTML(props), [
    props.content,
    props.translation,
    props.viewMode,
    props.fontSize,
    props.textColor,
    props.annotationColor,
    props.translationColor,
    props.bgColor,
    props.highlightKeyword,
  ]);

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={styles.webview}
      scrollEnabled={true}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      javaScriptEnabled={true}
      domStorageEnabled={false}
      textZoom={100}
      nestedScrollEnabled={true}
      // Android 硬件加速
      androidLayerType="hardware"
      // iOS 背景
      allowsInlineMediaPlayback={true}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99, // 避免某些 Android 设备上的闪烁
  },
});

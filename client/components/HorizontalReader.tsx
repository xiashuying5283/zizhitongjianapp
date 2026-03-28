import React, { useMemo, useRef, useCallback } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { StyleSheet } from 'react-native';

interface Paragraph {
  id: number;
  content: string;
  content_traditional?: string | null;
  with_notes: string | null;
  with_notes_traditional?: string | null;
  translation: string | null;
  translation_traditional?: string | null;
  is_chenguangyue: boolean;
}

interface YearGroup {
  emperor: string;
  year_mark: string;
  year_display?: string;
  era_name?: string | null;
  gan_zhi?: string | null;
  bc_year: number | null;
  emperor_note?: string | null;
  paragraphs: Paragraph[];
}

interface VolumeMeta {
  volume_number: number;
  volume_name: string;
  dynasty: string;
  year_start: number | null;
  year_end: number | null;
  time_range: string | null;
  introduction: string | null;
}

interface HorizontalReaderProps {
  volumeData: {
    volume_number: number;
    years: YearGroup[];
  };
  volumeMeta: VolumeMeta | null;
  viewMode: 'original' | 'original+annotation' | 'original+translation' | 'original+annotation+translation' | 'translation';
  scriptMode: 'simplified' | 'traditional';
  fontSize: number;
  textColor: string;
  bgColor: string;
  annotationColor: string;
  translationColor: string;
  accentColor: string;
  textMuted: string;
  highlightKeyword?: string;
  highlightedParagraphId?: number | null;
  onTap?: () => void;
  onLoadMore?: () => void;
  onVisibleParagraphChange?: (paragraphId: number, visibleIndex: number, totalLoaded: number) => void;
  onScrollToResult?: (targetId: number, success: boolean) => void;
  readerWebViewRef?: React.MutableRefObject<WebView | null>;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightText(text: string, keyword?: string): string {
  const escaped = escapeHTML(text);
  if (!keyword?.trim()) return escaped;
  const kw = escapeHTML(keyword);
  const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="hl">$1</mark>');
}

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

function generateHTML(props: HorizontalReaderProps): string {
  const {
    volumeData, volumeMeta, viewMode, scriptMode, fontSize,
    textColor, bgColor, annotationColor, translationColor,
    accentColor, textMuted,
    highlightKeyword: kw, highlightedParagraphId,
  } = props;

  const showNotes = viewMode === 'original+annotation' || viewMode === 'original+annotation+translation';
  const showTrans = viewMode === 'original+translation' || viewMode === 'original+annotation+translation' || viewMode === 'translation';
  const isTranslationOnly = viewMode === 'translation';
  const showAnnotation = viewMode.includes('annotation');
  const hl = (text: string) => highlightText(text, kw);

  const numberToChinese = (n: number): string => {
    const digits = '〇一二三四五六七八九';
    return String(n).split('').map(d => digits[parseInt(d)]).join('');
  };

  const formatBcYear = (bcYear: number | null) => {
    if (bcYear === null || bcYear === undefined) return '';
    if (bcYear < 0) return `公元前${Math.abs(bcYear)}年`;
    if (bcYear > 0) return `公元${bcYear}年`;
    return '';
  };

  const getDisplayContent = (p: Paragraph): string => {
    if (scriptMode === 'traditional') {
      if (showAnnotation && p.with_notes_traditional) return p.with_notes_traditional;
      return p.content_traditional || p.content;
    }
    if (showAnnotation && p.with_notes) return p.with_notes;
    return p.content;
  };

  const getDisplayTranslation = (p: Paragraph): string | null => {
    if (scriptMode === 'traditional' && p.translation_traditional) return p.translation_traditional;
    return p.translation;
  };

  // 构建年份区块
  let yearsHTML = '';
  for (let yi = 0; yi < volumeData.years.length; yi++) {
    const year = volumeData.years[yi];
    yearsHTML += `<div class="year-section" id="year-section-${yi}" data-year-index="${yi}">`;

    // 年号 + 干支 + 公元
    yearsHTML += `<div class="year-header">`;
    yearsHTML += `<span class="year-title">${escapeHTML(year.year_display || year.year_mark)}</span>`;
    if (year.gan_zhi) {
      yearsHTML += ` <span class="year-ganzhi">（${escapeHTML(year.gan_zhi)}）</span>`;
    }
    const bcStr = formatBcYear(year.bc_year);
    if (bcStr) {
      yearsHTML += ` <span class="year-bc">${bcStr}</span>`;
    }
    yearsHTML += `</div>`;

    // 帝王注解（有则显示）
    if (year.emperor_note) {
      yearsHTML += `<div class="emperor-note-wrapper"><span class="emperor-note-inline">${hl(year.emperor_note)}</span></div>`;
    }

    // 段落
    for (const paragraph of year.paragraphs) {
      const isHighlighted = highlightedParagraphId === paragraph.id;
      const hlClass = isHighlighted ? ' paragraph-hl' : '';

      if (isTranslationOnly) {
        const trans = getDisplayTranslation(paragraph);
        if (trans) {
          yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="translation-text">${hl(trans)}</div></div>`;
        } else {
          yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="translation-text empty">（暂无译文）</div></div>`;
        }
      } else if (showNotes) {
        const content = getDisplayContent(paragraph);
        const parts = parseContent(content);
        let chars = '';
        for (const part of parts) {
          if (part.type === 'text') {
            chars += hl(part.content);
          } else {
            chars += `<span class="note">${hl(part.content)}</span>`;
          }
        }
        yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="original-text">${chars}</div>`;

        if (showTrans) {
          const trans = getDisplayTranslation(paragraph);
          if (trans) {
            yearsHTML += `<div class="translation-text">${hl(trans)}</div>`;
          }
        }
        yearsHTML += `</div>`;
      } else {
        const content = getDisplayContent(paragraph);
        yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="original-text">${hl(content)}</div>`;

        if (showTrans) {
          const trans = getDisplayTranslation(paragraph);
          if (trans) {
            yearsHTML += `<div class="translation-text">${hl(trans)}</div>`;
          }
        }
        yearsHTML += `</div>`;
      }
    }
    yearsHTML += `</div>`;
  }

  // 元数据
  let metaHTML = '';
  if (volumeMeta) {
    if (volumeMeta.time_range) {
      metaHTML += `<div class="meta-time">${escapeHTML(volumeMeta.time_range)}</div>`;
    }
    if (volumeMeta.introduction && showAnnotation) {
      metaHTML += `<div class="meta-intro">${hl(volumeMeta.introduction.replace(/^[〈《]|[》〉]$/g, ''))}</div>`;
    }
  }

  const volumeTitle = volumeMeta?.volume_name || `第${volumeData.volume_number}卷`;

  return `<!DOCTYPE html>
<html lang="zh">
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
    font-family: 'Noto Serif CJK SC','PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', , serif;
    -webkit-text-size-adjust: none;
    -webkit-user-select: text;
    user-select: text;
  }

  .container {
    padding: 16px 20px 80px;
  }

  .volume-title {
    font-size: ${fontSize * 1.3}px;
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.15em;
    margin-bottom: 8px;
    color: ${textColor};
  }

  .meta-time {
    text-align: center;
    font-size: ${Math.round(fontSize * 0.78)}px;
    color: ${textMuted};
    margin-bottom: 12px;
  }
  .meta-intro {
    font-size: ${Math.round(fontSize * 0.82)}px;
    color: ${annotationColor};
    margin-bottom: 20px;
    padding: 12px 16px;
    line-height: 1.8;
    border-left: 3px solid ${accentColor};
    background: ${accentColor}08;
    border-radius: 6px;
  }

  .year-section {
    margin-bottom: 24px;
  }

  .emperor-note-wrapper {
    background: ${accentColor}0d;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
  }
  .emperor-note-inline {
    font-size: ${Math.round(fontSize * 0.75)}px;
    color: ${annotationColor};
    line-height: 1.8;
  }

  .year-header {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 4px;
    padding: 8px 12px;
    margin-bottom: 12px;
    border-radius: 8px;
    background: ${accentColor}0d;
    overflow: hidden;
  }
  .year-title {
    font-size: ${fontSize * 1.05}px;
    font-weight: 600;
    color: ${textColor};
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .year-ganzhi {
    font-size: ${Math.round(fontSize * 0.78)}px;
    color: ${textMuted};
    white-space: nowrap;
  }
  .year-bc {
    font-size: ${Math.round(fontSize * 0.72)}px;
    color: ${textMuted};
    margin-left: 12px;
  }

  .emperor-note {
    font-size: ${Math.round(fontSize * 0.82)}px;
    color: ${annotationColor};
    margin: 0 16px 12px;
    padding: 10px 14px;
    line-height: 1.8;
    border-left: 3px solid ${accentColor}60;
    background: ${accentColor}06;
    border-radius: 0 6px 6px 0;
  }

  .paragraph {
    margin-bottom: 20px;
  }
  .paragraph-hl {
    background: rgba(251, 191, 36, 0.1);
    border-radius: 6px;
    padding: 2px 4px;
  }

  .original-text {
    font-size: ${fontSize}px;
    line-height: 1.9;
    text-align: justify;
    text-indent: 2em;
    letter-spacing: 0.06em;
    word-break: break-all;
  }

  .note {
    color: ${annotationColor};
    font-size: ${Math.round(fontSize * 0.88)}px;
  }

  .translation-text {
    font-size: ${isTranslationOnly ? fontSize : Math.round(fontSize * 0.88)}px;
    line-height: ${isTranslationOnly ? 1.9 : 1.7};
    color: ${translationColor};
    text-align: justify;
    text-indent: 2em;
    margin-top: 8px;
    padding-left: 12px;
    border-left: 2px solid ${annotationColor}40;
    opacity: ${isTranslationOnly ? 1 : 0.9};
  }
  .translation-text.empty {
    color: ${textMuted};
    text-indent: 0;
    opacity: 0.5;
  }

  .hl {
    background-color: rgba(251, 191, 36, 0.35);
    border-radius: 2px;
    padding: 0 1px;
  }

  ::selection {
    background-color: rgba(59, 130, 246, 0.3);
  }

  ::-webkit-scrollbar {
    display: none;
  }
</style>
</head>
<body>
<div class="container">
  <div class="volume-title">${escapeHTML(volumeTitle)}</div>
  ${metaHTML}
  ${yearsHTML}
</div>
<script>
  // === 滚动追踪 - 检测当前可见段落 ===
  var lastTrackedParagraphId = 0;
  var lastTrackTime = 0;

  function trackVisibleParagraph() {
    var now = Date.now();
    if (now - lastTrackTime < 300) return; // 300ms 节流
    lastTrackTime = now;

    var paragraphs = document.querySelectorAll('.paragraph[data-paragraph-id]');
    if (paragraphs.length === 0) return;

    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var viewCenter = scrollTop + window.innerHeight / 2;
    var foundId = 0;
    var foundIndex = -1;

    for (var i = 0; i < paragraphs.length; i++) {
      var rect = paragraphs[i].getBoundingClientRect();
      var top = rect.top + scrollTop;
      var bottom = top + rect.height;
      if (viewCenter >= top && viewCenter < bottom) {
        foundId = parseInt(paragraphs[i].getAttribute('data-paragraph-id'));
        foundIndex = i;
        break;
      }
      if (viewCenter >= bottom) {
        foundId = parseInt(paragraphs[i].getAttribute('data-paragraph-id'));
        foundIndex = i;
      }
    }

    if (foundId > 0 && foundId !== lastTrackedParagraphId) {
      lastTrackedParagraphId = foundId;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'visibleParagraph', paragraphId: foundId, visibleIndex: foundIndex, totalLoaded: paragraphs.length }));
      }
    }
  }

  // === 滚动事件 ===
  var lastLoadMoreTime = 0;
  window.addEventListener('scroll', function() {
    trackVisibleParagraph();

    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    var scrollHeight = document.documentElement.scrollHeight;
    var clientHeight = document.documentElement.clientHeight;
    var remaining = scrollHeight - scrollTop - clientHeight;

    if (remaining < 800) {
      var now = Date.now();
      if (now - lastLoadMoreTime > 2000) {
        lastLoadMoreTime = now;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loadMore' }));
        }
      }
    }
  });

  // === 点击事件 ===
  document.addEventListener('click', function() {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap' }));
    }
  });

  // === 双击标题回到顶部 ===
  var lastTap = 0;
  document.querySelector('.volume-title')?.addEventListener('click', function(e) {
    e.stopPropagation();
    var now = Date.now();
    if (now - lastTap < 300) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      lastTap = 0;
    } else {
      lastTap = now;
    }
  });

  // === RN 可调用的滚动方法 ===
  window.__scrollToYear = function(yearIndex) {
    var el = document.getElementById('year-section-' + yearIndex);
    if (el) {
      requestAnimationFrame(function() {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  window.__scrollToParagraph = function(paragraphId) {
    var el = document.getElementById('paragraph-' + paragraphId);
    if (el) {
      requestAnimationFrame(function() {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scrollToResult', targetId: paragraphId, success: true }));
      }
    } else {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scrollToResult', targetId: paragraphId, success: false }));
      }
    }
  };

  window.__scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 初始化
  window.addEventListener('load', function() {
    setTimeout(trackVisibleParagraph, 200);
    setTimeout(trackVisibleParagraph, 1000);
  });

</script>
</body>
</html>`;
}

export function HorizontalReader(props: HorizontalReaderProps) {
  const { readerWebViewRef, ...rest } = props;
  const internalRef = useRef<WebView>(null);

  const setRef = useCallback((ref: WebView | null) => {
    internalRef.current = ref;
    if (readerWebViewRef) {
      readerWebViewRef.current = ref;
    }
  }, [readerWebViewRef]);

  const html = useMemo(() => generateHTML(rest), [
    rest.volumeData, rest.volumeMeta, rest.viewMode, rest.scriptMode,
    rest.fontSize, rest.textColor, rest.bgColor, rest.annotationColor,
    rest.translationColor, rest.accentColor, rest.textMuted,
    rest.highlightKeyword, rest.highlightedParagraphId,
  ]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'tap': rest.onTap?.(); break;
        case 'loadMore': rest.onLoadMore?.(); break;
        case 'visibleParagraph':
          rest.onVisibleParagraphChange?.(data.paragraphId, data.visibleIndex, data.totalLoaded);
          break;
        case 'scrollToResult':
          rest.onScrollToResult?.(data.targetId, data.success);
          break;
      }
    } catch (e) {}
  }, [rest.onTap, rest.onLoadMore, rest.onVisibleParagraphChange, rest.onScrollToResult]);

  return (
    <WebView
      ref={setRef}
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
      androidLayerType="hardware"
      allowsInlineMediaPlayback={true}
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
});

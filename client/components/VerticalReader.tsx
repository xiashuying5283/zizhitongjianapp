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

interface VerticalReaderProps {
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
    .replace(/\u201C/g, '\u300C')
    .replace(/\u201D/g, '\u300D')
    .replace(/\u2018/g, '\u300E')
    .replace(/\u2019/g, '\u300F')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightKeyword(text: string, keyword?: string): string {
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

function generateHTML(props: VerticalReaderProps): string {
  const {
    volumeData,
    volumeMeta,
    viewMode,
    scriptMode,
    fontSize,
    textColor,
    bgColor,
    annotationColor,
    translationColor,
    accentColor,
    textMuted,
    highlightKeyword: kw,
    highlightedParagraphId,
  } = props;

  const showNotes = viewMode === 'original+annotation' || viewMode === 'original+annotation+translation';
  const showTrans = viewMode === 'original+translation' || viewMode === 'original+annotation+translation' || viewMode === 'translation';
  const isTranslationOnly = viewMode === 'translation';
  const showAnnotation = viewMode.includes('annotation');

  const hl = (text: string) => highlightKeyword(text, kw);

  const rubyFontSize = Math.round(fontSize * 0.45);

  const numberToChinese = (n: number): string => {
    const digits = '〇一二三四五六七八九';
    return String(n).split('').map(d => digits[parseInt(d)]).join('');
  };

  const formatBcYear = (bcYear: number | null) => {
    if (bcYear === null || bcYear === undefined) return '';
    if (bcYear < 0) return `公元前${numberToChinese(Math.abs(bcYear))}年`;
    if (bcYear > 0) return `公元${numberToChinese(bcYear)}年`;
    return '';
  };

  const getDisplayContent = (paragraph: Paragraph): string => {
    if (scriptMode === 'traditional') {
      if (showAnnotation && paragraph.with_notes_traditional) {
        return paragraph.with_notes_traditional;
      }
      return paragraph.content_traditional || paragraph.content;
    } else {
      if (showAnnotation && paragraph.with_notes) {
        return paragraph.with_notes;
      }
      return paragraph.content;
    }
  };

  const getDisplayTranslation = (paragraph: Paragraph): string | null => {
    if (scriptMode === 'traditional' && paragraph.translation_traditional) {
      return paragraph.translation_traditional;
    }
    return paragraph.translation;
  };

  let yearsHTML = '';
  for (let yi = 0; yi < volumeData.years.length; yi++) {
    const year = volumeData.years[yi];
    yearsHTML += `<div class="year-section" id="year-section-${yi}" data-year-index="${yi}">`;

    // 右列：帝王名 + 注解（有注解才显示）
    if (year.emperor_note) {
      yearsHTML += `<div class="year-emperor-col">`;
      yearsHTML += `<span class="year-emperor">${escapeHTML(year.emperor)}</span>`;
      yearsHTML += `<span class="emperor-note">${hl(year.emperor_note)}</span>`;
      yearsHTML += `</div>`;
    }

    // 左列：年号 + 干支 + 公元 + 分隔线
    yearsHTML += `<div class="year-info-col">`;
    yearsHTML += `<span class="year-title">${escapeHTML(year.year_mark)}</span>`;
    var subInfo = '';
    if (year.gan_zhi) subInfo += escapeHTML(year.gan_zhi);
    const bcStr = formatBcYear(year.bc_year);
    if (bcStr) subInfo += (subInfo ? '、' : '') + bcStr;
    if (subInfo) {
      yearsHTML += `<span class="year-sub">（${subInfo}）</span>`;
    }
    yearsHTML += `<span class="year-sep"></span>`;
    yearsHTML += `</div>`;

    for (const paragraph of year.paragraphs) {
      const isHighlighted = highlightedParagraphId === paragraph.id;
      const highlightClass = isHighlighted ? ' paragraph-highlighted' : '';

      if (isTranslationOnly) {
        const trans = getDisplayTranslation(paragraph);
        if (trans) {
          yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="translation-vertical">\u3000\u3000${hl(trans)}</div></div>`;
        } else {
          yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="translation-vertical empty">（暫無譯文）</div></div>`;
        }
      } else if (showNotes) {
        const content = getDisplayContent(paragraph);
        const parts = parseContent(content);
        let textChars = '';
        for (const part of parts) {
          if (part.type === 'text') {
            textChars += hl(part.content);
          } else {
            textChars += `<span class="note">${hl(part.content)}</span>`;
          }
        }
        yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="vertical-text">\u3000\u3000${textChars}</div>`;

        if (showTrans) {
          const trans = getDisplayTranslation(paragraph);
          if (trans) {
            yearsHTML += `<div class="translation-sep"></div>`;
            yearsHTML += `<div class="translation-horizontal">\u3000\u3000${hl(trans)}</div>`;
          }
        }
        yearsHTML += `</div>`;
      } else {
        const content = getDisplayContent(paragraph);
        yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}"><div class="vertical-text">\u3000\u3000${hl(content)}</div>`;

        if (showTrans) {
          const trans = getDisplayTranslation(paragraph);
          if (trans) {
            yearsHTML += `<div class="translation-sep"></div>`;
            yearsHTML += `<div class="translation-horizontal">\u3000\u3000${hl(trans)}</div>`;
          }
        }
        yearsHTML += `</div>`;
      }
    }

    yearsHTML += `</div>`;
  }

  let metaTimeHTML = '';
  let metaHTML = '';
  if (volumeMeta) {
    if (volumeMeta.time_range) {
      metaTimeHTML = `<div class="meta-time">${escapeHTML(volumeMeta.time_range)}</div>`;
    }
    if (volumeMeta.introduction && showAnnotation) {
      metaHTML += `<div class="meta-intro">${hl(volumeMeta.introduction.replace(/^[〈《]|[》〉]$/g, ''))}</div>`;
    }
  }

  const volumeTitle = volumeMeta?.volume_name || `第${volumeData.volume_number}卷`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
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
    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Serif CJK SC', serif;
    -webkit-text-size-adjust: none;
    -webkit-user-select: text;
    user-select: text;
    overflow-x: auto;
    overflow-y: hidden;
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }

  .container {
    writing-mode: vertical-rl;
    min-height: 100vh;
    padding: 16px 12px;
    line-height: 2.2;
    letter-spacing: 0.12em;
  }

  .title-group {
    writing-mode: vertical-rl;
    margin-bottom: 20px;
  }
  .volume-title {
    display: inline-block;
    writing-mode: vertical-rl;
    font-size: ${fontSize * 1.2}px;
    font-weight: 600;
    letter-spacing: 0.2em;
    border-right: 2px solid ${accentColor};
    color: ${textColor};
    padding-right: 8px;
    margin-right: 4px;
  }

  .meta-time {
    display: inline-block;
    writing-mode: vertical-rl;
    font-size: ${Math.round(fontSize * 0.75)}px;
    color: ${textMuted};
    letter-spacing: 0.1em;
  }
  .meta-intro {
    writing-mode: vertical-rl;
    font-size: ${Math.round(fontSize * 0.8)}px;
    color: ${annotationColor};
    margin-bottom: 20px;
    padding: 0;
    line-height: 2;
    letter-spacing: 0.08em;
  }

  .year-section {
    writing-mode: vertical-rl;
    margin-left: 24px;
  }

  .year-emperor-col {
    writing-mode: vertical-rl;
    display: inline-block;
    border-right: 2px solid ${accentColor};
    padding-left: 6px;
    margin-right: 8px;
  }
  .year-emperor {
    font-size: ${fontSize * 1.1}px;
    font-weight: 600;
    color: ${accentColor};
    letter-spacing: 0.18em;
  }

  .year-info-col {
    writing-mode: vertical-rl;
    display: inline-block;
  }
  .year-title {
    writing-mode: vertical-rl;
    font-size: ${fontSize}px;
    font-weight: 600;
    color: ${textColor};
    letter-spacing: 0.15em;
  }
  .year-sub {
    writing-mode: vertical-rl;
    display: inline-block;
    font-size: ${Math.round(fontSize * 0.7)}px;
    color: ${textMuted};
    letter-spacing: 0.1em;
    margin-top: 8px;
  }
  .year-sep {
    writing-mode: vertical-rl;
    display: inline-block;
    width: 1px;
    height: 100%;
    background-color: ${textColor}20;
    margin-left: 8px;
  }

  .emperor-note {
    font-size: ${Math.round(fontSize * 0.65)}px;
    color: ${annotationColor};
  }

  .paragraph {
    writing-mode: vertical-rl;
    margin-left: 20px;
    margin-bottom: 20px;
  }
  .paragraph-highlighted {
    background-color: rgba(59, 130, 246, 0.08);
    padding: 4px;
    border-radius: 4px;
  }

  .vertical-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: ${fontSize}px;
    line-height: 2.2;
    letter-spacing: 0.15em;
  }

  .main-char {}

  .note {
    font-size: ${Math.round(fontSize * 0.85)}px;
    color: ${annotationColor};
    letter-spacing: 0.08em;
  }
  }

  .translation-sep {
    writing-mode: vertical-rl;
    width: 1px;
    background: ${textColor}15;
    margin: 4px 8px;
    min-height: 20px;
  }

  .translation-horizontal {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: ${Math.round(fontSize * 0.78)}px;
    line-height: 2.2;
    letter-spacing: 0.15em;
    color: ${translationColor};
    padding: 8px 10px;
    border-right: 2px solid ${annotationColor}33;
    margin: 8px 4px;
    opacity: 0.85;
  }

  .translation-vertical {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: ${fontSize}px;
    line-height: 2.2;
    letter-spacing: 0.15em;
  }
  .translation-vertical.empty {
    color: ${textMuted};
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
  <div class="title-group">
    <div class="volume-title">${escapeHTML(volumeTitle)}</div>
    ${metaTimeHTML}
  </div>
  ${metaHTML}
  ${yearsHTML}
</div>
<script>
  // === 滚动追踪 - 检测当前可见段落（竖排模式下用水平滚动位置） ===
  var lastTrackedParagraphId = 0;
  var lastTrackTime = 0;

  function trackVisibleParagraph() {
    var now = Date.now();
    if (now - lastTrackTime < 300) return;
    lastTrackTime = now;

    var paragraphs = document.querySelectorAll('.paragraph[data-paragraph-id]');
    if (paragraphs.length === 0) return;

    // 竖排模式：视口中心是水平方向的中间位置
    var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    var viewCenter = scrollLeft + window.innerWidth / 2;
    var foundId = 0;
    var foundIndex = -1;

    for (var i = 0; i < paragraphs.length; i++) {
      var rect = paragraphs[i].getBoundingClientRect();
      var left = rect.left + scrollLeft;
      var right = left + rect.width;
      if (viewCenter >= left && viewCenter < right) {
        foundId = parseInt(paragraphs[i].getAttribute('data-paragraph-id'));
        foundIndex = i;
        break;
      }
      if (viewCenter >= right) {
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

    var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    var scrollWidth = document.documentElement.scrollWidth;
    var clientWidth = document.documentElement.clientWidth;
    var absScrollLeft = Math.abs(scrollLeft);
    var remaining = scrollWidth - absScrollLeft - clientWidth;

    if (remaining < 500) {
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
      window.scrollTo(0, 0);
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
        var container = document.documentElement;
        var scrollLeft = el.offsetLeft - window.innerWidth / 2 + el.offsetWidth / 2;
        window.scrollTo({ left: scrollLeft, behavior: 'smooth' });
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
    window.scrollTo(0, 0);
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

export function VerticalReader(props: VerticalReaderProps) {
  const { readerWebViewRef, ...rest } = props;
  const internalRef = useRef<WebView>(null);

  const setRef = useCallback((ref: WebView | null) => {
    internalRef.current = ref;
    if (readerWebViewRef) {
      readerWebViewRef.current = ref;
    }
  }, [readerWebViewRef]);

  const html = useMemo(() => generateHTML(rest), [
    rest.volumeData,
    rest.volumeMeta,
    rest.viewMode,
    rest.scriptMode,
    rest.fontSize,
    rest.textColor,
    rest.bgColor,
    rest.annotationColor,
    rest.translationColor,
    rest.accentColor,
    rest.textMuted,
    rest.highlightKeyword,
    rest.highlightedParagraphId,
  ]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'tap':
          rest.onTap?.();
          break;
        case 'loadMore':
          rest.onLoadMore?.();
          break;
        case 'visibleParagraph':
          rest.onVisibleParagraphChange?.(data.paragraphId, data.visibleIndex, data.totalLoaded);
          break;
        case 'scrollToResult':
          rest.onScrollToResult?.(data.targetId, data.success);
          break;
      }
    } catch (e) {
      // ignore
    }
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

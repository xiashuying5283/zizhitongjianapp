import React, { useMemo, useRef, useCallback } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { StyleSheet } from 'react-native';
import { FontFamily } from '@/contexts/SettingsContext';
import { NoteMarker } from '@/utils/notes';

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
  emperor_title?: string | null;
  year_mark: string;
  year_display?: string;
  era_name?: string | null;
  era_phase?: string | null;
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
  fontFamily: FontFamily;
  textColor: string;
  bgColor: string;
  annotationColor: string;
  translationColor: string;
  accentColor: string;
  textMuted: string;
  highlightKeyword?: string;
  highlightedParagraphId?: number | null;
  userNotes?: NoteMarker[];
  onTap?: () => void;
  onLoadMore?: () => void;
  onVisibleParagraphChange?: (paragraphId: number, globalIndex: number) => void;
  onScrollToResult?: (targetId: number, success: boolean) => void;
  onTextSelection?: (selection: { paragraphId: number | null; startOffset: number; endOffset: number; selectedText: string } | null) => void;
  onNoteClick?: (note: NoteMarker) => void;
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

// 竖排标点符号处理：将标点包裹在 span 中，使用系统字体确保正确显示
function wrapVerticalPunctuation(text: string, useCustomFont: boolean): string {
  if (!useCustomFont) return text;

  // 竖排专用标点符号（需要用系统字体显示）
  // 包括：引号、书名号、括号、逗号、句号、冒号、分号、感叹号、问号、省略号、破折号等
  const punctuationRegex = /([「」『』【】《》〈〉（）〔〕""''，。、：；！？…—～·])/g;
  return text.replace(punctuationRegex, '<span class="vp">$1</span>');
}

function generateHTML(props: VerticalReaderProps): string {
  const {
    volumeData,
    volumeMeta,
    viewMode,
    scriptMode,
    fontSize,
    fontFamily,
    textColor,
    bgColor,
    annotationColor,
    translationColor,
    accentColor,
    textMuted,
    highlightKeyword: kw,
    highlightedParagraphId,
    userNotes,
  } = props;

  // 根据字体设置选择字体栈
  const fontStack = fontFamily === 'kaiti'
    ? "'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif"
    : fontFamily === 'serif'
    ? "'Songti SC', 'STSong', 'SimSun', 'Noto Serif SC', serif"
    : fontFamily === 'lishu'
    ? "'ZCOOL XiaoWei', 'LiSu', 'STLiti', serif"
    : fontFamily === 'zhengkai'
    ? "'Zhi Mang Xing', 'STKaiti', 'KaiTi', 'KaiTi_GB2312', serif"
    : "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

  // CDN 字体加载
  const fontImport = fontFamily === 'kaiti'
    ? "@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');\n"
    : fontFamily === 'lishu'
    ? "@import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap');\n"
    : fontFamily === 'zhengkai'
    ? "@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap');\n"
    : "";

  // 是否使用自定义字体（非系统默认）
  const useCustomFont = fontFamily !== 'system';

  // 包装标点符号处理函数
  const wrapVP = (text: string) => wrapVerticalPunctuation(text, useCustomFont);

  const hl = (text: string) => wrapVP(highlightKeyword(text, kw));

  const showNotes = viewMode === 'original+annotation' || viewMode === 'original+annotation+translation';
  const showTrans = viewMode === 'original+translation' || viewMode === 'original+annotation+translation' || viewMode === 'translation';
  const isTranslationOnly = viewMode === 'translation';
  const showAnnotation = viewMode.includes('annotation');

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
      yearsHTML += `<span class="year-emperor">${wrapVP(escapeHTML(year.emperor))}</span>`;
      yearsHTML += `<span class="emperor-note">${hl(year.emperor_note)}</span>`;
      yearsHTML += `</div>`;
    }

    // 左列：年号 + 干支 + 公元 + 分隔线
    yearsHTML += `<div class="year-info-col">`;
    yearsHTML += `<span class="year-title">${wrapVP(escapeHTML(year.year_mark))}</span>`;
    var subInfo = '';
    if (year.gan_zhi) subInfo += wrapVP(escapeHTML(year.gan_zhi));
    const bcStr = formatBcYear(year.bc_year);
    if (bcStr) subInfo += (subInfo ? '、' : '') + bcStr;
    if (subInfo) {
      yearsHTML += `<span class="year-sub">${wrapVP('（' + subInfo + '）')}</span>`;
    }
    yearsHTML += `<span class="year-sep"></span>`;
    yearsHTML += `</div>`;

    for (const paragraph of year.paragraphs) {
      const isHighlighted = highlightedParagraphId === paragraph.id;
      const highlightClass = isHighlighted ? ' paragraph-highlighted' : '';
      const globalIndex = paragraph.global_index ?? 0;

      if (isTranslationOnly) {
        const trans = getDisplayTranslation(paragraph);
        if (trans) {
          yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="translation-vertical">\u3000\u3000${hl(trans)}</div></div>`;
        } else {
          yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="translation-vertical empty">（暫無譯文）</div></div>`;
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
        yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="vertical-text">\u3000\u3000${textChars}</div>`;

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
        yearsHTML += `<div class="paragraph${highlightClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="vertical-text">\u3000\u3000${hl(content)}</div>`;

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
      metaTimeHTML = `<div class="meta-time">${wrapVP(escapeHTML(volumeMeta.time_range))}</div>`;
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
  ${fontImport}
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
    font-family: ${fontStack};
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
    font-size: ${fontSize * 1.3}px;
    font-weight: 700;
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
    scroll-margin-left: 0;
    scroll-margin-right: 0;
  }

  .year-emperor-col {
    writing-mode: vertical-rl;
    display: inline-block;
    border-right: 2px solid ${accentColor};
    padding-left: 6px;
    margin-right: 8px;
  }
  .year-emperor {
    font-size: ${fontSize * 1.05}px;
    font-weight: 400;
    color: ${textColor};
    letter-spacing: 0.18em;
  }

  .year-info-col {
    writing-mode: vertical-rl;
    display: inline-block;
  }
  .year-title {
    writing-mode: vertical-rl;
    font-size: ${Math.round(fontSize * 0.9)}px;
    font-weight: 400;
    color: ${textMuted};
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

  /* 竖排标点符号：使用系统字体确保正确显示 */
  .vp {
    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
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

  /* 用户标注样式（竖排模式） */
  .user-note-marker {
    cursor: pointer;
  }
  .user-note-marker.background {
    background-color: var(--marker-color, #FECACA);
    border-radius: 2px;
    padding: 0 1px;
  }
  .user-note-marker.underline {
    border-right: 2px solid var(--marker-color, #FECACA);
  }
  .user-note-marker.wavy {
    border-right: 2px wavy var(--marker-color, #FECACA);
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
    <div class="volume-title">${wrapVP(escapeHTML(volumeTitle))}</div>
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
    var foundGlobalIndex = 0;

    for (var i = 0; i < paragraphs.length; i++) {
      var rect = paragraphs[i].getBoundingClientRect();
      var left = rect.left + scrollLeft;
      var right = left + rect.width;
      if (viewCenter >= left && viewCenter < right) {
        foundId = parseInt(paragraphs[i].getAttribute('data-paragraph-id'));
        foundGlobalIndex = parseInt(paragraphs[i].getAttribute('data-global-index') || '0');
        break;
      }
      if (viewCenter >= right) {
        foundId = parseInt(paragraphs[i].getAttribute('data-paragraph-id'));
        foundGlobalIndex = parseInt(paragraphs[i].getAttribute('data-global-index') || '0');
      }
    }

    if (foundId > 0 && foundId !== lastTrackedParagraphId) {
      lastTrackedParagraphId = foundId;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'visibleParagraph', paragraphId: foundId, globalIndex: foundGlobalIndex }));
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

  // === 文本选择事件 ===
  document.addEventListener('selectionchange', function() {
    var selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      var range = selection.getRangeAt(0);
      var selectedText = selection.toString().trim();

      // 查找所属段落
      var paragraphEl = range.startContainer;
      while (paragraphEl && paragraphEl.nodeType !== 1) {
        paragraphEl = paragraphEl.parentNode;
      }
      while (paragraphEl && !paragraphEl.hasAttribute('data-paragraph-id')) {
        paragraphEl = paragraphEl.parentElement;
      }

      var paragraphId = paragraphEl ? parseInt(paragraphEl.getAttribute('data-paragraph-id')) : null;

      // 计算段落内的偏移量
      var startOffset = 0;
      var endOffset = 0;
      if (paragraphEl && range.startContainer && range.endContainer) {
        var preSelectionRange = document.createRange();
        preSelectionRange.selectNodeContents(paragraphEl);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        startOffset = preSelectionRange.toString().length;
        endOffset = startOffset + selectedText.length;
      }

      // 获取选中文本的位置信息
      var rects = range.getClientRects();
      var menuPosition = { top: 0, left: 0, width: 0 };
      if (rects.length > 0) {
        // 使用最后一个矩形（通常是选择结束位置）
        var lastRect = rects[rects.length - 1];
        menuPosition = {
          top: lastRect.bottom + window.scrollY,
          left: lastRect.left + lastRect.width / 2,
          width: lastRect.width
        };
      }

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'textSelection',
          paragraphId: paragraphId,
          startOffset: startOffset,
          endOffset: endOffset,
          selectedText: selectedText,
          menuPosition: menuPosition
        }));
      }
    } else {
      // 选择被清除
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'textSelectionCleared' }));
      }
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
        // 竖排模式：水平滚动，使用 scrollIntoView 并指定 inline: 'start'
        el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      });
    }
  };

  window.__scrollToParagraph = function(paragraphId) {
    var el = document.getElementById('paragraph-' + paragraphId);
    if (el) {
      requestAnimationFrame(function() {
        // 竖排模式：水平居中显示
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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
    // 竖排模式：滚动到页面开头
    window.scrollTo({ left: 0, behavior: 'smooth' });
  };

  // 初始化
  window.addEventListener('load', function() {
    setTimeout(trackVisibleParagraph, 200);
    setTimeout(trackVisibleParagraph, 1000);
  });

  // === 用户标注渲染 ===
  var userNotesData = ${userNotes ? JSON.stringify(userNotes) : '[]'};

  function applyUserNotes() {
    if (!userNotesData || userNotesData.length === 0) return;

    userNotesData.forEach(function(note) {
      var paragraphEl = document.querySelector('[data-paragraph-id="' + note.paragraphId + '"]');
      if (!paragraphEl) return;

      var textContainer = paragraphEl.querySelector('.vertical-text') || paragraphEl.querySelector('.translation-vertical');
      if (!textContainer) return;

      var textContent = textContainer.textContent || '';
      if (note.startOffset >= textContent.length || note.endOffset > textContent.length) return;

      var actualText = textContent.substring(note.startOffset, note.endOffset);
      if (actualText !== note.highlightedText) {
        var idx = textContent.indexOf(note.highlightedText);
        if (idx >= 0) {
          note.startOffset = idx;
          note.endOffset = idx + note.highlightedText.length;
        } else {
          return;
        }
      }

      wrapTextRange(textContainer, note.startOffset, note.endOffset, note.id, note.markType, note.color);
    });
  }

  function wrapTextRange(container, startOffset, endOffset, noteId, markType, color) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    var currentOffset = 0;
    var startNode = null, endNode = null;
    var startNodeOffset = 0, endNodeOffset = 0;

    while (walker.nextNode()) {
      var node = walker.currentNode;
      var nodeLength = node.textContent.length;

      if (currentOffset + nodeLength > startOffset && !startNode) {
        startNode = node;
        startNodeOffset = startOffset - currentOffset;
      }

      if (currentOffset + nodeLength >= endOffset) {
        endNode = node;
        endNodeOffset = endOffset - currentOffset;
        break;
      }

      currentOffset += nodeLength;
    }

    if (!startNode || !endNode) return;

    var type = markType || 'background';
    var markerColor = color || '#FECACA';

    if (startNode === endNode) {
      var range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);
      var span = document.createElement('span');
      span.className = 'user-note-marker ' + type;
      span.setAttribute('data-note-id', noteId);
      span.style.setProperty('--marker-color', markerColor);
      range.surroundContents(span);
    } else {
      var range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(startNode, startNode.textContent.length);
      var span = document.createElement('span');
      span.className = 'user-note-marker ' + type;
      span.setAttribute('data-note-id', noteId);
      span.style.setProperty('--marker-color', markerColor);
      span.className = 'user-note-marker';
      span.setAttribute('data-note-id', noteId);
      range.surroundContents(span);
    } else {
      var range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(startNode, startNode.textContent.length);
      var span = document.createElement('span');
      span.className = 'user-note-marker';
      span.setAttribute('data-note-id', noteId);
      range.surroundContents(span);
    }
  }
  
  document.addEventListener('click', function(e) {
    var target = e.target;
    if (target.classList && target.classList.contains('user-note-marker')) {
      e.stopPropagation();
      var noteId = parseInt(target.getAttribute('data-note-id'));
      var note = userNotesData.find(function(n) { return n.id === noteId; });
      if (note && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'noteClick',
          note: note
        }));
      }
    }
  });
  
  setTimeout(applyUserNotes, 100);

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
    rest.fontFamily,
    rest.textColor,
    rest.bgColor,
    rest.annotationColor,
    rest.translationColor,
    rest.accentColor,
    rest.textMuted,
    rest.highlightKeyword,
    rest.highlightedParagraphId,
    rest.userNotes,
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
          rest.onVisibleParagraphChange?.(data.paragraphId, data.globalIndex);
          break;
        case 'scrollToResult':
          rest.onScrollToResult?.(data.targetId, data.success);
          break;
        case 'textSelection':
          rest.onTextSelection?.({
            paragraphId: data.paragraphId,
            startOffset: data.startOffset,
            endOffset: data.endOffset,
            selectedText: data.selectedText,
          });
          break;
        case 'textSelectionCleared':
          rest.onTextSelection?.(null);
          break;
        case 'noteClick':
          rest.onNoteClick?.(data.note);
          break;
      }
    } catch (e) {
      // ignore
    }
  }, [rest.onTap, rest.onLoadMore, rest.onVisibleParagraphChange, rest.onScrollToResult, rest.onTextSelection, rest.onNoteClick]);

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

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
  global_index?: number;  // 全局索引，用于计算阅读进度
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

interface HorizontalReaderProps {
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
  onVisibleParagraphChange?: (paragraphId: number, globalIndex: number) => void;
  onScrollToResult?: (targetId: number, success: boolean) => void;
  onTextSelection?: (selection: { paragraphId: number | null; startOffset: number; endOffset: number; selectedText: string } | null) => void;
  onNoteClick?: (note: NoteMarker) => void;
  readerWebViewRef?: React.MutableRefObject<WebView | null>;
  initialScrollParagraphId?: number;
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
    volumeData, volumeMeta, viewMode, scriptMode, fontSize, fontFamily,
    textColor, bgColor, annotationColor, translationColor,
    accentColor, textMuted,
    highlightKeyword: kw, highlightedParagraphId, userNotes,
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
    // 构建年份区块的容器 div
    yearsHTML += `<div class="year-section" id="year-section-${yi}" data-year-index="${yi}">`;

    // 帝王信息卡片
    if (year.emperor_title) {
      yearsHTML += `<div class="emperor-note">`;
      yearsHTML += `<div class="emperor-title-inline">${hl(year.emperor_title)}</div>`;
      if (showAnnotation && year.era_phase) {
        yearsHTML += `<div>${hl(year.era_phase)}</div>`;
      }
      yearsHTML += `</div>`;
    }

    // 年号卡片
    yearsHTML += `<div class="year-card">`;
    yearsHTML += `<div class="year-header">`;
    yearsHTML += `<span class="year-title">${escapeHTML(year.year_display || year.year_mark)}</span>`;
    const bcStr = formatBcYear(year.bc_year);
    const parenContent = [year.gan_zhi, bcStr].filter(Boolean).join('、');
    if (parenContent) {
      yearsHTML += ` <span class="year-ganzhi">（${escapeHTML(parenContent)}）</span>`;
    }
    yearsHTML += `</div>`;

    // 年号注解（有则显示，且需要开启注解模式）
    if (showAnnotation && year.emperor_note) {
      yearsHTML += `<div class="emperor-note-wrapper"><span class="emperor-note-inline">${hl(year.emperor_note)}</span></div>`;
    }
    yearsHTML += `</div>`;
    // 段落
    for (const paragraph of year.paragraphs) {
      const isHighlighted = highlightedParagraphId === paragraph.id;
      const hlClass = isHighlighted ? ' paragraph-hl' : '';

      const globalIndex = paragraph.global_index ?? 0;
      if (isTranslationOnly) {
        const trans = getDisplayTranslation(paragraph);
        if (trans) {
          yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="translation-text">${hl(trans)}</div></div>`;
        } else {
          yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="translation-text empty">（暂无译文）</div></div>`;
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
        yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="original-text">${chars}</div>`;

        if (showTrans) {
          const trans = getDisplayTranslation(paragraph);
          if (trans) {
            yearsHTML += `<div class="translation-text">${hl(trans)}</div>`;
          }
        }
        yearsHTML += `</div>`;
      } else {
        const content = getDisplayContent(paragraph);
        yearsHTML += `<div class="paragraph${hlClass}" id="paragraph-${paragraph.id}" data-paragraph-id="${paragraph.id}" data-global-index="${globalIndex}"><div class="original-text">${hl(content)}</div>`;

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

  return /* html */ `<!DOCTYPE html>
<html lang="zh">
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
    padding: 8px 12px;
  }
  .emperor-note-inline {
    font-size: ${Math.round(fontSize * 0.75)}px;
    color: ${annotationColor};
    line-height: 1.8;
  }

  .emperor-note {
    font-size: ${Math.round(fontSize * 0.82)}px;
    color: ${annotationColor};
    margin: 0 0 12px;
    padding: 10px 14px;
    line-height: 1.8;
    background: ${accentColor}0d;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .emperor-title-inline {
    font-size: ${fontSize * 1.1}px;
    font-weight: 700;
    color: ${textColor};
    letter-spacing: 0.1em;
  }
  .emperor-note .emperor-title-inline:not(:last-child) {
    margin-bottom: 6px;
  }

  .year-card {
    margin-bottom: 12px;
    background: ${accentColor}0d;
    border-radius: 8px;
  }

  .year-header {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 4px;
    padding: 8px 12px;
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
    margin: 0 0 12px;
    padding: 10px 14px;
    line-height: 1.8;
    background: ${accentColor}0d;
    border-radius: 8px;
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

  /* 用户标注样式 */
  .user-note-marker {
    cursor: pointer;
  }
  .user-note-marker.background {
    background-color: var(--marker-color, #FECACA);
    border-radius: 2px;
    padding: 0 1px;
  }
  .user-note-marker.underline {
    text-decoration: underline var(--marker-color, #FECACA) 2px;
    text-underline-offset: 3px;
  }
  .user-note-marker.wavy {
    text-decoration: underline wavy var(--marker-color, #FECACA);
    text-underline-offset: 3px;
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
    var foundGlobalIndex = 0;

    for (var i = 0; i < paragraphs.length; i++) {
      var rect = paragraphs[i].getBoundingClientRect();
      var top = rect.top + scrollTop;
      var bottom = top + rect.height;
      if (viewCenter >= top && viewCenter < bottom) {
        foundId = parseInt(paragraphs[i].getAttribute('data-paragraph-id'));
        foundGlobalIndex = parseInt(paragraphs[i].getAttribute('data-global-index') || '0');
        break;
      }
      if (viewCenter >= bottom) {
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
  window.addEventListener('scroll', function() {
    trackVisibleParagraph();
    // 数据一次性加载，不需要 loadMore
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
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      var range = selection.getRangeAt(0);

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
      var selectedText = '';
      if (paragraphEl && range.startContainer && range.endContainer) {
        try {
          var preSelectionRange = document.createRange();
          preSelectionRange.selectNodeContents(paragraphEl);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          startOffset = preSelectionRange.toString().length;

          var endSelectionRange = document.createRange();
          endSelectionRange.selectNodeContents(paragraphEl);
          endSelectionRange.setEnd(range.endContainer, range.endOffset);
          endOffset = endSelectionRange.toString().length;
          
          if (startOffset > endOffset) {
            var temp = startOffset;
            startOffset = endOffset;
            endOffset = temp;
          }
          
          selectedText = paragraphEl.textContent.substring(startOffset, endOffset).trim();
        } catch (e) {
          selectedText = selection.toString().trim();
          endOffset = startOffset + selectedText.length;
        }
      } else {
        selectedText = selection.toString().trim();
      }

      if (selectedText.length === 0) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'textSelectionCleared' }));
        }
        return;
      }

      // 获取选中文本的位置信息
      var rects = range.getClientRects();
      var menuPosition = { top: 0, left: 0, width: 0 };
      if (rects.length > 0) {
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
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }
  };

  window.__scrollToParagraph = function(paragraphId) {
    var el = document.getElementById('paragraph-' + paragraphId);
    if (el) {
      requestAnimationFrame(function() {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
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
  var initParaId = ${props.initialScrollParagraphId || 0};
  window.addEventListener('load', function() {
    if (initParaId > 0) {
      setTimeout(function() {
        if (window.__scrollToParagraph) {
          window.__scrollToParagraph(initParaId);
        }
      }, 150);
    }
    setTimeout(trackVisibleParagraph, 200);
    setTimeout(trackVisibleParagraph, 1000);
  });

  // === 用户标注渲染 ===
  var userNotesData = ${userNotes ? JSON.stringify(userNotes) : '[]'};

  function applyUserNotes() {
    if (!userNotesData || userNotesData.length === 0) return;

    function normalizeQuotes(s) {
      if (!s) return '';
      return s.replace(/[\u201C\u300C]/g, '"')
              .replace(/[\u201D\u300D]/g, '"')
              .replace(/[\u2018\u300E]/g, "'")
              .replace(/[\u2019\u300F]/g, "'");
    }

    userNotesData.forEach(function(note) {
      var paragraphEl = document.querySelector('[data-paragraph-id="' + note.paragraphId + '"]');
      if (!paragraphEl) return;

      var textContainer = paragraphEl;
      var textContent = textContainer.textContent || '';
      
      if (note.startOffset >= textContent.length || note.endOffset > textContent.length) return;

      var actualText = textContent.substring(note.startOffset, note.endOffset);
      
      if (normalizeQuotes(actualText) !== normalizeQuotes(note.highlightedText)) {
        var normalizedContent = normalizeQuotes(textContent);
        var normalizedNote = normalizeQuotes(note.highlightedText);
        var idx = normalizedContent.indexOf(normalizedNote);
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
    var nodesToWrap = [];

    while (walker.nextNode()) {
      var node = walker.currentNode;
      var nodeLength = node.textContent.length;
      
      var nodeStart = currentOffset;
      var nodeEnd = currentOffset + nodeLength;

      if (nodeEnd > startOffset && nodeStart < endOffset) {
        var overlapStart = Math.max(0, startOffset - nodeStart);
        var overlapEnd = Math.min(nodeLength, endOffset - nodeStart);
        nodesToWrap.push({
          node: node,
          startOffset: overlapStart,
          endOffset: overlapEnd
        });
      }

      currentOffset += nodeLength;
      if (currentOffset >= endOffset) break;
    }

    var type = markType || 'background';
    var markerColor = color || '#FECACA';

    for (var i = nodesToWrap.length - 1; i >= 0; i--) {
      var item = nodesToWrap[i];
      try {
        var textNode = item.node;
        var start = item.startOffset;
        var end = item.endOffset;
        if (start === end) continue;

        var middleNode = textNode.splitText(start);
        middleNode.splitText(end - start);

        var span = document.createElement('span');
        span.className = 'user-note-marker ' + type;
        span.setAttribute('data-note-id', noteId);
        span.style.setProperty('--marker-color', markerColor);

        middleNode.parentNode.insertBefore(span, middleNode);
        span.appendChild(middleNode);
      } catch (e) {
        // ignore
      }
    }
  }
  
  // 点击标注下划线
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
  
  // 延迟应用标注（等待 DOM 完全渲染）
  setTimeout(applyUserNotes, 100);

</script>
</body>
</html>`;
}

export const HorizontalReader = React.memo(function HorizontalReader(props: HorizontalReaderProps) {
  const {
    readerWebViewRef,
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
    highlightKeyword,
    highlightedParagraphId,
    userNotes,
    onTap,
    onVisibleParagraphChange,
    onScrollToResult,
    onTextSelection,
    onNoteClick
  } = props;

  const internalRef = useRef<WebView>(null);

  const setRef = useCallback((ref: WebView | null) => {
    internalRef.current = ref;
    if (readerWebViewRef) {
      readerWebViewRef.current = ref;
    }
  }, [readerWebViewRef]);

  const html = useMemo(() => generateHTML(props), [
    volumeData, volumeMeta, viewMode, scriptMode,
    fontSize, fontFamily, textColor, bgColor, annotationColor,
    translationColor, accentColor, textMuted,
    highlightKeyword, highlightedParagraphId, userNotes,
  ]);

  const source = useMemo(() => ({ html }), [html]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'tap': onTap?.(); break;
        case 'visibleParagraph':
          onVisibleParagraphChange?.(data.paragraphId, data.globalIndex);
          break;
        case 'scrollToResult':
          onScrollToResult?.(data.targetId, data.success);
          break;
        case 'textSelection':
          onTextSelection?.({
            paragraphId: data.paragraphId,
            startOffset: data.startOffset,
            endOffset: data.endOffset,
            selectedText: data.selectedText,
          });
          break;
        case 'textSelectionCleared':
          onTextSelection?.(null);
          break;
        case 'noteClick':
          onNoteClick?.(data.note);
          break;
      }
    } catch (e) {}
  }, [onTap, onVisibleParagraphChange, onScrollToResult, onTextSelection, onNoteClick]);

  return (
    <WebView
      ref={setRef}
      originWhitelist={['*']}
      source={source}
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
});

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
});

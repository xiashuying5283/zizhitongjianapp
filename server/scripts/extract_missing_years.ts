/**
 * 从vol_035.html提取元寿元年（公元前2年）和二年（公元前1年）的内容
 * 生成INSERT SQL语句
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenCC 简繁转换
import * as OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

// 读取HTML文件
const htmlPath = path.join(__dirname, '..', 'data', 'html', 'vol_035.html');
const html = fs.readFileSync(htmlPath, 'utf-8');
const $ = cheerio.load(html);

// 提取元素文本，区分正文和注解
function extractElementText(el: cheerio.Cheerio<cheerio.Element>): { mainText: string; fullText: string } {
  let mainText = '';
  let fullParts: string[] = [];

  function walk(node: cheerio.AnyNode) {
    if (node.type === 'text') {
      const text = (node as cheerio.TextNode).data || '';
      mainText += text;
      fullParts.push(text);
    } else if (node.type === 'tag') {
      const tag = node as cheerio.Element;
      const tagName = tag.tagName?.toLowerCase();

      if (tagName === 'span' && tag.attribs?.style?.includes('color:transparent')) {
        return; // 隐形标记，忽略
      }

      if (tagName === 'small' && tag.attribs?.style?.includes('#996666')) {
        // 注解块
        const noteText = $(tag).text().trim();
        if (noteText) {
          fullParts.push(`【${noteText}】`);
        }
        return;
      }

      if (tagName === 'b') {
        mainText += $(tag).text();
        fullParts.push($(tag).text());
        return;
      }

      // 递归处理子节点
      for (const child of tag.children || []) {
        walk(child);
      }
    }
  }

  el.contents().each((_, child) => {
    walk(child);
  });

  return {
    mainText: mainText.replace(/\s+/g, ' ').trim(),
    fullText: fullParts.join('').replace(/\s+/g, ' ').trim(),
  };
}

// 解析事件序号
function parseEventIndex(text: string): number | null {
  const match = text.match(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/);
  if (!match) return null;
  
  const eventMarks = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  return eventMarks.indexOf(match[0]) + 1;
}

// 主解析逻辑
const contentArea = $('.mw-parser-output');

interface Paragraph {
  year_mark: string;
  bc_year: number;
  event_index: number;
  paragraph_index: number;
  content: string;
  with_notes: string;
  is_chenguangyue: boolean;
}

const paragraphs: Paragraph[] = [];
let currentYear = 0; // 0 = 未开始, -2 = 元寿元年, -1 = 二年
let currentYearMark = '';
let currentEventIndex = 0;
let currentParagraphIndex = 0;

contentArea.find('p, dl').each((_, el) => {
  const $el = $(el);
  const tagName = el.tagName?.toLowerCase();

  // 处理臣光曰/班固赞
  if (tagName === 'dl') {
    const dd = $el.find('dd').first();
    const { mainText, fullText } = extractElementText(dd);
    
    if (mainText && currentYear !== 0) {
      const isChenguangyue = mainText.includes('臣光曰') || mainText.includes('臣司马光曰') || mainText.includes('班固赞');
      currentParagraphIndex++;
      paragraphs.push({
        year_mark: currentYearMark,
        bc_year: currentYear,
        event_index: currentEventIndex,
        paragraph_index: currentParagraphIndex,
        content: mainText,
        with_notes: fullText,
        is_chenguangyue: isChenguangyue,
      });
    }
    return;
  }

  // 处理 <p> 元素
  const { mainText, fullText } = extractElementText($el);
  if (!mainText) return;

  // 检测年份标记
  if (mainText.startsWith('元寿元年')) {
    currentYear = -2;
    currentYearMark = '元寿元年';
    currentEventIndex = 0;
    currentParagraphIndex = 0;
    console.log(`检测到: 元寿元年 (公元前2年)`);
    return;
  }

  // 只有当整行是"二年"或以"二年〈"开头时才切换
  if ((mainText === '二年' || mainText.startsWith('二年〈')) && currentYear === -2) {
    currentYear = -1;
    currentYearMark = '二年';
    currentEventIndex = 0;
    currentParagraphIndex = 0;
    console.log(`检测到: 二年 (公元前1年)`);
    return;
  }

  // 检测到孝平皇帝或元始元年，结束
  if (mainText.startsWith('孝平皇帝') || mainText.startsWith('元始元年')) {
    currentYear = 0;
    return;
  }

  // 跳过非目标年份
  if (currentYear === 0) return;

  // 检测事件序号
  const eventIdx = parseEventIndex(mainText);
  if (eventIdx !== null) {
    currentEventIndex = eventIdx;
    currentParagraphIndex = 1;
  } else {
    currentParagraphIndex++;
  }

  paragraphs.push({
    year_mark: currentYearMark,
    bc_year: currentYear,
    event_index: currentEventIndex,
    paragraph_index: currentParagraphIndex,
    content: mainText,
    with_notes: fullText,
    is_chenguangyue: false,
  });
});

// 生成INSERT语句
console.log('\n========================================');
console.log(`共提取 ${paragraphs.length} 个段落`);
console.log(`元寿元年 (公元前2年): ${paragraphs.filter(p => p.bc_year === -2).length} 段`);
console.log(`二年 (公元前1年): ${paragraphs.filter(p => p.bc_year === -1).length} 段`);
console.log('========================================\n');

// 输出INSERT语句
console.log('-- 元寿元年（公元前2年）和二年（公元前1年）的缺失数据');
console.log('-- 卷35 汉纪二十七');
console.log('');

for (const p of paragraphs) {
  const contentEscaped = p.content.replace(/'/g, "''");
  const withNotesEscaped = p.with_notes.replace(/'/g, "''");
  const contentTraditional = converter(p.content).replace(/'/g, "''");
  const withNotesTraditional = converter(p.with_notes).replace(/'/g, "''");

  console.log(`INSERT INTO zizhitongjian_paragraphs (volume_number, year_mark, emperor, bc_year, event_index, paragraph_index, content, with_notes, is_chenguangyue, volume_name, content_traditional, with_notes_traditional) VALUES (35, '${p.year_mark}', '孝哀皇帝', ${p.bc_year}, ${p.event_index}, ${p.paragraph_index}, '${contentEscaped}', '${withNotesEscaped}', ${p.is_chenguangyue}, '汉纪二十七', '${contentTraditional}', '${withNotesTraditional}');`);
}

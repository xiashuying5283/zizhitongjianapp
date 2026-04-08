/**
 * 补充资治通鉴缺失数据
 * 从本地HTML文件解析并补充数据库中缺失的年份段落
 * 
 * 特点：
 * - 不删除已有数据
 * - 只插入缺失的年份段落
 * - 支持指定卷号范围
 * 
 * 用法: npx tsx scripts/supplement_volumes.ts [起始卷号] [结束卷号]
 * 示例: npx tsx scripts/supplement_volumes.ts 21 294
 */

import * as cheerio from 'cheerio';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const START_VOLUME = parseInt(process.argv[2] || '1');
const END_VOLUME = parseInt(process.argv[3] || '294');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HTML_DIR = join(__dirname, '..', 'data', 'html');

// ==================== 朝代配置 ====================
const DYNASTY_CONFIGS = [
  {
    volumeRange: [1, 5], dynasty: '周', eraName: '周纪',
    emperors: {
      '威烈王': { firstYear: -425, fullName: '周威烈王' },
      '安王': { firstYear: -401, fullName: '周安王' },
      '烈王': { firstYear: -375, fullName: '周烈王' },
      '显王': { firstYear: -368, fullName: '周显王' },
      '慎靓王': { firstYear: -320, fullName: '周慎靓王' },
      '赧王': { firstYear: -314, fullName: '周赧王' },
    }
  },
  {
    volumeRange: [6, 8], dynasty: '秦', eraName: '秦纪',
    emperors: {
      '昭襄王': { firstYear: -306, fullName: '秦昭襄王' },
      '孝文王': { firstYear: -250, fullName: '秦孝文王' },
      '庄襄王': { firstYear: -249, fullName: '秦庄襄王' },
      '始皇帝': { firstYear: -246, fullName: '秦始皇' },
      '二世皇帝': { firstYear: -209, fullName: '秦二世' },
    }
  },
  {
    volumeRange: [9, 68], dynasty: '汉', eraName: '汉纪',
    emperors: {
      '太祖高皇帝': { firstYear: -206, fullName: '汉太祖高皇帝' },
      '惠帝': { firstYear: -194, fullName: '孝惠皇帝' },
      '高后': { firstYear: -187, fullName: '高皇后吕雉' },
      '太宗孝文皇帝': { firstYear: -179, fullName: '太宗孝文皇帝' },
      '孝景皇帝': { firstYear: -156, fullName: '孝景皇帝' },
      '世宗孝武皇帝': { firstYear: -140, fullName: '世宗孝武皇帝' },
      '孝昭皇帝': { firstYear: -86, fullName: '孝昭皇帝' },
      '中宗孝宣皇帝': { firstYear: -73, fullName: '中宗孝宣皇帝' },
      '高宗孝元皇帝': { firstYear: -48, fullName: '高宗孝元皇帝' },
      '统宗孝成皇帝': { firstYear: -32, fullName: '统宗孝成皇帝' },
      '孝哀皇帝': { firstYear: -6, fullName: '孝哀皇帝' },
      '元宗孝平皇帝': { firstYear: 1, fullName: '元宗孝平皇帝' },
      '孺子婴': { firstYear: 6, fullName: '孺子婴' },
      '王莽': { firstYear: 9, fullName: '新帝王莽' },
      '淮阳王': { firstYear: 23, fullName: '淮阳王刘玄' },
      '世祖光武皇帝': { firstYear: 25, fullName: '世祖光武皇帝' },
      '显宗孝明皇帝': { firstYear: 58, fullName: '显宗孝明皇帝' },
      '肃宗孝章皇帝': { firstYear: 76, fullName: '肃宗孝章皇帝' },
      '穆宗孝和皇帝': { firstYear: 89, fullName: '穆宗孝和皇帝' },
      '孝殇皇帝': { firstYear: 106, fullName: '孝殇皇帝' },
      '恭宗孝安皇帝': { firstYear: 107, fullName: '恭宗孝安皇帝' },
      '敬宗孝顺皇帝': { firstYear: 126, fullName: '敬宗孝顺皇帝' },
      '孝冲皇帝': { firstYear: 145, fullName: '孝冲皇帝' },
      '孝质皇帝': { firstYear: 146, fullName: '孝质皇帝' },
      '威宗孝桓皇帝': { firstYear: 147, fullName: '威宗孝桓皇帝' },
      '孝灵皇帝': { firstYear: 168, fullName: '孝灵皇帝' },
      '孝献皇帝': { firstYear: 189, fullName: '孝献皇帝' },
    }
  },
  {
    volumeRange: [69, 78], dynasty: '魏', eraName: '魏纪',
    emperors: {
      '世祖文皇帝': { firstYear: 220, fullName: '世祖文皇帝' },
      '烈祖明皇帝': { firstYear: 227, fullName: '烈祖明皇帝' },
      '齐王': { firstYear: 240, fullName: '齐王曹芳' },
      '高贵乡公': { firstYear: 254, fullName: '高贵乡公曹髦' },
      '元皇帝': { firstYear: 260, fullName: '元皇帝曹奂' },
    }
  },
  {
    volumeRange: [79, 118], dynasty: '晋', eraName: '晋纪',
    emperors: {
      '世祖武皇帝': { firstYear: 265, fullName: '世祖武皇帝' },
      '孝惠皇帝': { firstYear: 290, fullName: '孝惠皇帝' },
      '孝怀皇帝': { firstYear: 307, fullName: '孝怀皇帝' },
      '孝愍皇帝': { firstYear: 313, fullName: '孝愍皇帝' },
      '中宗元皇帝': { firstYear: 317, fullName: '中宗元皇帝' },
      '肃宗明皇帝': { firstYear: 323, fullName: '肃宗明皇帝' },
      '显宗成皇帝': { firstYear: 326, fullName: '显宗成皇帝' },
      '康皇帝': { firstYear: 343, fullName: '康皇帝' },
      '孝宗穆皇帝': { firstYear: 345, fullName: '孝宗穆皇帝' },
      '哀皇帝': { firstYear: 362, fullName: '哀皇帝' },
      '废帝': { firstYear: 366, fullName: '废帝司马奕' },
      '太宗简文皇帝': { firstYear: 371, fullName: '太宗简文皇帝' },
      '烈宗孝武皇帝': { firstYear: 373, fullName: '烈宗孝武皇帝' },
      '安皇帝': { firstYear: 397, fullName: '安皇帝' },
      '恭皇帝': { firstYear: 419, fullName: '恭皇帝' },
    }
  },
  {
    volumeRange: [119, 134], dynasty: '宋', eraName: '宋纪',
    emperors: {
      '高祖武皇帝': { firstYear: 420, fullName: '高祖武皇帝' },
      '少帝': { firstYear: 423, fullName: '少帝刘义符' },
      '太祖文皇帝': { firstYear: 424, fullName: '太祖文皇帝' },
      '世祖孝武皇帝': { firstYear: 454, fullName: '世祖孝武皇帝' },
      '前废帝': { firstYear: 465, fullName: '前废帝刘子业' },
      '太宗明皇帝': { firstYear: 465, fullName: '太宗明皇帝' },
      '后废帝': { firstYear: 473, fullName: '后废帝刘昱' },
      '顺皇帝': { firstYear: 477, fullName: '顺皇帝' },
    }
  },
  {
    volumeRange: [135, 144], dynasty: '齐', eraName: '齐纪',
    emperors: {
      '太祖高皇帝': { firstYear: 479, fullName: '太祖高皇帝' },
      '世祖武皇帝': { firstYear: 483, fullName: '世祖武皇帝' },
      '郁林王': { firstYear: 494, fullName: '郁林王萧昭业' },
      '海陵王': { firstYear: 494, fullName: '海陵王萧昭文' },
      '高宗明皇帝': { firstYear: 494, fullName: '高宗明皇帝' },
      '东昏侯': { firstYear: 499, fullName: '东昏侯萧宝卷' },
      '和皇帝': { firstYear: 501, fullName: '和皇帝' },
    }
  },
  {
    volumeRange: [145, 168], dynasty: '梁', eraName: '梁纪',
    emperors: {
      '高祖武皇帝': { firstYear: 502, fullName: '高祖武皇帝' },
      '太宗简文皇帝': { firstYear: 550, fullName: '太宗简文皇帝' },
      '世祖孝元皇帝': { firstYear: 552, fullName: '世祖孝元皇帝' },
      '敬皇帝': { firstYear: 555, fullName: '敬皇帝' },
    }
  },
  {
    volumeRange: [169, 176], dynasty: '陈', eraName: '陈纪',
    emperors: {
      '高祖武皇帝': { firstYear: 557, fullName: '高祖武皇帝' },
      '世祖文皇帝': { firstYear: 560, fullName: '世祖文皇帝' },
      '废帝': { firstYear: 566, fullName: '废帝陈伯宗' },
      '高宗孝宣皇帝': { firstYear: 569, fullName: '高宗孝宣皇帝' },
      '长城公': { firstYear: 583, fullName: '长城公陈叔宝' },
    }
  },
  {
    volumeRange: [177, 184], dynasty: '隋', eraName: '隋纪',
    emperors: {
      '高祖文皇帝': { firstYear: 581, fullName: '高祖文皇帝' },
      '炀皇帝': { firstYear: 605, fullName: '炀皇帝' },
      '恭皇帝': { firstYear: 617, fullName: '恭皇帝' },
    }
  },
  {
    volumeRange: [185, 265], dynasty: '唐', eraName: '唐纪',
    emperors: {
      '高祖神尧大圣光孝皇帝': { firstYear: 618, fullName: '高祖神尧大圣光孝皇帝' },
      '太宗文武大圣大广孝皇帝': { firstYear: 627, fullName: '太宗文武大圣大广孝皇帝' },
      '高宗天皇大圣大弘孝皇帝': { firstYear: 650, fullName: '高宗天皇大圣大弘孝皇帝' },
      '中宗大和圣昭孝皇帝': { firstYear: 684, fullName: '中宗大和圣昭孝皇帝' },
      '睿宗玄真大圣大兴孝皇帝': { firstYear: 684, fullName: '睿宗玄真大圣大兴孝皇帝' },
      '则天顺圣皇后': { firstYear: 690, fullName: '则天顺圣皇后武曌' },
      '中宗（复辟）': { firstYear: 705, fullName: '中宗大和圣昭孝皇帝' },
      '殇皇帝': { firstYear: 710, fullName: '殇皇帝李重茂' },
      '睿宗（复辟）': { firstYear: 710, fullName: '睿宗玄真大圣大兴孝皇帝' },
      '玄宗至道大圣大明孝皇帝': { firstYear: 712, fullName: '玄宗至道大圣大明孝皇帝' },
      '肃宗文明武德大圣大宣孝皇帝': { firstYear: 756, fullName: '肃宗文明武德大圣大宣孝皇帝' },
      '代宗睿文孝武皇帝': { firstYear: 762, fullName: '代宗睿文孝武皇帝' },
      '德宗神武孝文皇帝': { firstYear: 780, fullName: '德宗神武孝文皇帝' },
      '顺宗至德弘道大圣大安孝皇帝': { firstYear: 805, fullName: '顺宗至德弘道大圣大安孝皇帝' },
      '宪宗昭文章武大圣至神孝皇帝': { firstYear: 806, fullName: '宪宗昭文章武大圣至神孝皇帝' },
      '穆宗睿圣文惠孝皇帝': { firstYear: 821, fullName: '穆宗睿圣文惠孝皇帝' },
      '敬宗睿武昭愍孝皇帝': { firstYear: 825, fullName: '敬宗睿武昭愍孝皇帝' },
      '文宗元圣昭献孝皇帝': { firstYear: 826, fullName: '文宗元圣昭献孝皇帝' },
      '武宗至道昭肃孝皇帝': { firstYear: 841, fullName: '武宗至道昭肃孝皇帝' },
      '宣宗元圣至明成武献文睿智章仁神聪懿道大孝皇帝': { firstYear: 847, fullName: '宣宗元圣至明成武献文睿智章仁神聪懿道大孝皇帝' },
      '懿宗昭圣恭惠孝皇帝': { firstYear: 859, fullName: '懿宗昭圣恭惠孝皇帝' },
      '僖宗惠圣恭定孝皇帝': { firstYear: 873, fullName: '僖宗惠圣恭定孝皇帝' },
      '昭宗圣穆景文孝皇帝': { firstYear: 889, fullName: '昭宗圣穆景文孝皇帝' },
      '昭宣光烈孝皇帝': { firstYear: 904, fullName: '昭宣光烈孝皇帝' },
    }
  },
  {
    volumeRange: [266, 269], dynasty: '后梁', eraName: '后梁纪',
    emperors: {
      '太祖神武元圣孝皇帝': { firstYear: 907, fullName: '太祖神武元圣孝皇帝' },
      '均王': { firstYear: 913, fullName: '均王朱友贞' },
    }
  },
  {
    volumeRange: [270, 279], dynasty: '后唐', eraName: '后唐纪',
    emperors: {
      '庄宗光圣神闵孝皇帝': { firstYear: 923, fullName: '庄宗光圣神闵孝皇帝' },
      '明宗圣德和武钦孝皇帝': { firstYear: 926, fullName: '明宗圣德和武钦孝皇帝' },
      '闵帝': { firstYear: 934, fullName: '闵帝李从厚' },
      '末帝': { firstYear: 934, fullName: '末帝李从珂' },
    }
  },
  {
    volumeRange: [280, 285], dynasty: '后晋', eraName: '后晋纪',
    emperors: {
      '高祖圣文章武明德孝皇帝': { firstYear: 936, fullName: '高祖圣文章武明德孝皇帝' },
      '齐王': { firstYear: 943, fullName: '齐王石重贵' },
    }
  },
  {
    volumeRange: [286, 289], dynasty: '后汉', eraName: '后汉纪',
    emperors: {
      '高祖睿文圣武昭肃孝皇帝': { firstYear: 947, fullName: '高祖睿文圣武昭肃孝皇帝' },
      '隐帝': { firstYear: 948, fullName: '隐帝刘承祐' },
    }
  },
  {
    volumeRange: [290, 294], dynasty: '后周', eraName: '后周纪',
    emperors: {
      '太祖圣神恭肃文武孝皇帝': { firstYear: 951, fullName: '太祖圣神恭肃文武孝皇帝' },
      '世宗睿武孝文皇帝': { firstYear: 954, fullName: '世宗睿武孝文皇帝' },
      '恭皇帝': { firstYear: 959, fullName: '恭皇帝柴宗训' },
    }
  },
];

// ==================== 工具函数 ====================

function getDynastyConfig(volumeNum: number) {
  for (const config of DYNASTY_CONFIGS) {
    if (volumeNum >= config.volumeRange[0] && volumeNum <= config.volumeRange[1]) {
      return config;
    }
  }
  return null;
}

function getVolumeName(volumeNum: number, eraName: string): string {
  const eraVolumes: Record<string, number> = {};
  for (const config of DYNASTY_CONFIGS) {
    if (!eraVolumes[config.eraName]) {
      eraVolumes[config.eraName] = config.volumeRange[0];
    }
  }
  const startVolume = eraVolumes[eraName] || 1;
  const index = volumeNum - startVolume + 1;
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const tens = ['', '十', '二十', '三十', '四十', '五十', '六十', '七十', '八十'];
  const toChinese = (n: number): string => {
    if (n <= 10) return n === 10 ? '十' : digits[n];
    if (n < 20) return `十${digits[n % 10]}`;
    return `${tens[Math.floor(n / 10)]}${digits[n % 10]}`;
  };
  return `${eraName}${toChinese(index)}`;
}

function calculateBcYear(emperor: string, yearMark: string, dynastyConfig: any): number | null {
  const yearNum = parseChineseYear(yearMark);
  if (yearNum === null) return null;
  const emperorInfo = dynastyConfig.emperors[emperor];
  if (!emperorInfo) return null;
  return emperorInfo.firstYear + yearNum - 1;
}

function parseChineseYear(yearMark: string): number | null {
  const numStr = yearMark.replace('年', '');
  if (numStr === '元') return 1;
  const charToNum: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };
  if (numStr.length === 1) return charToNum[numStr] || null;
  if (numStr.length === 2) {
    if (numStr === '十') return 10;
    if (numStr[0] === '十') return 10 + (charToNum[numStr[1]] || 0);
    if (numStr[1] === '十') return (charToNum[numStr[0]] || 0) * 10;
  }
  if (numStr.length === 3 && numStr[1] === '十') {
    return (charToNum[numStr[0]] || 0) * 10 + (charToNum[numStr[2]] || 0);
  }
  return null;
}

function parseBcYearFromAnnotation(annotation: string): number | null {
  const match = annotation.match(/(?:前)?([〇一二三四五六七八九十○零\d]+)/);
  if (!match) return null;

  const isBc = annotation.includes('前');
  const numStr = match[1]
    .replace(/〇/g, '0')
    .replace(/○/g, '0')
    .replace(/零/g, '0')
    .replace(/一/g, '1')
    .replace(/二/g, '2')
    .replace(/三/g, '3')
    .replace(/四/g, '4')
    .replace(/五/g, '5')
    .replace(/六/g, '6')
    .replace(/七/g, '7')
    .replace(/八/g, '8')
    .replace(/九/g, '9');

  const year = parseInt(numStr, 10);
  if (isNaN(year)) return null;

  return isBc ? -year : year;
}

// ==================== HTML 解析核心 ====================

interface ElementText {
  mainText: string;
  notes: string[];
  fullText: string;
}

function extractElementText($: cheerio.CheerioAPI, el: cheerio.Cheerio<cheerio.Element>): ElementText {
  let mainText = '';
  const notes: string[] = [];
  let fullParts: string[] = [];

  function walk(node: cheerio.Element | cheerio.AnyNode) {
    if (node.type === 'text') {
      const text = (node as cheerio.TextNode).data || '';
      mainText += text;
      fullParts.push(text);
    } else if (node.type === 'tag') {
      const tag = node as cheerio.Element;
      const tagName = tag.tagName?.toLowerCase();

      if (tagName === 'span' && tag.attribs?.style?.includes('color:transparent')) {
        return;
      }

      if (tagName === 'small' && tag.attribs?.style?.includes('#996666')) {
        const noteText = $(tag).text().trim();
        if (noteText) {
          notes.push(noteText);
          fullParts.push(`【${noteText}】`);
        }
        return;
      }

      if (tagName === 'b') {
        mainText += $(tag).text();
        fullParts.push($(tag).text());
        return;
      }

      for (const child of (node as cheerio.Element).children || []) {
        walk(child);
      }
    }
  }

  const children = el.contents();
  children.each((_, child) => {
    walk(child);
  });

  return {
    mainText: mainText.replace(/\s+/g, ' ').trim(),
    notes,
    fullText: fullParts.join('').replace(/\s+/g, ' ').trim(),
  };
}

interface YearSection {
  year_mark: string;
  emperor: string;
  bc_year: number | null;
  events: Array<{
    content: string;
    with_notes: string;
    is_chenguangyue: boolean;
  }>;
}

interface VolumeData {
  volume_number: number;
  volume_name: string;
  era_name: string;
  dynasty: string;
  time_range: string;
  year_start: number | null;
  year_end: number | null;
  year_sections: YearSection[];
}

function parseVolumeHtml(html: string, volumeNum: number): VolumeData | null {
  const dynastyConfig = getDynastyConfig(volumeNum);
  if (!dynastyConfig) {
    console.error(`未找到卷 ${volumeNum} 的朝代配置`);
    return null;
  }

  const volumeName = getVolumeName(volumeNum, dynastyConfig.eraName);
  const $ = cheerio.load(html);

  // 提取时间范围
  let timeRange = '';
  const timeText = $('small[style*="996666"]').filter((_, el) => {
    return $(el).text().includes('凡') && $(el).text().includes('年。');
  }).first().text();
  const timeMatch = timeText.match(/起([^，]+)，尽([^，]+)，凡([^年]+年)/);
  if (timeMatch) {
    timeRange = `起${timeMatch[1]}，尽${timeMatch[2]}，凡${timeMatch[3]}`;
  }

  const contentArea = $('.mw-parser-output');
  if (contentArea.length === 0) {
    console.error('未找到内容区域 .mw-parser-output');
    return null;
  }

  interface RawBlock {
    type: 'emperor' | 'year' | 'content' | 'chenguangyue';
    emperor?: string;
    yearMark?: string;
    bcYear?: number | null;
    mainText?: string;
    fullText?: string;
    notes?: string[];
  }

  const blocks: RawBlock[] = [];
  let currentEmperor = '';

  const yearRegex = /^(元年|[一二三四五六七八九十]+年|[^年]{1,4}元年|[^年]{1,4}[一二三四五六七八九十]+年)$/;

  const normalizeEmperorName = (name: string): string => {
    let normalized = name;
    normalized = normalized.replace(/愼/g, '慎');
    normalized = normalized.replace(/[上下中之]+$/, '');
    normalized = normalized.replace(/[甲乙丙丁戊己庚辛壬癸]$/, '');
    normalized = normalized.replace(/[一二三四五六七八九十]$/, '');
    const nameMapping: Record<string, string> = {
      '高皇后': '高后',
    };
    return nameMapping[normalized] || normalized;
  };

  const emperorNames = Object.keys(dynastyConfig.emperors)
    .sort((a, b) => b.length - a.length);
  const emperorRegex = new RegExp(`^(${emperorNames.join('|')})$`);

  let inChenguangyue = false;

  contentArea.find('p, dl').each((_, el) => {
    const $el = $(el);
    const tagName = el.tagName?.toLowerCase();

    if (tagName === 'dl') {
      const dd = $el.find('dd').first();
      const { mainText, fullText } = extractElementText($, dd);

      if (mainText) {
        const isChenguangyueStart = mainText.includes('臣光曰') || mainText.includes('臣司马光曰');
        const isOtherCommentary = mainText.includes('太史公曰') || mainText.includes('史臣曰');

        if (isChenguangyueStart) {
          inChenguangyue = true;
        } else if (isOtherCommentary) {
          inChenguangyue = false;
        }

        blocks.push({
          type: inChenguangyue ? 'chenguangyue' : 'content',
          mainText,
          fullText,
        });
      }
      return;
    }

    inChenguangyue = false;

    const boldText = $el.find('b').first().text().trim();
    if (boldText) {
      const normalizedBoldText = normalizeEmperorName(boldText);
      if (emperorRegex.test(normalizedBoldText)) {
        currentEmperor = normalizedBoldText;
        blocks.push({
          type: 'emperor',
          emperor: normalizedBoldText,
        });
        return;
      }
    }

    const { mainText, fullText, notes } = extractElementText($, $el);

    if (!mainText) return;

    const firstPart = mainText.split(/\s/)[0].trim();
    const yearMatch = firstPart.match(/^(元年|[一二三四五六七八九十]+年|[^年〈（]{1,4}元年|[^年〈（]{1,4}[一二三四五六七八九十]+年)/);
    const yearText = yearMatch ? yearMatch[1] : null;

    if (yearText && yearRegex.test(yearText)) {
      let bcYear: number | null = null;
      if (notes.length > 0) {
        bcYear = parseBcYearFromAnnotation(notes[0]);
      }

      if (bcYear === null && currentEmperor) {
        bcYear = calculateBcYear(currentEmperor, yearText, dynastyConfig);
      }

      blocks.push({
        type: 'year',
        yearMark: yearText,
        bcYear,
      });
      return;
    }

    if (mainText.length < 5 && notes.length > 0 && !mainText.match(/[①②③④⑤⑥⑦⑧⑨⑩]/)) {
      return;
    }

    blocks.push({
      type: 'content',
      mainText,
      fullText,
      notes,
    });
  });

  const yearSections: YearSection[] = [];
  let currentSection: YearSection | null = null;
  let sectionEmperor = '';

  for (const block of blocks) {
    if (block.type === 'emperor') {
      sectionEmperor = block.emperor!;
    } else if (block.type === 'year') {
      if (currentSection) {
        yearSections.push(currentSection);
      }
      currentSection = {
        year_mark: block.yearMark!,
        emperor: sectionEmperor,
        bc_year: block.bcYear ?? null,
        events: [],
      };
    } else if (block.type === 'content' || block.type === 'chenguangyue') {
      if (!currentSection) {
        continue;
      }

      const isChenguangyue = block.type === 'chenguangyue' ||
        /臣光曰/.test(block.mainText || '') ||
        /臣司马光曰/.test(block.mainText || '');

      currentSection.events.push({
        content: (block.mainText || '').replace(/\s+/g, ' ').trim(),
        with_notes: (block.fullText || '').replace(/\s+/g, ' ').trim(),
        is_chenguangyue: isChenguangyue,
      });
    }
  }

  if (currentSection) {
    yearSections.push(currentSection);
  }

  if (yearSections.length === 0) {
    const allEvents: Array<{ content: string; with_notes: string; is_chenguangyue: boolean }> = [];
    for (const block of blocks) {
      if (block.type === 'content' || block.type === 'chenguangyue') {
        const isChenguangyue = block.type === 'chenguangyue' ||
          /臣光曰/.test(block.mainText || '') ||
          /臣司马光曰/.test(block.mainText || '');
        allEvents.push({
          content: (block.mainText || '').replace(/\s+/g, ' ').trim(),
          with_notes: (block.fullText || '').replace(/\s+/g, ' ').trim(),
          is_chenguangyue: isChenguangyue,
        });
      }
    }

    if (allEvents.length > 0) {
      yearSections.push({
        year_mark: '本卷',
        emperor: currentEmperor || '',
        bc_year: null,
        events: allEvents,
      });
      console.log(`  未找到年份标记，将${allEvents.length}个段落归入默认年份段`);
    }
  }

  console.log(`  找到 ${yearSections.length} 个年份段落`);

  let yearStart: number | null = null;
  let yearEnd: number | null = null;
  if (yearSections.length > 0) {
    yearStart = yearSections[0].bc_year;
    yearEnd = yearSections[yearSections.length - 1].bc_year;
  }

  return {
    volume_number: volumeNum,
    volume_name: volumeName,
    era_name: dynastyConfig.eraName,
    dynasty: dynastyConfig.dynasty,
    time_range: timeRange,
    year_start: yearStart,
    year_end: yearEnd,
    year_sections: yearSections,
  };
}

// ==================== 数据库操作（只补充，不删除）====================

async function supplementVolume(pool: Pool, data: VolumeData): Promise<{ inserted: number; skipped: number }> {
  // 检查卷是否存在
  let volumeId: number;
  const existing = await pool.query(
    'SELECT id FROM zizhitongjian_volumes WHERE volume_number = $1',
    [data.volume_number]
  );

  if (existing.rows.length > 0) {
    volumeId = existing.rows[0].id;
  } else {
    const result = await pool.query(`
      INSERT INTO zizhitongjian_volumes
      (volume_number, era_name, dynasty, volume_name, time_range, year_start, year_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [data.volume_number, data.era_name, data.dynasty, data.volume_name, data.time_range,
        data.year_start, data.year_end]);
    volumeId = result.rows[0].id;
    console.log(`  创建卷 ID=${volumeId}`);
  }

  // 获取已存在的年份列表
  const existingYears = await pool.query(
    'SELECT DISTINCT year_mark FROM zizhitongjian_paragraphs WHERE volume_number = $1',
    [data.volume_number]
  );
  const existingYearSet = new Set(existingYears.rows.map(r => r.year_mark));

  // 只插入缺失的年份段落
  let inserted = 0;
  let skipped = 0;
  let eventIndex = 0;

  for (const section of data.year_sections) {
    if (existingYearSet.has(section.year_mark)) {
      // 该年份已存在，跳过
      skipped += section.events.length;
      eventIndex += section.events.length;
      continue;
    }

    // 该年份不存在，插入所有段落
    for (let pIdx = 0; pIdx < section.events.length; pIdx++) {
      const event = section.events[pIdx];
      eventIndex++;

      await pool.query(`
        INSERT INTO zizhitongjian_paragraphs
        (volume_number, year_mark, emperor, bc_year, event_index, paragraph_index,
         content, translation, is_chenguangyue, with_notes, volume_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        data.volume_number,
        section.year_mark,
        section.emperor,
        section.bc_year,
        eventIndex,
        pIdx + 1,
        event.content,
        null,
        String(event.is_chenguangyue),
        event.with_notes,
        `第${data.volume_number}卷`,
      ]);

      inserted++;
    }
  }

  return { inserted, skipped };
}

// ==================== 主函数 ====================

async function main() {
  console.log('='.repeat(60));
  console.log(`资治通鉴数据补充脚本`);
  console.log(`范围: 第 ${START_VOLUME} 卷 ~ 第 ${END_VOLUME} 卷`);
  console.log(`模式: 只补充缺失数据，不删除已有数据`);
  console.log('='.repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let totalInserted = 0;
  let totalSkipped = 0;
  let errorCount = 0;

  try {
    for (let vol = START_VOLUME; vol <= END_VOLUME; vol++) {
      console.log(`\n[${vol}/${END_VOLUME}] 处理第 ${vol} 卷...`);

      const htmlPath = `${HTML_DIR}/vol_${String(vol).padStart(3, '0')}.html`;

      if (!fs.existsSync(htmlPath)) {
        console.log(`  跳过: HTML文件不存在 ${htmlPath}`);
        continue;
      }

      try {
        const html = fs.readFileSync(htmlPath, 'utf-8');
        console.log(`  HTML大小: ${html.length} 字符`);

        const data = parseVolumeHtml(html, vol);

        if (!data) {
          console.log(`  跳过: 无法解析`);
          errorCount++;
          continue;
        }

        console.log(`  卷名: ${data.volume_name}`);
        console.log(`  朝代: ${data.dynasty} | 纪: ${data.era_name}`);
        console.log(`  年份段: ${data.year_sections.length} 个`);

        const { inserted, skipped } = await supplementVolume(pool, data);
        totalInserted += inserted;
        totalSkipped += skipped;

        console.log(`  插入: ${inserted} 个段落, 跳过已存在: ${skipped} 个段落`);

      } catch (err) {
        console.error(`  错误: ${(err as Error).message}`);
        errorCount++;
      }
    }
  } finally {
    await pool.end();
  }

  console.log('\n' + '='.repeat(60));
  console.log(`补充完成!`);
  console.log(`总插入: ${totalInserted} 个段落`);
  console.log(`总跳过: ${totalSkipped} 个段落`);
  console.log(`错误: ${errorCount}`);
  console.log('='.repeat(60));
}

main().catch(console.error);

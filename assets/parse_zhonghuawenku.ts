/**
 * 从中华书局网站(zhonghuashu.com)爬取资治通鉴数据并写入数据库
 * 用法: npx tsx scripts/parse_zhonghuawenku.ts [起始卷号] [结束卷号]
 * 示例: npx tsx scripts/parse_zhonghuawenku.ts 1 5        # 解析第1-5卷
 *       npx tsx scripts/parse_zhonghuawenku.ts 1 294      # 解析全部
 *       npx tsx scripts/parse_zhonghuawenku.ts 2 2        # 只解析第2卷
 *
 * HTML 结构分析:
 * - 帝王名: <p><b>威烈王</b><small style="color:#996666">注解</small></p>
 * - 年份:   <p>二十三年<small>（戊寅、前四○三）注解</small></p>
 * - 正文:   <p>①事件内容<small>注解</small></p>
 * - 臣光曰: <dl><dd>臣光曰︰...<small>注解</small></dd></dl>
 * - 注解全部在 <small style="color:#996666"> 内
 */

import * as cheerio from 'cheerio';
import { FetchClient, Config } from 'coze-coding-dev-sdk';
import { Pool } from 'pg';

// ==================== 配置 ====================
const START_VOLUME = parseInt(process.argv[2] || '1');
const END_VOLUME = parseInt(process.argv[3] || '294');

const BASE_URL =
  'https://www.zhonghuashu.com/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%92_(%E8%83%A1%E4%B8%89%E7%9C%81%E9%9F%B3%E6%B3%A8)/%E5%8D%B7';

function volumeUrl(vol: number): string {
  return `${BASE_URL}${String(vol).padStart(3, '0')}`;
}

// ==================== 接口定义 ====================
interface DynastyConfig {
  volumeRange: [number, number];
  dynasty: string;
  eraName: string;
  emperors: Record<string, { firstYear: number; fullName: string }>;
}

interface YearSection {
  year_mark: string;
  emperor: string;
  bc_year: number | null;
  events: EventParagraph[];
}

interface EventParagraph {
  content: string;           // 正文（去注）
  with_notes: string;        // 正文+注
  is_chenguangyue: boolean;
}

interface VolumeData {
  volume_number: number;
  volume_name: string;
  era_name: string;
  dynasty: string;
  emperor: string;
  time_range: string;
  year_start: number | null;
  year_end: number | null;
  year_sections: YearSection[];
}

// ==================== 朝代配置 ====================
const DYNASTY_CONFIGS: DynastyConfig[] = [
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

function getDynastyConfig(volumeNum: number): DynastyConfig | null {
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

function calculateBcYear(emperor: string, yearMark: string, dynastyConfig: DynastyConfig): number | null {
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

// ==================== HTML 解析核心 ====================

/**
 * 提取元素的纯文本，区分正文和注解
 * HTML 中注解在 <small style="color:#996666"> 内，用隐形 〈...〉 span 包裹
 */
interface ElementText {
  mainText: string;     // 正文（不含注解）
  notes: string[];      // 注解列表
  fullText: string;     // 正文+注解（用【】包裹）
}

function extractElementText(el: cheerio.Cheerio<cheerio.Element>): ElementText {
  let mainText = '';
  const notes: string[] = [];
  let fullParts: string[] = [];

  // 递归遍历节点
  function walk(node: cheerio.Element | cheerio.AnyNode) {
    if (node.type === 'text') {
      const text = (node as cheerio.TextNode).data || '';
      mainText += text;
      fullParts.push(text);
    } else if (node.type === 'tag') {
      const tag = node as cheerio.Element;
      const tagName = tag.tagName?.toLowerCase();

      if (tagName === 'span' && tag.attribs?.style?.includes('color:transparent')) {
        // 隐形 〈 或 〉 标记，忽略
        return;
      }

      if (tagName === 'small' && tag.attribs?.style?.includes('#996666')) {
        // 注解块：提取文本
        const noteText = cheerio(tag).text().trim();
        if (noteText) {
          notes.push(noteText);
          fullParts.push(`【${noteText}】`);
        }
        return;
      }

      if (tagName === 'b') {
        mainText += cheerio(tag).text();
        fullParts.push(cheerio(tag).text());
        return;
      }

      // 递归处理子节点
      for (const child of (node as cheerio.Element).children || []) {
        walk(child);
      }
    }
  }

  // 遍历子节点
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

/**
 * 解析 HTML 中年份注解里的公历年份
 * 格式: "（戊寅、前四○三）" 或 "（丙辰、一一六）" 等
 * "前" 表示公元前，后面是中文或混合数字
 */
function parseBcYearFromAnnotation(annotation: string): number | null {
  // 匹配 "前四○三" 或 "前一一六" 或 "一○六" 等格式
  const match = annotation.match(/(?:前)?([〇一二三四五六七八九十○零\d]+)/);
  if (!match) return null;

  const isBc = annotation.includes('前');
  const numStr = match[1]
    .replace(/〇/g, '0')
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

/**
 * 解析单卷 HTML
 */
function parseVolumeHtml(html: string, volumeNum: number): VolumeData | null {
  const dynastyConfig = getDynastyConfig(volumeNum);
  if (!dynastyConfig) {
    console.error(`未找到卷 ${volumeNum} 的朝代配置`);
    return null;
  }

  const volumeName = getVolumeName(volumeNum, dynastyConfig.eraName);
  const $ = cheerio.load(html);

  // ========== 提取卷信息 ==========
  // 卷标题: <b>资治通鉴卷第一</b>
  const titleEl = $('b').filter((_, el) => {
    const text = $(el).text();
    return /资治通鉴卷第/.test(text);
  });
  const eraNameEl = titleEl.parent().next().next(); // 周纪一 在 <br/> 之后

  // 时间范围: "起著雍摄提格（戊寅），尽玄黓困敦（壬子），凡三十五年。"
  let timeRange = '';
  const timeText = $('small[style*="996666"]').filter((_, el) => {
    return $(el).text().includes('凡') && $(el).text().includes('年。');
  }).first().text();
  const timeMatch = timeText.match(/起([^，]+)，尽([^，]+)，凡([^年]+年)/);
  if (timeMatch) {
    timeRange = `起${timeMatch[1]}，尽${timeMatch[2]}，凡${timeMatch[3]}`;
  }

  // ========== 提取正文内容区域 ==========
  // 所有内容在 .mw-parser-output 下
  const contentArea = $('.mw-parser-output');
  if (contentArea.length === 0) {
    console.error('未找到内容区域 .mw-parser-output');
    return null;
  }

  // ========== 按顺序提取结构化内容 ==========
  // 遍历 <p> 和 <dl><dd> 元素，按顺序识别帝王名、年份、正文事件、臣光曰

  interface RawBlock {
    type: 'emperor' | 'year' | 'content' | 'chenguangyue' | 'skip';
    emperor?: string;       // type=emperor 时
    yearMark?: string;      // type=year 时
    bcYear?: number | null; // type=year 时
    mainText?: string;
    fullText?: string;
    notes?: string[];
  }

  const blocks: RawBlock[] = [];
  let currentEmperor = '';

  // 年份正则：元年、一~九十九年
  const yearRegex = /^(元年|[一二三四五六七八九十]+年)$/;

  // 帝王名正则：匹配朝代配置中的帝王名
  const emperorNames = Object.keys(dynastyConfig.emperors)
    .sort((a, b) => b.length - a.length);
  const emperorRegex = new RegExp(`^(${emperorNames.join('|')})$`);

  // 遍历所有 <p> 和 <dl> 元素
  contentArea.find('p, dl').each((_, el) => {
    const $el = $(el);
    const tagName = el.tagName?.toLowerCase();

    if (tagName === 'dl') {
      // <dl><dd> 内通常是臣光曰或其他评注
      const dd = $el.find('dd').first();
      const { mainText, fullText } = extractElementText(dd);

      if (mainText && (mainText.includes('臣光曰') || mainText.includes('臣司马光曰'))) {
        blocks.push({
          type: 'chenguangyue',
          mainText,
          fullText,
        });
      }
      return;
    }

    // <p> 元素
    // 检查是否是帝王名行：<p><b>威烈王</b>...
    const boldText = $el.find('b').first().text().trim();
    if (boldText && emperorRegex.test(boldText)) {
      currentEmperor = boldText;
      blocks.push({
        type: 'emperor',
        emperor: boldText,
      });
      return;
    }

    // 提取文本（排除 <b>、<small> 等后的纯文本开头）
    const { mainText, fullText, notes } = extractElementText($el);

    if (!mainText) return;

    // 检查是否是年份行
    const firstPart = mainText.split(/\s/)[0].trim();
    if (yearRegex.test(firstPart)) {
      // 尝试从注解中提取公历年份
      let bcYear: number | null = null;
      if (notes.length > 0) {
        // 注解格式: "（戊寅、前四○三）上距..."
        bcYear = parseBcYearFromAnnotation(notes[0]);
      }

      // 如果注解没提取到，用朝代配置计算
      if (bcYear === null && currentEmperor) {
        bcYear = calculateBcYear(currentEmperor, firstPart, dynastyConfig);
      }

      blocks.push({
        type: 'year',
        yearMark: firstPart,
        bcYear,
      });
      return;
    }

    // 检查是否是纯注解行（如 <dl><dd> 里只有注解没有正文）
    if (mainText.length < 5 && notes.length > 0 && !mainText.match(/[①②③④⑤⑥⑦⑧⑨⑩]/)) {
      return; // 跳过纯注解行
    }

    // 普通正文/事件内容
    blocks.push({
      type: 'content',
      mainText,
      fullText,
      notes,
    });
  });

  // ========== 组装 YearSection ==========
  const yearSections: YearSection[] = [];
  let currentSection: YearSection | null = null;

  for (const block of blocks) {
    if (block.type === 'year') {
      // 保存上一个 section
      if (currentSection) {
        yearSections.push(currentSection);
      }
      currentSection = {
        year_mark: block.yearMark!,
        emperor: currentEmperor,
        bc_year: block.bcYear ?? null,
        events: [],
      };
    } else if (block.type === 'content' || block.type === 'chenguangyue') {
      if (!currentSection) {
        // 在第一个年份之前的内容，跳过（通常是序言之类的）
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
    // emperor 和 skip 类型忽略（emperor 只更新 currentEmperor）
  }

  // 保存最后一个 section
  if (currentSection) {
    yearSections.push(currentSection);
  }

  console.log(`  找到 ${yearSections.length} 个年份段落`);

  // ========== 统计 ==========
  let yearStart: number | null = null;
  let yearEnd: number | null = null;
  if (yearSections.length > 0) {
    yearStart = yearSections[0].bc_year;
    yearEnd = yearSections[yearSections.length - 1].bc_year;
  }

  const firstEmperor = yearSections.length > 0 ? yearSections[0].emperor :
    Object.keys(dynastyConfig.emperors)[0];

  return {
    volume_number: volumeNum,
    volume_name: volumeName,
    era_name: dynastyConfig.eraName,
    dynasty: dynastyConfig.dynasty,
    emperor: firstEmperor,
    time_range: timeRange,
    year_start: yearStart,
    year_end: yearEnd,
    year_sections: yearSections,
  };
}

// ==================== 数据库操作 ====================

async function insertVolume(pool: Pool, data: VolumeData): Promise<number> {
  const existing = await pool.query(
    'SELECT id FROM zizhitongjian_volumes WHERE volume_number = $1',
    [data.volume_number]
  );

  let volumeId: number;

  if (existing.rows.length > 0) {
    volumeId = existing.rows[0].id;
    await pool.query(`
      UPDATE zizhitongjian_volumes
      SET era_name = $2, dynasty = $3, emperor = $4, time_range = $5,
          year_start = $6, year_end = $7
      WHERE id = $1
    `, [volumeId, data.era_name, data.dynasty, data.emperor, data.time_range,
        data.year_start, data.year_end]);
    await pool.query('DELETE FROM zizhitongjian_paragraphs WHERE volume_number = $1', [data.volume_number]);
    console.log(`  更新卷 ID=${volumeId}`);
  } else {
    const result = await pool.query(`
      INSERT INTO zizhitongjian_volumes
      (volume_number, era_name, dynasty, emperor, time_range, year_start, year_end, summary, reign_year, "year")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $8)
      RETURNING id
    `, [data.volume_number, data.era_name, data.dynasty, data.emperor, data.time_range,
        data.year_start, data.year_end, data.volume_name]);
    volumeId = result.rows[0].id;
    console.log(`  创建卷 ID=${volumeId}`);
  }

  return volumeId;
}

async function insertParagraphs(pool: Pool, data: VolumeData): Promise<number> {
  let eventIndex = 0;
  let totalInserted = 0;

  for (const section of data.year_sections) {
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
        null, // 中华文库无译文
        String(event.is_chenguangyue),
        event.with_notes,
        `第${data.volume_number}卷`,
      ]);

      totalInserted++;
    }
  }

  return totalInserted;
}

// ==================== 主函数 ====================

async function main() {
  console.log('='.repeat(60));
  console.log(`资治通鉴中华文库爬取解析器`);
  console.log(`解析范围: 第 ${START_VOLUME} 卷 ~ 第 ${END_VOLUME} 卷`);
  console.log(`数据源: zhonghuashu.com`);
  console.log('='.repeat(60));

  const config = new Config();
  const fetchClient = new FetchClient(config);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let successCount = 0;
  let errorCount = 0;

  try {
    for (let vol = START_VOLUME; vol <= END_VOLUME; vol++) {
      console.log(`\n[${vol}/${END_VOLUME}] 正在爬取第 ${vol} 卷...`);
      const url = volumeUrl(vol);
      console.log(`  URL: ${url}`);

      try {
        const response = await fetchClient.fetch(url);

        if (response.status_code !== 0) {
          throw new Error(`HTTP 错误: ${response.status_message}`);
        }

        const fullText = response.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n');

        if (fullText.length < 100) {
          throw new Error(`内容过短 (${fullText.length} 字符)`);
        }

        console.log(`  获取到 ${fullText.length} 字符`);

        const data = parseVolumeHtml(fullText, vol);

        if (!data) {
          console.log(`  跳过: 无法解析`);
          errorCount++;
          continue;
        }

        console.log(`  卷名: ${data.volume_name}`);
        console.log(`  朝代: ${data.dynasty} | 纪: ${data.era_name}`);
        console.log(`  时间范围: ${data.time_range || '未知'}`);
        console.log(`  年份段: ${data.year_sections.length} 个`);
        const totalEvents = data.year_sections.reduce((sum, s) => sum + s.events.length, 0);
        console.log(`  事件段: ${totalEvents} 个`);

        if (data.year_sections.length === 0) {
          console.log(`  警告: 未解析到年份段，跳过`);
          errorCount++;
          continue;
        }

        const volumeId = await insertVolume(pool, data);
        const inserted = await insertParagraphs(pool, data);
        console.log(`  成功插入 ${inserted} 个段落 (volume_id=${volumeId})`);

        successCount++;

        // 避免请求过快
        if (vol < END_VOLUME) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (err) {
        console.error(`  错误: ${(err as Error).message}`);
        errorCount++;
      }
    }
  } finally {
    await pool.end();
  }

  console.log('\n' + '='.repeat(60));
  console.log(`解析完成! 成功: ${successCount}, 失败: ${errorCount}, 总计: ${END_VOLUME - START_VOLUME + 1}`);
  console.log('='.repeat(60));
}

main().catch(console.error);

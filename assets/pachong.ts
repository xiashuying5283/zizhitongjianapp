import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// ===================== 数据结构定义 =====================
/** 胡三省注条目，与被注释的原文一一对应 */
interface HuNote {
  /** 被注释的原文片段 */
  annotatedText: string;
  /** 胡三省注的完整内容 */
  noteContent: string;
}

/** 正文段落（单条事件/论述段落） */
interface Paragraph {
  /** 段落序号（对应原文的①②③带圈编号） */
  sequence?: number;
  /** 完整纯正文（已移除所有注释） */
  fullOriginalText: string;
  /** 拆分后的原文片段+对应注释，严格按原文顺序排列 */
  contentSegments: {
    /** 原文片段 */
    text: string;
    /** 该片段对应的胡三省注 */
    notes: HuNote[];
  }[];
}

/** 年份章节（如 威烈王二十三年） */
interface YearSection {
  /** 年份名称（如 "二十三年"、"元年"） */
  yearName: string;
  /** 年份元数据（干支、公元纪年，如 "戊寅、前四○三"） */
  yearMeta: string;
  /** 该年份下的所有正文段落 */
  paragraphs: Paragraph[];
}

/** 帝王章节（如 周威烈王） */
interface EmperorSection {
  /** 帝王名称（如 "威烈王"、"烈王"） */
  emperorName: string;
  /** 帝王元数据（谥号、生平、小注） */
  emperorMeta: string;
  /** 该帝王在位期间的所有年份章节 */
  yearSections: YearSection[];
}

/** 整卷完整结构化数据 */
interface VolumeData {
  /** 卷名（如 "资治通鉴卷第一"） */
  volumeName: string;
  /** 纪名（如 "周纪一"） */
  jiName: string;
  /** 纪的元数据（起讫时间、年数） */
  jiMeta: string;
  /** 编集/注者信息 */
  authorInfo: string;
  /** 该卷下的所有帝王章节 */
  emperorSections: EmperorSection[];
}

// ===================== 核心工具函数 =====================
/**
 * 带圈数字转普通数字（①→1，②→2...）
 */
function circledNumberToNormal(str: string): number | null {
  const match = str.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/);
  if (!match) return null;
  return match[0].charCodeAt(0) - 9311;
}

/**
 * 拆分正文与胡三省注，实现原文与注释的一一对应
 * @param text 包含〈〉注释的原始文本
 * @returns 拆分后的段落结构
 */
function splitTextAndNotes(text: string): Paragraph['contentSegments'] {
  const segments: Paragraph['contentSegments'] = [];
  // 匹配全角尖括号包裹的胡三省注 〈内容〉
  const noteRegex = /〈([^〉]*)〉/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // 循环匹配所有注释
  while ((match = noteRegex.exec(text)) !== null) {
    const [fullNote, noteContent] = match;
    const noteStartIndex = match.index;
    // 注释前面的原文片段
    const preText = text.slice(lastIndex, noteStartIndex).trim();

    if (preText) {
      segments.push({
        text: preText,
        notes: [{ annotatedText: preText, noteContent: noteContent.trim() }]
      });
    } else if (segments.length > 0) {
      // 连续注释，归属到上一个原文片段
      segments[segments.length - 1].notes.push({
        annotatedText: segments[segments.length - 1].text,
        noteContent: noteContent.trim()
      });
    }

    lastIndex = noteStartIndex + fullNote.length;
  }

  // 处理最后一段无注释的原文
  const remainingText = text.slice(lastIndex).trim();
  if (remainingText) {
    segments.push({
      text: remainingText,
      notes: []
    });
  }

  return segments;
}

/**
 * 生成纯正文文本（移除所有注释）
 */
function getPureOriginalText(segments: Paragraph['contentSegments']): string {
  return segments.map(s => s.text).join('').trim();
}

// ===================== 主提取函数 =====================
async function extractZiZhiTongJian(url: string, outputPath: string = 'zztj-volume.json') {
  try {
    console.log(`正在请求页面: ${url}`);
    // 1. 请求页面HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    // 2. 解析HTML，提取正文纯文本
    const $ = cheerio.load(response.data);
    // 中华文库wiki正文核心容器，可根据页面实际结构调整
    const mainContent = $('#mw-content-text').text() || $('body').text();
    if (!mainContent) {
      throw new Error('未提取到页面正文内容');
    }

    // 3. 文本预处理：按行拆分，过滤空行，清理首尾空格
    const lines = mainContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`成功提取正文，共 ${lines.length} 行`);

    // 4. 逐行解析，构建结构化数据
    const volumeData: VolumeData = {
      volumeName: '',
      jiName: '',
      jiMeta: '',
      authorInfo: '',
      emperorSections: []
    };

    // 状态变量，用于层级嵌套处理
    let currentEmperor: EmperorSection | null = null;
    let currentYear: YearSection | null = null;
    let currentParagraph: Paragraph | null = null;
    let isAuthorInfoCollected = false;

    // 正则规则定义
    const volumeNameRegex = /^资治通鉴卷第[一二三四五六七八九十百]+/;
    const jiNameRegex = /^([A-Za-z\u4e00-\u9fa5]+纪[一二三四五六七八九十百]+)/;
    const emperorRegex = /^([\u4e00-\u9fa5]+王)\s*〈([^〉]*)〉$/;
    const yearRegex = /^([元一二三四五六七八九十百]+年)\s*〈([^〉]*)〉$/;
    const paragraphStartRegex = /^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/;

    // 逐行处理
    for (const line of lines) {
      // 4.1 提取卷名
      if (volumeNameRegex.test(line)) {
        volumeData.volumeName = line;
        continue;
      }

      // 4.2 提取纪名与元数据
      const jiMatch = line.match(jiNameRegex);
      if (jiMatch) {
        volumeData.jiName = jiMatch[1];
        const jiMetaMatch = line.match(/〈([^〉]*)〉/);
        volumeData.jiMeta = jiMetaMatch ? jiMetaMatch[1].trim() : '';
        continue;
      }

      // 4.3 提取作者/注者信息
      if (line.includes('司马光') && line.includes('奉敕编集')) {
        volumeData.authorInfo = line;
        isAuthorInfoCollected = true;
        continue;
      }
      if (line.includes('胡三省') && line.includes('音注')) {
        volumeData.authorInfo += '\n' + line;
        isAuthorInfoCollected = true;
        continue;
      }

      // 4.4 提取帝王章节
      const emperorMatch = line.match(emperorRegex);
      if (emperorMatch) {
        // 结束上一个帝王的处理
        if (currentEmperor && currentYear) {
          currentEmperor.yearSections.push(currentYear);
        }
        if (currentEmperor) {
          volumeData.emperorSections.push(currentEmperor);
        }
        // 新建帝王章节
        currentEmperor = {
          emperorName: emperorMatch[1].trim(),
          emperorMeta: emperorMatch[2].trim(),
          yearSections: []
        };
        currentYear = null;
        currentParagraph = null;
        continue;
      }

      // 4.5 提取年份章节
      const yearMatch = line.match(yearRegex);
      if (yearMatch && currentEmperor) {
        // 结束上一个年份的处理
        if (currentYear && currentParagraph) {
          currentYear.paragraphs.push(currentParagraph);
        }
        if (currentYear) {
          currentEmperor.yearSections.push(currentYear);
        }
        // 新建年份章节
        currentYear = {
          yearName: yearMatch[1].trim(),
          yearMeta: yearMatch[2].trim(),
          paragraphs: []
        };
        currentParagraph = null;
        continue;
      }

      // 4.6 提取正文段落（带圈编号开头的事件段落）
      const paragraphMatch = line.match(paragraphStartRegex);
      if (paragraphMatch && currentYear) {
        // 结束上一个段落的处理
        if (currentParagraph) {
          currentYear.paragraphs.push(currentParagraph);
        }
        // 新建段落
        const sequence = circledNumberToNormal(paragraphMatch[1]);
        const lineWithoutNumber = line.replace(paragraphStartRegex, '').trim();
        const segments = splitTextAndNotes(lineWithoutNumber);

        currentParagraph = {
          sequence: sequence || undefined,
          fullOriginalText: getPureOriginalText(segments),
          contentSegments: segments
        };
        continue;
      }

      // 4.7 处理段落的续行（非标题行，归属到当前段落）
      if (currentParagraph && line.length > 0 && !volumeNameRegex.test(line) && !jiNameRegex.test(line) && !emperorRegex.test(line) && !yearRegex.test(line)) {
        const segments = splitTextAndNotes(line);
        currentParagraph.contentSegments.push(...segments);
        currentParagraph.fullOriginalText += getPureOriginalText(segments);
        continue;
      }

      // 4.8 处理无编号的论述段落（如"臣光曰"）
      if (currentYear && !currentParagraph && line.length > 0 && !paragraphStartRegex.test(line)) {
        const segments = splitTextAndNotes(line);
        currentParagraph = {
          fullOriginalText: getPureOriginalText(segments),
          contentSegments: segments
        };
        continue;
      }
    }

    // 5. 处理最后一个未闭合的层级
    if (currentParagraph && currentYear) {
      currentYear.paragraphs.push(currentParagraph);
    }
    if (currentYear && currentEmperor) {
      currentEmperor.yearSections.push(currentYear);
    }
    if (currentEmperor) {
      volumeData.emperorSections.push(currentEmperor);
    }

    // 6. 保存为JSON文件
    const outputFullPath = path.resolve(outputPath);
    fs.writeFileSync(outputFullPath, JSON.stringify(volumeData, null, 2), 'utf-8');
    console.log(`提取完成！结构化数据已保存至: ${outputFullPath}`);

    return volumeData;
  } catch (error) {
    console.error('提取失败:', error);
    throw error;
  }
}

// ===================== 执行脚本 =====================
// 目标页面URL
const targetUrl = 'https://www.zhonghuashu.com/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%92_(%E8%83%A1%E4%B8%89%E7%9C%81%E9%9F%B3%E6%B3%A8)/%E5%8D%B7001';
// 输出文件路径
const outputFile = '资治通鉴-卷001-胡三省注-结构化数据.json';

// 执行提取
extractZiZhiTongJian(targetUrl, outputFile)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
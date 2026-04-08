import * as fs from 'fs';
import * as path from 'path';
import * as OpenCC from 'opencc-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

interface ParagraphData {
  volume_number: number;
  year_mark: string;
  emperor: string;
  bc_year: number;
  event_index: number;
  paragraph_index: number;
  content: string;
  with_notes: string;
  is_chenguangyue: boolean;
  volume_name: string;
  content_traditional: string;
  with_notes_traditional: string;
}

interface YearTarget {
  displayMark: string;  // 显示用，如"咸康二年"
  matchPattern: RegExp; // 匹配模式
  bcYear: number;
}

// 从HTML中提取纯文本和带注解文本
function extractTexts(html: string): { content: string; withNotes: string } {
  // 提取带注解的文本（保留<small>标签内容作为注解）
  let withNotes = html
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '')
    .replace(/<small[^>]*>/g, '【')
    .replace(/<\/small>/g, '】')
    .replace(/<[^>]+>/g, '') // 移除其他HTML标签
    .replace(/\s+/g, ' ')
    .trim();
  
  // 提取纯文本（移除注解）
  let content = html
    .replace(/<small[^>]*>[\s\S]*?<\/small>/g, '')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { content, withNotes };
}

// 解析单个HTML文件中的特定年份
function parseVolumeForYears(
  htmlContent: string,
  volumeNumber: number,
  volumeName: string,
  emperor: string,
  targetYears: YearTarget[]
): ParagraphData[] {
  const results: ParagraphData[] = [];
  
  // 按段落分割
  const paragraphs = htmlContent.split(/<p>/).filter(p => p.trim());
  
  let currentYearMark = '';
  let currentBcYear = 0;
  let currentEventIndex = 0;
  let paragraphInEvent = 0;
  let inTargetYear = false;
  
  for (const para of paragraphs) {
    const cleanPara = para.trim();
    
    // 检测年份标记 - 多种格式
    // 格式1: "咸康二年<small...（丙申、三三六）"
    // 格式2: "二年<small...（丙申、三三六）"
    // 格式3: "三载<small...（甲申、七四四）"
    
    for (const target of targetYears) {
      const match = cleanPara.match(target.matchPattern);
      if (match) {
        currentYearMark = target.displayMark;
        currentBcYear = target.bcYear;
        currentEventIndex = 0;
        paragraphInEvent = 0;
        inTargetYear = true;
        break;
      }
    }
    
    // 如果匹配到年份标记，继续下一个段落
    if (cleanPara.match(/^[一二三四五六七八九十]+[年载]<small/)) {
      continue;
    }
    
    // 如果匹配到带年号前缀的年份标记，也继续
    if (cleanPara.match(/^[元寿咸康天宝][一二三四五六七八九十]+[年载]<small/)) {
      continue;
    }
    
    // 如果不在目标年份，跳过
    if (!inTargetYear) continue;
    
    // 检测下一个年份标记（结束当前年份）
    const nextYearMatch = cleanPara.match(/^[元寿咸康天宝]?[一二三四五六七八九十]+[年载]<small/);
    if (nextYearMatch) {
      inTargetYear = false;
      continue;
    }
    
    // 检测事件编号 (如 ①, ②, ⑩ 等)
    const eventMatch = cleanPara.match(/^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/);
    if (eventMatch) {
      // 将Unicode圈数字转换为阿拉伯数字
      const circleNumMap: { [key: string]: number } = {
        '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5,
        '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
        '⑪': 11, '⑫': 12, '⑬': 13, '⑭': 14, '⑮': 15,
        '⑯': 16, '⑰': 17, '⑱': 18, '⑲': 19, '⑳': 20
      };
      currentEventIndex = circleNumMap[eventMatch[1]] || 1;
      paragraphInEvent = 1;
    } else if (currentEventIndex > 0) {
      paragraphInEvent++;
    } else {
      // 如果还没有事件编号，跳过
      continue;
    }
    
    // 提取文本
    const { content, withNotes } = extractTexts(cleanPara);
    
    // 跳过空内容
    if (!content || content.length < 5) continue;
    
    results.push({
      volume_number: volumeNumber,
      year_mark: currentYearMark,
      emperor: emperor,
      bc_year: currentBcYear,
      event_index: currentEventIndex,
      paragraph_index: paragraphInEvent,
      content: content,
      with_notes: withNotes,
      is_chenguangyue: false,
      volume_name: volumeName,
      content_traditional: converter(content),
      with_notes_traditional: converter(withNotes)
    });
  }
  
  return results;
}

// 生成INSERT SQL语句
function generateInsertSQL(paragraphs: ParagraphData[]): string {
  const sqlStatements: string[] = [];
  
  sqlStatements.push(`-- 缺失数据补充`);
  sqlStatements.push(`-- 卷95: 咸康二年 (公元前336年)`);
  sqlStatements.push(`-- 卷215: 天宝三载至六载 (公元744-747年)`);
  sqlStatements.push(`-- 生成时间: ${new Date().toISOString()}`);
  sqlStatements.push('');
  
  for (const p of paragraphs) {
    const escapedContent = p.content.replace(/'/g, "''");
    const escapedWithNotes = p.with_notes.replace(/'/g, "''");
    const escapedContentTrad = p.content_traditional.replace(/'/g, "''");
    const escapedWithNotesTrad = p.with_notes_traditional.replace(/'/g, "''");
    
    const sql = `INSERT INTO zizhitongjian_paragraphs (volume_number, year_mark, emperor, bc_year, event_index, paragraph_index, content, with_notes, is_chenguangyue, volume_name, content_traditional, with_notes_traditional) VALUES (${p.volume_number}, '${p.year_mark}', '${p.emperor}', ${p.bc_year}, ${p.event_index}, ${p.paragraph_index}, '${escapedContent}', '${escapedWithNotes}', ${p.is_chenguangyue}, '${p.volume_name}', '${escapedContentTrad}', '${escapedWithNotesTrad}');`;
    
    sqlStatements.push(sql);
  }
  
  return sqlStatements.join('\n');
}

// 主函数
async function main() {
  const htmlDir = path.join(__dirname, '../data/html');
  
  // 定义需要提取的卷和年份
  const extractions = [
    {
      volumeFile: 'vol_095.html',
      volumeNumber: 95,
      volumeName: '晋纪十七',
      emperor: '显宗成皇帝',
      years: [
        // 咸康二年 - HTML中写的是"二年"
        { 
          displayMark: '咸康二年', 
          matchPattern: /^二年<small[^>]*>.*?（丙申、三三六）/, 
          bcYear: 336 
        }
      ]
    },
    {
      volumeFile: 'vol_215.html',
      volumeNumber: 215,
      volumeName: '唐纪三十一',
      emperor: '玄宗至道大圣大明孝皇帝',
      years: [
        // 天宝三载
        { 
          displayMark: '天宝三载', 
          matchPattern: /^三载<small[^>]*>.*?（甲申、七四四）/, 
          bcYear: 744 
        },
        // 天宝四载
        { 
          displayMark: '天宝四载', 
          matchPattern: /^四载<small[^>]*>.*?（乙酉、七四五）/, 
          bcYear: 745 
        },
        // 天宝五载
        { 
          displayMark: '天宝五载', 
          matchPattern: /^五载<small[^>]*>.*?（丙戌、七四六）/, 
          bcYear: 746 
        },
        // 天宝六载
        { 
          displayMark: '天宝六载', 
          matchPattern: /^六载<small[^>]*>.*?（丁亥、七四七）/, 
          bcYear: 747 
        }
      ]
    }
  ];
  
  const allParagraphs: ParagraphData[] = [];
  
  for (const ext of extractions) {
    const filePath = path.join(htmlDir, ext.volumeFile);
    console.log(`处理文件: ${ext.volumeFile}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      continue;
    }
    
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    const paragraphs = parseVolumeForYears(
      htmlContent,
      ext.volumeNumber,
      ext.volumeName,
      ext.emperor,
      ext.years
    );
    
    console.log(`  提取到 ${paragraphs.length} 个段落`);
    
    // 按年份统计
    const yearCounts: { [key: string]: number } = {};
    for (const p of paragraphs) {
      yearCounts[p.year_mark] = (yearCounts[p.year_mark] || 0) + 1;
    }
    for (const [year, count] of Object.entries(yearCounts)) {
      console.log(`    ${year}: ${count} 段`);
    }
    
    allParagraphs.push(...paragraphs);
  }
  
  // 生成SQL文件
  const sqlContent = generateInsertSQL(allParagraphs);
  const outputPath = path.join(__dirname, '../data/sql/insert_missing_years_v95_v215.sql');
  
  // 确保目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  console.log(`\nSQL文件已生成: ${outputPath}`);
  console.log(`共 ${allParagraphs.length} 条INSERT语句`);
}

main().catch(console.error);

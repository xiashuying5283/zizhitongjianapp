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

// Unicode圈数字映射
const circleNumMap: { [key: string]: number } = {
  '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5,
  '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
  '⑪': 11, '⑫': 12, '⑬': 13, '⑭': 14, '⑮': 15,
  '⑯': 16, '⑰': 17, '⑱': 18, '⑲': 19, '⑳': 20,
  '㉑': 21, '㉒': 22, '㉓': 23, '㉔': 24, '㉕': 25,
  '㉖': 26, '㉗': 27, '㉘': 28, '㉙': 29, '㉚': 30
};

// 解析HTML提取至德二载内容
function parseVolumeForZhideEryear(htmlContent: string): ParagraphData[] {
  const results: ParagraphData[] = [];
  
  // 按段落分割
  const paragraphs = htmlContent.split(/<p>/).filter(p => p.trim());
  
  let currentEventIndex = 0;
  let paragraphInEvent = 0;
  let inZhideEryear = false;
  let foundNextYear = false;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    
    // 检测至德二载年份标记
    if (para.match(/^至德二载<small[^>]*>.*?（丁酉、七五七）/)) {
      inZhideEryear = true;
      foundNextYear = false;
      currentEventIndex = 0;
      paragraphInEvent = 0;
      console.log('找到至德二载标记');
      continue;
    }
    
    // 如果还没找到至德二载，继续
    if (!inZhideEryear) continue;
    
    // 检测下一个年份标记（乾元元年）- 结束至德二载
    if (para.match(/乾元元年/) || para.match(/元年<small[^>]*>.*?（戊戌、七五八）/)) {
      console.log('找到下一个年份标记，结束至德二载提取');
      foundNextYear = true;
      break;
    }
    
    // 跳过标题段落（如"肃宗文明武德大圣大宣孝宣皇帝中之下"）
    if (para.includes('肃宗文明武德大圣大宣孝宣皇帝')) {
      continue;
    }
    
    // 检测事件编号 (如 ①, ②, ⑩ 等)
    const eventMatch = para.match(/^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚])/);
    if (eventMatch) {
      currentEventIndex = circleNumMap[eventMatch[1]] || 1;
      paragraphInEvent = 1;
    } else if (currentEventIndex > 0 && !foundNextYear) {
      paragraphInEvent++;
    } else {
      // 如果还没有事件编号，跳过
      continue;
    }
    
    // 提取文本
    const { content, withNotes } = extractTexts(para);
    
    // 跳过空内容或过短内容
    if (!content || content.length < 5) continue;
    
    results.push({
      volume_number: 220,
      year_mark: '至德二载',
      emperor: '肃宗文明武德大圣大宣孝宣皇帝',
      bc_year: 757,
      event_index: currentEventIndex,
      paragraph_index: paragraphInEvent,
      content: content,
      with_notes: withNotes,
      is_chenguangyue: false,
      volume_name: '唐纪三十六',
      content_traditional: converter(content),
      with_notes_traditional: converter(withNotes)
    });
  }
  
  return results;
}

// 生成INSERT SQL语句
function generateInsertSQL(paragraphs: ParagraphData[]): string {
  const sqlStatements: string[] = [];
  
  sqlStatements.push(`-- 缺失数据补充：卷220 至德二载（公元757年）`);
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
  const htmlPath = path.join(__dirname, '../data/html/vol_220.html');
  
  console.log(`读取文件: ${htmlPath}`);
  
  if (!fs.existsSync(htmlPath)) {
    console.error(`文件不存在: ${htmlPath}`);
    process.exit(1);
  }
  
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  const paragraphs = parseVolumeForZhideEryear(htmlContent);
  
  console.log(`\n提取到 ${paragraphs.length} 个段落`);
  
  // 按事件统计
  const eventCounts: { [key: number]: number } = {};
  for (const p of paragraphs) {
    eventCounts[p.event_index] = (eventCounts[p.event_index] || 0) + 1;
  }
  for (const [event, count] of Object.entries(eventCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  事件${event}: ${count} 段`);
  }
  
  // 生成SQL文件
  const sqlContent = generateInsertSQL(paragraphs);
  const outputPath = path.join(__dirname, '../data/sql/insert_zhide_eryear_v220.sql');
  
  // 确保目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  console.log(`\nSQL文件已生成: ${outputPath}`);
}

main().catch(console.error);

/**
 * 扫描资治通鉴中的生僻字/异体字
 * 
 * Unicode CJK 区间：
 * - 基本区：U+4E00-U+9FFF（常用汉字）
 * - 扩展 A：U+3400-U+4DBF（较少用）
 * - 扩展 B：U+20000-U+2A6DF（生僻字）
 * - 扩展 C：U+2A700-U+2B73F
 * - 扩展 D：U+2B740-U+2B81F
 * - 扩展 E：U+2B820-U+2CEAF
 * - 扩展 F：U+2CEB0-U+2EBEF
 * - 扩展 G：U+30000-U+3134F
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Unicode 区间定义
const CJK_RANGES = {
  '基本区': { start: 0x4E00, end: 0x9FFF },
  '扩展A': { start: 0x3400, end: 0x4DBF },
  '扩展B': { start: 0x20000, end: 0x2A6DF },
  '扩展C': { start: 0x2A700, end: 0x2B73F },
  '扩展D': { start: 0x2B740, end: 0x2B81F },
  '扩展E': { start: 0x2B820, end: 0x2CEAF },
  '扩展F': { start: 0x2CEB0, end: 0x2EBEF },
  '扩展G': { start: 0x30000, end: 0x3134F },
};

// 获取字符所属区间
function getCharRange(char: string): string | null {
  const code = char.codePointAt(0)!;
  
  for (const [name, range] of Object.entries(CJK_RANGES)) {
    if (code >= range.start && code <= range.end) {
      return name;
    }
  }
  
  // 检查是否是其他可能的问题字符
  // 兼容汉字、康熙部首等
  if (code >= 0xF900 && code <= 0xFAFF) return '兼容汉字';
  if (code >= 0x2F00 && code <= 0x2FDF) return '康熙部首';
  
  return null;
}

async function scanUncommonChars() {
  console.log('开始扫描生僻字/异体字...\n');

  // 获取所有段落内容
  const result = await pool.query(`
    SELECT id, volume_number, content 
    FROM zizhitongjian_paragraphs 
    ORDER BY volume_number
  `);

  console.log(`共 ${result.rows.length} 条段落\n`);

  // 统计数据
  const charStats = new Map<string, {
    char: string;
    unicode: string;
    range: string;
    count: number;
    volumes: Set<number>;
    examples: Array<{ volume: number; content: string }>;
  }>();

  let totalChars = 0;
  let uncommonCount = 0;

  // 扫描每个段落
  for (const row of result.rows) {
    const text = row.content;
    totalChars += text.length;

    for (const char of text) {
      const range = getCharRange(char);
      
      // 只记录非常用汉字
      if (range && range !== '基本区') {
        uncommonCount++;
        
        if (!charStats.has(char)) {
          charStats.set(char, {
            char,
            unicode: `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`,
            range,
            count: 0,
            volumes: new Set(),
            examples: [],
          });
        }
        
        const stat = charStats.get(char)!;
        stat.count++;
        stat.volumes.add(row.volume_number);
        
        // 记录示例（最多3个）
        if (stat.examples.length < 3) {
          const context = text.substring(Math.max(0, text.indexOf(char) - 10), text.indexOf(char) + 11);
          stat.examples.push({
            volume: row.volume_number,
            content: context,
          });
        }
      }
    }
  }

  // 按区间分组统计
  const rangeSummary = new Map<string, number>();
  for (const stat of charStats.values()) {
    rangeSummary.set(stat.range, (rangeSummary.get(stat.range) || 0) + stat.count);
  }

  // 输出报告
  console.log('='.repeat(60));
  console.log('扫描报告');
  console.log('='.repeat(60));
  console.log(`总字符数：${totalChars.toLocaleString()}`);
  console.log(`生僻/异体字符数：${uncommonCount.toLocaleString()}（${(uncommonCount / totalChars * 100).toFixed(4)}%）`);
  console.log(`不重复生僻字数：${charStats.size}`);
  console.log('');

  console.log('按区间分布：');
  console.log('-'.repeat(40));
  for (const [range, count] of Array.from(rangeSummary.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${range.padEnd(8)}：${count.toString().padStart(6)} 次`);
  }
  console.log('');

  // 输出详细字符列表（按出现次数排序）
  console.log('生僻字详细列表（按出现次数排序）：');
  console.log('-'.repeat(60));

  const sortedChars = Array.from(charStats.values()).sort((a, b) => b.count - a.count);
  
  // 输出前 50 个最常见的生僻字
  console.log('\n【出现次数最多的 50 个生僻字】\n');
  console.log('字符 | Unicode  | 区间    | 次数 | 出现卷数');
  console.log('-'.repeat(60));
  
  for (const stat of sortedChars.slice(0, 50)) {
    const volumesStr = stat.volumes.size <= 5 
      ? Array.from(stat.volumes).join(',')
      : `${Array.from(stat.volumes).slice(0, 3).join(',')}...共${stat.volumes.size}卷`;
    console.log(`  ${stat.char}   | ${stat.unicode} | ${stat.range.padEnd(6)} | ${stat.count.toString().padStart(4)} | ${volumesStr}`);
  }

  // 输出所有生僻字（完整列表）
  console.log('\n\n【完整生僻字列表】\n');
  for (const stat of sortedChars) {
    console.log(`${stat.char}\t${stat.unicode}\t${stat.range}\t${stat.count}`);
  }

  // 按区间分组输出
  console.log('\n\n【按区间分组统计】\n');
  const groupedByRange = new Map<string, typeof sortedChars>();
  for (const stat of sortedChars) {
    if (!groupedByRange.has(stat.range)) {
      groupedByRange.set(stat.range, []);
    }
    groupedByRange.get(stat.range)!.push(stat);
  }

  for (const [range, chars] of Array.from(groupedByRange.entries()).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n### ${range}（共 ${chars.length} 个不同字符，${chars.reduce((s, c) => s + c.count, 0)} 次出现）\n`);
    for (const stat of chars.slice(0, 20)) {
      console.log(`  ${stat.char} (${stat.unicode}) - ${stat.count}次，见卷${Array.from(stat.volumes).slice(0, 3).join(',')}${stat.volumes.size > 3 ? '...' : ''}`);
    }
    if (chars.length > 20) {
      console.log(`  ... 还有 ${chars.length - 20} 个字符`);
    }
  }

  await pool.end();
}

scanUncommonChars().catch(console.error);

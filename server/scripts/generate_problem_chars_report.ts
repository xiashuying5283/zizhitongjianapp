/**
 * 生成手机显示异常字符报告
 * 输出扩展B及以上字符的详细上下文
 */

import { Pool } from 'pg';
import * as fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface ProblemChar {
  char: string;
  unicode: string;
  occurrences: Array<{
    volume: number;
    volumeName: string;
    yearMark: string;
    yearDisplay: string;
    emperor: string;
    context: string;
    paragraphId: number;
  }>;
}

async function generateReport() {
  console.log('正在扫描数据库...');

  // 获取所有段落及其元数据
  const result = await pool.query(`
    SELECT 
      p.id,
      p.volume_number,
      p.year_mark,
      p.emperor,
      p.content,
      v.volume_name,
      v.dynasty
    FROM zizhitongjian_paragraphs p
    LEFT JOIN zizhitongjian_volumes v ON p.volume_number = v.volume_number
    ORDER BY p.volume_number, p.bc_year
  `);

  // 按字符收集出现位置
  const charMap = new Map<string, ProblemChar>();

  for (const row of result.rows) {
    const content = row.content;
    
    // 使用 for...of 正确处理代理对
    let i = 0;
    for (const char of content) {
      const code = char.codePointAt(0)!;
      
      // 扩展B及以上：U+20000 以上
      if (code >= 0x20000) {
        if (!charMap.has(char)) {
          charMap.set(char, {
            char,
            unicode: 'U+' + code.toString(16).toUpperCase().padStart(5, '0'),
            occurrences: [],
          });
        }

        const problemChar = charMap.get(char)!;
        
        // 获取字符在字符串中的实际位置
        const charIndex = content.indexOf(char, i > 0 ? content.lastIndexOf(char, i - 1) + 1 : 0);
        
        // 提取上下文（前后各20字）
        const start = Math.max(0, charIndex - 20);
        const end = Math.min(content.length, charIndex + char.length + 20);
        let context = content.slice(start, end);
        
        // 高亮目标字符
        context = context.replace(char, '【' + char + '】');

        // 格式化年份显示
        const yearDisplay = row.year_mark || '';
        
        problemChar.occurrences.push({
          volume: row.volume_number,
          volumeName: row.volume_name || '',
          yearMark: row.year_mark || '',
          yearDisplay: yearDisplay,
          emperor: row.emperor || '',
          context: context,
          paragraphId: row.id,
        });
      }
      i += char.length; // 正确更新位置（代理对字符 length 为 2）
    }
  }

  // 按出现次数排序
  const sortedChars = Array.from(charMap.values()).sort(
    (a, b) => b.occurrences.length - a.occurrences.length
  );

  // 生成 Markdown 报告
  let md = `# 资治通鉴手机显示异常字符报告

> 生成时间：${new Date().toLocaleString()}

## 概览

| 指标 | 数值 |
|------|------|
| 总字符数 | ${sortedChars.reduce((s, c) => s + c.occurrences.length, 0)} |
| 不重复字符数 | ${sortedChars.length} |

---

## 详细列表

`;

  for (const item of sortedChars) {
    md += `## ${item.char} (${item.unicode})

共出现 **${item.occurrences.length}** 次

| 卷 | 卷名 | 年份 | 帝王 | 上下文 |
|---|------|------|------|--------|
`;
    
    for (const occ of item.occurrences) {
      // 转义 Markdown 特殊字符
      const context = occ.context
        .replace(/\|/g, '｜')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
      
      md += `| ${occ.volume} | ${occ.volumeName} | ${occ.yearDisplay} | ${occ.emperor} | ${context} |\n`;
    }
    
    md += '\n---\n\n';
  }

  // 写入文件
  const outputPath = '/tmp/problem_chars_report.md';
  fs.writeFileSync(outputPath, md, 'utf-8');
  
  console.log(`\n报告已生成：${outputPath}`);
  console.log(`共 ${sortedChars.length} 个异常字符，${sortedChars.reduce((s, c) => s + c.occurrences.length, 0)} 次出现`);

  await pool.end();
}

generateReport().catch(console.error);

const https = require('https');
const http = require('http');
const iconv = require('iconv-lite');
const { Pool } = require('pg');

/**
 * 获取网页内容
 */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const html = iconv.decode(buffer, 'gb2312');
        resolve(html);
      });
    }).on('error', reject);
  });
}

/**
 * 解析HTML提取译文内容
 */
function extractTranslation(html) {
  const lines = html.split('\n');
  const translations = [];
  
  let currentYear = '';
  let currentEmperor = '';
  let currentContent = '';
  let isCollecting = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 提取年份信息
    if (line.includes('<b>') && line.includes('年')) {
      const match = line.match(/<b>([^<]+)<\/b>/);
      if (match) {
        currentYear = match[1];
      }
    }
    
    // 提取帝王信息
    if (line.includes('◎') && line.includes('</font>')) {
      const match = line.match(/◎\s*([^<\[]+)/);
      if (match) {
        currentEmperor = match[1].trim();
      }
    }
    
    // 检测【译文】开始标记
    if (line.includes('【译文】')) {
      isCollecting = true;
      currentContent = '';
      continue;
    }
    
    // 收集译文内容
    if (isCollecting) {
      // 检测译文结束标记
      if (line.includes('【原文】') || (line.includes('<b>') && line.includes('年') && !line.includes('译文'))) {
        if (currentContent.trim()) {
          translations.push({
            year: currentYear,
            emperor: currentEmperor,
            content: currentContent.trim()
          });
        }
        isCollecting = false;
        currentContent = '';
        continue;
      }
      
      // 清理HTML标签
      const cleanLine = line
        .replace(/<br>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/　/g, '  ')
        .trim();
      
      if (cleanLine && !cleanLine.startsWith('【')) {
        currentContent += cleanLine + '\n';
      }
    }
  }
  
  return translations;
}

/**
 * 从年份字符串中提取年份标记
 */
function extractYearMark(yearStr) {
  const match = yearStr.match(/(\d+年|元年|二年|三年|四年|五年|六年|七年|八年|九年|十年|十[一二三四五六七八九]年|二?十[一二三四五六七八九]年|三?十[一二三四五六七八九]年)/);
  return match ? match[1] : '';
}

/**
 * 从年份字符串中提取公元年份
 */
function extractBcYear(yearStr) {
  const match = yearStr.match(/公元前(\d+)年/);
  return match ? parseInt(match[1]) : null;
}

/**
 * 主函数
 */
async function main() {
  const volume = process.argv[2] || 1;
  
  console.log(`开始导入第 ${volume} 卷译文...\n`);
  
  const volumeNum = String(volume).padStart(3, '0');
  const url = `http://www.ziyexing.com/files-5/zizhitongjian/zizhitongjian_${volumeNum}.htm`;
  
  console.log(`爬取URL: ${url}`);
  
  const html = await fetchPage(url);
  const translations = extractTranslation(html);
  
  console.log(`提取到 ${translations.length} 段译文\n`);
  
  // 导入数据库
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  let matchedCount = 0;
  let unmatchedCount = 0;
  const unmatchedItems = [];
  
  for (const item of translations) {
    const yearMark = extractYearMark(item.year);
    const bcYear = extractBcYear(item.year);
    
    const query = `
      UPDATE zizhitongjian_year_sections 
      SET translation = $1 
      WHERE volume_id = $2 
        AND (year_mark = $3 OR year_mark LIKE '%' || $3)
        AND ($4::int IS NULL OR bc_year = $4)
    `;
    
    const result = await pool.query(query, [
      item.content,
      volume,
      yearMark,
      bcYear,
    ]);
    
    if (result.rowCount > 0) {
      matchedCount++;
      console.log(`✓ 匹配成功: ${item.year}`);
    } else {
      unmatchedCount++;
      unmatchedItems.push({
        year: item.year,
        content: item.content.substring(0, 100),
      });
      console.log(`✗ 未匹配: ${item.year}`);
    }
  }
  
  await pool.end();
  
  console.log(`\n=== 导入结果 ===`);
  console.log(`总计: ${translations.length} 段`);
  console.log(`匹配成功: ${matchedCount} 段`);
  console.log(`未匹配: ${unmatchedCount} 段`);
  
  if (unmatchedItems.length > 0) {
    console.log(`\n未匹配的译文（前5个）:`);
    unmatchedItems.slice(0, 5).forEach((item, i) => {
      console.log(`${i + 1}. ${item.year}`);
      console.log(`   ${item.content}...\n`);
    });
  }
}

main().catch(console.error);

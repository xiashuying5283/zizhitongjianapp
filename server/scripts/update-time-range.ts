/**
 * 从 ziyexing HTML 文件中提取 time_range 并更新数据库
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const HTML_DIR = path.join(__dirname, '../../data/html/ziyexing');

/**
 * 从 HTML 文件中提取 time_range
 */
function extractTimeRange(volumeNumber: number): string | null {
  const fileName = `zizhitongjian_${volumeNumber.toString().padStart(3, '0')}.htm`;
  const filePath = path.join(HTML_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`  文件不存在: ${fileName}`);
    return null;
  }

  try {
    // 读取文件并转换为 UTF-8
    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, 'gb18030');

    // 模式1: 起XXX，尽XXX，凡XX年
    const match1 = content.match(/起[^，]+，尽[^，]+，凡[^。<]+/);
    if (match1) {
      return match1[0];
    }

    // 模式2: 起XXX（XX）X月，尽X月，不满一年
    const match2 = content.match(/起[^，]+，尽[^，]+，不满一年/);
    if (match2) {
      return match2[0];
    }

    // 模式3: 起XXX，尽XXX，一年有奇
    const match3 = content.match(/起[^，]+，尽[^，]+，一年有奇/);
    if (match3) {
      return match3[0];
    }

    // 模式4: 起XXX，尽XXX，凡X年
    const match4 = content.match(/起[^，]+，尽[^，]+，凡[^年]+年/);
    if (match4) {
      return match4[0];
    }

    // 模式5: 〔強圉作噩（丁酉），一年。〕格式
    // 匹配类似 〔XXX（XX），X年。〕 的格式，排除胡三省注
    const allBrackets = content.match(/〔[^〕]{5,40}〕/g);
    if (allBrackets) {
      for (const bracket of allBrackets) {
        // 排除胡三省注和北宋司马光等
        if (!bracket.includes('胡三省注') && 
            !bracket.includes('司马光') && 
            !bracket.includes('共294卷') &&
            bracket.includes('年')) {
          // 提取内容
          const inner = bracket.slice(1, -1); // 去掉〔和〕
          return inner;
        }
      }
      
      // 如果上面没找到，尝试从胡三省注中提取（格式：〔〖胡三省注〗XXX，一年。〕）
      for (const bracket of allBrackets) {
        if (bracket.includes('〖胡三省注〗') && bracket.includes('年')) {
          // 提取胡三省注后面的内容
          const match = bracket.match(/〖胡三省注〗([^〕]+年)/);
          if (match) {
            return match[1];
          }
        }
      }
    }

    console.log(`  未找到 time_range`);
    return null;
  } catch (error) {
    console.error(`  读取文件失败: ${error}`);
    return null;
  }
}

async function main() {
  console.log('========== 开始更新 time_range ==========\n');

  // 获取缺少 time_range 的卷
  const result = await pool.query(
    'SELECT volume_number, volume_name FROM zizhitongjian_volumes WHERE time_range IS NULL OR time_range = \'\' ORDER BY volume_number'
  );

  console.log(`共 ${result.rows.length} 卷需要更新\n`);

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const row of result.rows) {
    const { volume_number, volume_name } = row;
    console.log(`[${volume_number}] ${volume_name}`);

    const timeRange = extractTimeRange(volume_number);

    if (timeRange) {
      try {
        await pool.query(
          'UPDATE zizhitongjian_volumes SET time_range = $1 WHERE volume_number = $2',
          [timeRange, volume_number]
        );
        console.log(`  ✓ 更新成功: ${timeRange}\n`);
        updated++;
      } catch (error) {
        console.error(`  ✗ 更新失败: ${error}\n`);
        failed++;
      }
    } else {
      notFound++;
    }
  }

  console.log('\n========== 更新完成 ==========');
  console.log(`总计: ${result.rows.length} 卷`);
  console.log(`成功: ${updated}`);
  console.log(`未找到: ${notFound}`);
  console.log(`失败: ${failed}`);

  await pool.end();
}

main().catch(console.error);

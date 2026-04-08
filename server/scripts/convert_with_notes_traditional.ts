/**
 * 转换 with_notes 为繁体
 * 
 * 运行方式：npx tsx scripts/convert_with_notes_traditional.ts
 */

import { Pool } from 'pg';
import * as OpenCC from 'opencc-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 简体转繁体转换器
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

const BATCH_SIZE = 500;

async function convertWithNotesTraditional() {
  console.log('开始转换 with_notes 为繁体...');
  console.log('开始时间:', new Date().toLocaleString());

  try {
    // 获取总记录数
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM zizhitongjian_paragraphs
      WHERE with_notes IS NOT NULL 
      AND with_notes != ''
      AND with_notes_traditional IS NULL
    `);
    
    const total = parseInt(countResult.rows[0].total);
    console.log(`待转换记录数: ${total}`);

    if (total === 0) {
      console.log('所有记录已转换完成');
      return;
    }

    let converted = 0;
    let offset = 0;

    while (offset < total) {
      // 获取一批记录
      const { rows } = await pool.query(`
        SELECT id, with_notes
        FROM zizhitongjian_paragraphs
        WHERE with_notes IS NOT NULL 
        AND with_notes != ''
        AND with_notes_traditional IS NULL
        ORDER BY id
        LIMIT $1
      `, [BATCH_SIZE]);

      if (rows.length === 0) break;

      // 转换并更新
      for (const row of rows) {
        try {
          const traditional = converter(row.with_notes);
          await pool.query(
            'UPDATE zizhitongjian_paragraphs SET with_notes_traditional = $1 WHERE id = $2',
            [traditional, row.id]
          );
          converted++;
        } catch (err) {
          console.error(`转换记录 ${row.id} 失败:`, err);
        }
      }

      offset += rows.length;
      
      if (converted % 2000 === 0) {
        console.log(`已转换: ${converted}/${total} (${((converted/total)*100).toFixed(1)}%)`);
      }
    }

    console.log(`\n转换完成！共转换 ${converted} 条记录`);
    console.log('结束时间:', new Date().toLocaleString());

  } catch (error) {
    console.error('转换失败:', error);
  } finally {
    await pool.end();
  }
}

convertWithNotesTraditional();

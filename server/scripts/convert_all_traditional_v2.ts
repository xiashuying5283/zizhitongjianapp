/**
 * 转换所有缺失的 content 和 translation 为繁体
 */

import { Pool } from 'pg';
import * as OpenCC from 'opencc-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

async function convertAllTraditional() {
  console.log('开始转换...');
  console.log('开始时间:', new Date().toLocaleString());

  try {
    // 获取所有缺失的记录 ID
    const { rows: missingContent } = await pool.query(`
      SELECT id FROM zizhitongjian_paragraphs 
      WHERE content_traditional IS NULL
      ORDER BY id
    `);
    
    console.log(`缺失 content_traditional: ${missingContent.length} 条`);

    // 转换 content_traditional
    let count = 0;
    for (const row of missingContent) {
      const { rows } = await pool.query(
        'SELECT content FROM zizhitongjian_paragraphs WHERE id = $1',
        [row.id]
      );
      
      if (rows[0]?.content) {
        const traditional = converter(rows[0].content);
        await pool.query(
          'UPDATE zizhitongjian_paragraphs SET content_traditional = $1 WHERE id = $2',
          [traditional, row.id]
        );
        count++;
        
        if (count % 1000 === 0) {
          console.log(`content_traditional 已转换: ${count}/${missingContent.length}`);
        }
      }
    }
    console.log(`content_traditional 转换完成: ${count} 条`);

    // 获取所有缺失 translation_traditional 的记录
    const { rows: missingTranslation } = await pool.query(`
      SELECT id FROM zizhitongjian_paragraphs 
      WHERE translation IS NOT NULL AND translation_traditional IS NULL
      ORDER BY id
    `);
    
    console.log(`缺失 translation_traditional: ${missingTranslation.length} 条`);

    // 转换 translation_traditional
    count = 0;
    for (const row of missingTranslation) {
      const { rows } = await pool.query(
        'SELECT translation FROM zizhitongjian_paragraphs WHERE id = $1',
        [row.id]
      );
      
      if (rows[0]?.translation) {
        const traditional = converter(rows[0].translation);
        await pool.query(
          'UPDATE zizhitongjian_paragraphs SET translation_traditional = $1 WHERE id = $2',
          [traditional, row.id]
        );
        count++;
        
        if (count % 1000 === 0) {
          console.log(`translation_traditional 已转换: ${count}/${missingTranslation.length}`);
        }
      }
    }
    console.log(`translation_traditional 转换完成: ${count} 条`);

    console.log('\n全部转换完成！');
    console.log('结束时间:', new Date().toLocaleString());

  } catch (error) {
    console.error('转换失败:', error);
  } finally {
    await pool.end();
  }
}

convertAllTraditional();

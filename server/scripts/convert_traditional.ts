/**
 * 将段落内容转换为繁体
 * 使用 OpenCC 进行简繁转换
 * 
 * 使用方法：npx tsx scripts/convert_traditional.ts <开始卷号> <结束卷号>
 * 示例：npx tsx scripts/convert_traditional.ts 1 10
 */

import { Pool } from 'pg';
import { Converter } from 'opencc-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 简体转繁体转换器
const converter = Converter({ from: 'cn', to: 'tw' });

async function convertVolumes(startVolume: number, endVolume: number) {
  console.log(`开始转换第 ${startVolume}-${endVolume} 卷为繁体...`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  let totalConverted = 0;

  for (let volume = startVolume; volume <= endVolume; volume++) {
    // 获取该卷所有段落
    const result = await pool.query(
      `SELECT id, content, translation 
       FROM zizhitongjian_paragraphs 
       WHERE volume_number = $1 
       ORDER BY id`,
      [volume]
    );

    const paragraphs = result.rows;
    
    if (paragraphs.length === 0) {
      console.log(`第 ${volume} 卷没有数据，跳过`);
      continue;
    }

    console.log(`第 ${volume} 卷共 ${paragraphs.length} 个段落`);

    // 批量更新
    for (const p of paragraphs) {
      const contentTraditional = converter(p.content || '');
      const translationTraditional = p.translation ? converter(p.translation) : null;

      await pool.query(
        `UPDATE zizhitongjian_paragraphs 
         SET content_traditional = $1, translation_traditional = $2 
         WHERE id = $3`,
        [contentTraditional, translationTraditional, p.id]
      );
      totalConverted++;
    }

    console.log(`第 ${volume} 卷转换完成`);
  }

  console.log(`\n转换完成！共转换 ${totalConverted} 条段落`);
  console.log(`结束时间: ${new Date().toLocaleString()}`);
  
  await pool.end();
}

// 解析命令行参数
const startVolume = parseInt(process.argv[2]) || 1;
const endVolume = parseInt(process.argv[3]) || 10;

convertVolumes(startVolume, endVolume).catch(console.error);

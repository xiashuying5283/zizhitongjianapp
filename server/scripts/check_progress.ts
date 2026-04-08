import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkProgress() {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM (
        SELECT volume_number FROM zizhitongjian_paragraphs 
        GROUP BY volume_number
        HAVING COUNT(CASE WHEN translation IS NOT NULL AND translation != '' AND translation != '翻译失败' AND translation != '翻译中' THEN 1 END) = COUNT(*)
      ) t) as completed,
      (SELECT COUNT(DISTINCT volume_number) FROM zizhitongjian_paragraphs) as total,
      (SELECT COUNT(*) FROM zizhitongjian_paragraphs WHERE translation = '翻译中') as in_progress_count,
      (SELECT COUNT(*) FROM zizhitongjian_paragraphs WHERE translation = '翻译失败') as failed_count
  `);
  
  const { completed, total, in_progress_count, failed_count } = result.rows[0];
  
  console.log('========================================');
  console.log('资治通鉴翻译进度报告');
  console.log('========================================');
  console.log(`时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`总卷数: ${total}`);
  console.log(`已完成: ${completed} 卷 (${((completed / total) * 100).toFixed(1)}%)`);
  console.log(`进行中: ${in_progress_count} 个段落`);
  console.log(`失败: ${failed_count} 个段落`);
  console.log(`剩余: ${total - completed} 卷`);
  console.log('========================================');
  
  await pool.end();
}

checkProgress().catch(console.error);

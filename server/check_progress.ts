import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkProgress() {
  // 查看paragraphs表结构
  const tableInfo = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'zizhitongjian_paragraphs'
    ORDER BY ordinal_position
  `);
  console.log('paragraphs表结构:', tableInfo.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
  
  // 检查翻译进度
  const progress = await pool.query(`
    SELECT 
      COUNT(DISTINCT volume_number) as total_volumes,
      COUNT(DISTINCT CASE WHEN translation IS NOT NULL AND translation != '' THEN volume_number END) as translated_volumes
    FROM zizhitongjian_paragraphs
  `);
  console.log('\n翻译进度:', JSON.stringify(progress.rows[0], null, 2));
  
  // 获取已翻译的卷号
  const translated = await pool.query(`
    SELECT DISTINCT volume_number 
    FROM zizhitongjian_paragraphs 
    WHERE translation IS NOT NULL AND translation != ''
    ORDER BY volume_number
  `);
  console.log('\n已翻译卷号:', translated.rows.map(r => r.volume_number).join(', '));
  
  // 获取未翻译的卷号
  const untranslated = await pool.query(`
    SELECT DISTINCT volume_number 
    FROM zizhitongjian_paragraphs 
    WHERE translation IS NULL OR translation = ''
    ORDER BY volume_number
  `);
  console.log('\n未翻译卷号:', untranslated.rows.map(r => r.volume_number).join(', '));
  
  await pool.end();
}

checkProgress().catch(console.error);

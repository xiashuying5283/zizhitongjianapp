/**
 * 翻译缺失的现代文翻译 - 使用 OpenAI API
 * 用法: npx tsx scripts/translate_missing.ts
 */

import OpenAI from 'openai';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface MissingTranslation {
  table_name: string;
  id: number;
  original_text: string;
  context?: string;
}

/**
 * 使用 OpenAI 翻译
 */
async function translate(text: string, context?: string): Promise<string> {
  const systemPrompt = `你是一位精通古文的学者，专门负责将文言文翻译成现代汉语。
翻译要求：
1. 保持原文的语义和情感
2. 使用流畅的现代汉语表达
3. 保留重要的人名、地名、官职名`;

  const userPrompt = context 
    ? `背景：${context}\n\n请翻译：\n${text}`
    : `请翻译：\n${text}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * 查找缺失翻译的记录
 */
async function findMissingTranslations(): Promise<MissingTranslation[]> {
  const missing: MissingTranslation[] = [];

  // 检查 volumes 表
  const volumesResult = await pool.query(`
    SELECT id, original_text, title, volume_number
    FROM volumes 
    WHERE modern_translation IS NULL OR modern_translation = ''
    LIMIT 50
  `);
  
  for (const row of volumesResult.rows) {
    missing.push({
      table_name: 'volumes',
      id: row.id,
      original_text: row.original_text,
      context: `《资治通鉴》卷${row.volume_number}：${row.title}`,
    });
  }

  // 检查 paragraphs 表（如果存在）
  try {
    const paragraphsResult = await pool.query(`
      SELECT id, original_text, volume_id
      FROM paragraphs 
      WHERE modern_translation IS NULL OR modern_translation = ''
      LIMIT 50
    `);
    
    for (const row of paragraphsResult.rows) {
      missing.push({
        table_name: 'paragraphs',
        id: row.id,
        original_text: row.original_text,
        context: `段落 ID: ${row.volume_id}`,
      });
    }
  } catch {
    // 表可能不存在
  }

  return missing;
}

/**
 * 更新翻译
 */
async function updateTranslation(item: MissingTranslation, translation: string) {
  if (item.table_name === 'volumes') {
    await pool.query(
      'UPDATE volumes SET modern_translation = $1, updated_at = NOW() WHERE id = $2',
      [translation, item.id]
    );
  } else if (item.table_name === 'paragraphs') {
    await pool.query(
      'UPDATE paragraphs SET modern_translation = $1, updated_at = NOW() WHERE id = $2',
      [translation, item.id]
    );
  }
}

async function main() {
  try {
    console.log('查找缺失翻译...');
    
    const missing = await findMissingTranslations();
    console.log(`找到 ${missing.length} 条需要翻译`);

    let success = 0;
    let failed = 0;

    for (const item of missing) {
      console.log(`正在翻译: ${item.table_name}#${item.id}`);
      
      try {
        const translation = await translate(item.original_text, item.context);
        await updateTranslation(item, translation);
        success++;
        console.log(`✓ 完成`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failed++;
        console.error(`✗ 失败:`, error);
      }
    }

    console.log(`\n完成！成功: ${success}, 失败: ${failed}`);
  } catch (error) {
    console.error('执行出错:', error);
  } finally {
    await pool.end();
  }
}

main();

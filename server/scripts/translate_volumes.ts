/**
 * 批量翻译资治通鉴卷内容 - 使用 OpenAI API
 * 用法: npx tsx scripts/translate_volumes.ts
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

/**
 * 使用 OpenAI 翻译文言文为现代文
 */
async function translateToModern(text: string, context: string = ''): Promise<string> {
  const systemPrompt = `你是一位精通古文的学者，专门负责将文言文翻译成现代汉语。
翻译要求：
1. 保持原文的语义和情感
2. 使用流畅的现代汉语表达
3. 保留重要的人名、地名、官职名，必要时加注释
4. 对于典故，可以适当添加简短解释
5. 保持译文的可读性和准确性`;

  const userPrompt = context 
    ? `背景：${context}\n\n请翻译以下文言文：\n${text}`
    : `请翻译以下文言文：\n${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
}

/**
 * 获取所有需要翻译的卷
 */
async function getVolumesNeedingTranslation() {
  const result = await pool.query(`
    SELECT id, volume_number, title, original_text 
    FROM volumes 
    WHERE modern_translation IS NULL OR modern_translation = ''
    ORDER BY volume_number
  `);
  return result.rows;
}

/**
 * 更新卷的翻译
 */
async function updateTranslation(id: number, translation: string) {
  await pool.query(
    'UPDATE volumes SET modern_translation = $1, updated_at = NOW() WHERE id = $2',
    [translation, id]
  );
}

async function main() {
  try {
    console.log('开始批量翻译...');
    
    const volumes = await getVolumesNeedingTranslation();
    console.log(`找到 ${volumes.length} 卷需要翻译`);

    for (const volume of volumes) {
      console.log(`正在翻译: 卷${volume.volume_number} - ${volume.title}`);
      
      try {
        const translation = await translateToModern(
          volume.original_text,
          `《资治通鉴》卷${volume.volume_number}：${volume.title}`
        );
        
        await updateTranslation(volume.id, translation);
        console.log(`✓ 完成: 卷${volume.volume_number}`);
        
        // 避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`✗ 失败: 卷${volume.volume_number}`, error);
      }
    }

    console.log('批量翻译完成！');
  } catch (error) {
    console.error('执行出错:', error);
  } finally {
    await pool.end();
  }
}

main();

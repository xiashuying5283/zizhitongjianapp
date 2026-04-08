/**
 * 翻译缺失的 translation 字段
 * 自动查找并翻译所有 translation 为空的段落
 */

import { Pool } from 'pg';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import * as OpenCC from 'opencc-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const config = new Config();
const llmClient = new LLMClient(config);
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

// 翻译系统提示词
const TRANSLATE_SYSTEM_PROMPT = `你是一位精通文言文和现代汉语的翻译专家。请将《资治通鉴》的文言文段落翻译为现代白话文。

翻译要求：
1. 准确传达原文含义，不添加个人理解
2. 保持历史人物和地名的准确性
3. 语言流畅自然，符合现代汉语表达习惯
4. 保留原文的句式结构和逻辑关系
5. 对于专有名词（人名、地名、官职），首次出现时可用括号标注现代对应名称
6. 直接输出翻译结果，不要添加任何解释或说明

示例：
原文：初命晋大夫魏斯、赵籍、韩虔为诸侯。
译文：起初任命晋国大夫魏斯、赵籍、韩虔为诸侯。`;

/**
 * 翻译单个段落
 */
async function translateParagraph(original: string): Promise<string> {
  const messages = [
    { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
    { role: 'user', content: `请翻译以下文言文：\n\n${original}` },
  ];

  try {
    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.3,
    });

    return response.content.trim();
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
}

/**
 * 主函数：翻译所有缺失的段落
 */
async function main() {
  console.log('开始查找缺失翻译的段落...\n');

  // 查询所有 translation 为空的段落
  const result = await pool.query(`
    SELECT id, volume_number, content 
    FROM zizhitongjian_paragraphs 
    WHERE translation IS NULL OR translation = ''
    ORDER BY volume_number, id
  `);

  const paragraphs = result.rows;

  if (paragraphs.length === 0) {
    console.log('没有需要翻译的段落');
    await pool.end();
    return;
  }

  console.log(`找到 ${paragraphs.length} 个需要翻译的段落\n`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  // 按卷统计
  const volumeStats: { [key: number]: number } = {};
  for (const p of paragraphs) {
    volumeStats[p.volume_number] = (volumeStats[p.volume_number] || 0) + 1;
  }
  console.log('分布情况:');
  for (const [vol, count] of Object.entries(volumeStats)) {
    console.log(`  卷${vol}: ${count} 段`);
  }
  console.log('');

  let totalTranslated = 0;
  let totalFailed = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const progress = `[${i + 1}/${paragraphs.length}]`;

    console.log(`${progress} 翻译段落 ID=${p.id} (卷${p.volume_number})...`);

    try {
      // 翻译简体版本
      const translation = await translateParagraph(p.content);
      
      // 生成繁体版本
      const translationTraditional = converter(translation);

      // 更新数据库
      await pool.query(
        'UPDATE zizhitongjian_paragraphs SET translation = $1, translation_traditional = $2 WHERE id = $3',
        [translation, translationTraditional, p.id]
      );

      totalTranslated++;
      console.log(`${progress} 完成 ✓`);

      // 添加延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`${progress} 失败:`, error);
      totalFailed++;
    }
  }

  console.log('\n========== 翻译完成 ==========');
  console.log(`结束时间: ${new Date().toLocaleString()}`);
  console.log(`成功翻译: ${totalTranslated}`);
  console.log(`失败: ${totalFailed}`);

  await pool.end();
}

main().catch(console.error);

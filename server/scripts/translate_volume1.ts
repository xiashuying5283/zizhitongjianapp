/**
 * 翻译资治通鉴第一卷
 * 使用 LLM 将文言文翻译为现代白话文
 */

import { Pool } from 'pg';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const config = new Config();
const llmClient = new LLMClient(config);

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
      model: 'doubao-seed-1-6-251015', // 使用平衡模型
      temperature: 0.3, // 低温度保证翻译准确性
    });

    return response.content.trim();
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const volumeNumber = 2;

  console.log(`开始翻译第 ${volumeNumber} 卷...\n`);

  // 获取所有段落
  const result = await pool.query(
    `SELECT id, content, translation 
     FROM zizhitongjian_paragraphs 
     WHERE volume_number = $1 
     ORDER BY id`,
    [volumeNumber]
  );

  const paragraphs = result.rows;
  console.log(`共 ${paragraphs.length} 个段落需要处理\n`);

  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    // 如果已有翻译，跳过
    if (p.translation && p.translation.trim().length > 0) {
      console.log(`[${i + 1}/${paragraphs.length}] 段落 ${p.id} 已有翻译，跳过`);
      skipped++;
      continue;
    }

    // 跳过空内容
    if (!p.content || p.content.trim().length === 0) {
      console.log(`[${i + 1}/${paragraphs.length}] 段落 ${p.id} 内容为空，跳过`);
      skipped++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${paragraphs.length}] 正在翻译段落 ${p.id}...`);
      console.log(`原文: ${p.content.substring(0, 50)}...`);

      const translation = await translateParagraph(p.content);

      console.log(`译文: ${translation.substring(0, 50)}...`);

      // 更新数据库
      await pool.query(
        'UPDATE zizhitongjian_paragraphs SET translation = $1 WHERE id = $2',
        [translation, p.id]
      );

      translated++;
      console.log(`✓ 完成\n`);

      // 添加延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`✗ 段落 ${p.id} 翻译失败:`, error);
      failed++;
    }
  }

  console.log('\n========== 翻译完成 ==========');
  console.log(`总计: ${paragraphs.length} 个段落`);
  console.log(`成功: ${translated}`);
  console.log(`跳过: ${skipped}`);
  console.log(`失败: ${failed}`);

  await pool.end();
}

main().catch(console.error);

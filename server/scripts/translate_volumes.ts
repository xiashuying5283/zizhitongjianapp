/**
 * 翻译资治通鉴指定卷号范围
 * 使用 LLM 将文言文翻译为现代白话文
 * 
 * 使用方法：npx tsx scripts/translate_volumes.ts <开始卷号> <结束卷号>
 * 示例：npx tsx scripts/translate_volumes.ts 3 100
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
 * 翻译指定卷号范围
 */
async function translateVolumes(startVolume: number, endVolume: number) {
  console.log(`开始翻译第 ${startVolume}-${endVolume} 卷...\n`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  let totalTranslated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let volume = startVolume; volume <= endVolume; volume++) {
    console.log(`\n========== 处理第 ${volume} 卷 ==========\n`);

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
      console.log(`第 ${volume} 卷没有数据，跳过\n`);
      continue;
    }

    console.log(`第 ${volume} 卷共 ${paragraphs.length} 个段落\n`);

    let volumeTranslated = 0;
    let volumeSkipped = 0;
    let volumeFailed = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];

      // 如果已有翻译，跳过
      if (p.translation && p.translation.trim().length > 0) {
        volumeSkipped++;
        continue;
      }

      // 跳过空内容
      if (!p.content || p.content.trim().length === 0) {
        volumeSkipped++;
        continue;
      }

      try {
        const translation = await translateParagraph(p.content);

        // 更新数据库
        await pool.query(
          'UPDATE zizhitongjian_paragraphs SET translation = $1 WHERE id = $2',
          [translation, p.id]
        );

        volumeTranslated++;
        totalTranslated++;

        // 每10个段落输出一次进度
        if (volumeTranslated % 10 === 0) {
          console.log(`[卷${volume}] 已翻译 ${volumeTranslated}/${paragraphs.length - volumeSkipped} 个段落`);
        }

        // 添加延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[卷${volume}] 段落 ${p.id} 翻译失败:`, error);
        volumeFailed++;
        totalFailed++;
      }
    }

    console.log(`\n第 ${volume} 卷完成: 翻译 ${volumeTranslated}, 跳过 ${volumeSkipped}, 失败 ${volumeFailed}`);
  }

  console.log('\n========== 全部翻译完成 ==========');
  console.log(`结束时间: ${new Date().toLocaleString()}`);
  console.log(`总计翻译: ${totalTranslated}`);
  console.log(`总计跳过: ${totalSkipped}`);
  console.log(`总计失败: ${totalFailed}`);

  await pool.end();
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: npx tsx scripts/translate_volumes.ts <开始卷号> <结束卷号>');
    console.log('示例: npx tsx scripts/translate_volumes.ts 3 100');
    process.exit(1);
  }

  const startVolume = parseInt(args[0], 10);
  const endVolume = parseInt(args[1], 10);

  if (isNaN(startVolume) || isNaN(endVolume) || startVolume < 1 || endVolume < startVolume) {
    console.error('无效的卷号范围');
    process.exit(1);
  }

  await translateVolumes(startVolume, endVolume);
}

main().catch(console.error);

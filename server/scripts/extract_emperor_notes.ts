/**
 * 从 HTML 文件中提取帝王胡三省注并更新到 era_years 表
 * 
 * 用法: npx tsx scripts/extract_emperor_notes.ts
 * 
 * 逻辑：
 * 1. 从 HTML 中提取帝王名和注解
 * 2. 匹配到对应的年号元年（该帝王第一个年号的第一年）
 * 3. 更新 era_years 表中对应记录的 note 字段
 */

import * as cheerio from 'cheerio';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_DIR = path.join(__dirname, '..', 'data', 'html');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 南朝宋齐梁陈和隋的卷范围
const VOLUMES_TO_PROCESS = [
  { dynasty: '宋', volumes: [119, 134] },
  { dynasty: '齐', volumes: [135, 144] },
  { dynasty: '梁', volumes: [145, 168] },
  { dynasty: '陈', volumes: [169, 176] },
  { dynasty: '隋', volumes: [177, 184] },
];

// 帝王名到年号的映射
// 格式: "帝王称号:卷号" -> { eraName: 年号, emperorName: 帝王姓名 }
const EMPEROR_TO_FIRST_ERA: Record<string, { eraName: string; emperorName: string }> = {
  // 宋 (卷119-134)
  '高祖武皇帝:119': { eraName: '永初', emperorName: '刘裕' },
  '少帝:119': { eraName: '景平', emperorName: '刘义符' },
  '营阳王:119': { eraName: '景平', emperorName: '刘义符' },
  '太祖文皇帝:120': { eraName: '元嘉', emperorName: '刘义隆' },
  '世祖孝武皇帝:126': { eraName: '孝建', emperorName: '刘骏' },
  '前废帝:130': { eraName: '永光', emperorName: '刘子业' },
  '太宗明皇帝:130': { eraName: '泰始', emperorName: '刘彧' },
  '后废帝:133': { eraName: '元徽', emperorName: '刘昱' },
  '苍梧王:133': { eraName: '元徽', emperorName: '刘昱' },
  '顺皇帝:134': { eraName: '升明', emperorName: '刘准' },

  // 齐 (卷135-144)
  '太祖高皇帝:135': { eraName: '建元', emperorName: '萧道成' },
  '世祖武皇帝:135': { eraName: '永明', emperorName: '萧赜' },  // 卷135也有提到
  '世祖武皇帝:138': { eraName: '永明', emperorName: '萧赜' },
  '郁林王:142': { eraName: '隆昌', emperorName: '萧昭业' },
  '海陵王:142': { eraName: '延兴', emperorName: '萧昭文' },
  '高宗明皇帝:139': { eraName: '建武', emperorName: '萧鸾' },
  '高宗明皇帝:142': { eraName: '建武', emperorName: '萧鸾' },
  '东昏侯:142': { eraName: '永元', emperorName: '萧宝卷' },  // 添加卷142
  '东昏侯:144': { eraName: '永元', emperorName: '萧宝卷' },
  '和皇帝:144': { eraName: '中兴', emperorName: '萧宝融' },

  // 梁 (卷145-168)
  '高祖武皇帝:145': { eraName: '天监', emperorName: '萧衍' },
  '太宗简文皇帝:162': { eraName: '大宝', emperorName: '萧纲' },
  '世祖孝元皇帝:164': { eraName: '承圣', emperorName: '萧绎' },
  '敬皇帝:166': { eraName: '绍泰', emperorName: '萧方智' },
  '敬皇帝:167': { eraName: '绍泰', emperorName: '萧方智' },

  // 陈 (卷169-176)
  '高祖武皇帝:169': { eraName: '永定', emperorName: '陈霸先' },
  '世祖文皇帝:168': { eraName: '天嘉', emperorName: '陈蒨' },
  '世祖文皇帝:171': { eraName: '天嘉', emperorName: '陈蒨' },
  '废帝:173': { eraName: '光大', emperorName: '陈伯宗' },
  '临海王:170': { eraName: '光大', emperorName: '陈伯宗' },
  '高宗孝宣皇帝:173': { eraName: '太建', emperorName: '陈顼' },
  '高宗宣皇帝:170': { eraName: '太建', emperorName: '陈顼' },
  '长城公:175': { eraName: '至德', emperorName: '陈叔宝' },

  // 隋 (卷177-184)
  '高祖文皇帝:177': { eraName: '开皇', emperorName: '杨坚' },
  '炀皇帝:180': { eraName: '大业', emperorName: '杨广' },
  '恭皇帝:183': { eraName: '义宁', emperorName: '杨侑' },
  '恭皇帝:184': { eraName: '义宁', emperorName: '杨侑' },
};

interface EmperorNote {
  emperorTitle: string;  // 帝王称号，如"高祖武皇帝"
  note: string;          // 胡三省注
  volumeNum: number;     // 所在卷号
}

/**
 * 标准化帝王称号（去掉分卷后缀）
 */
function normalizeEmperorTitle(title: string): string {
  let normalized = title;
  // 去掉分卷后缀（上、下、中、上之上、上之下、下之上等）
  normalized = normalized.replace(/[上下中之]+$/, '');
  // 去掉天干分卷标记（甲乙丙丁戊己庚辛壬癸）
  normalized = normalized.replace(/[甲乙丙丁戊己庚辛壬癸]$/, '');
  // 去掉数字分卷标记（一二三四五六七八九十）
  normalized = normalized.replace(/[一二三四五六七八九十]$/, '');
  return normalized;
}

/**
 * 从 HTML 文件中提取帝王注解
 */
function extractEmperorNotes(html: string, volumeNum: number): EmperorNote[] {
  const $ = cheerio.load(html);
  const notes: EmperorNote[] = [];

  // 格式1: <dl><dd><b>帝王名</b><small>注解</small></dd></dl> (宋、陈等)
  $('dl > dd').each((_, dd) => {
    const $dd = $(dd);
    const $b = $dd.find('b').first();
    const $small = $dd.find('small[style*="996666"]').first();

    if ($b.length && $small.length) {
      const emperorTitle = normalizeEmperorTitle($b.text().trim());
      const fullSmallText = $small.text().trim();

      // 提取注解内容（去掉隐形括号标记）
      const noteMatch = fullSmallText.match(/[〈《]?(.+?)[〉》]?$/);
      let note = noteMatch ? noteMatch[1].trim() : fullSmallText;

      // 只保留帝王名讳注解（以"讳"开头或包含姓氏说明）
      if (note.startsWith('讳') || (note.includes('姓') && note.includes('氏'))) {
        notes.push({ emperorTitle, note, volumeNum });
      }
    }
  });

  // 格式2: <p><b>帝王名</b><small>注解</small></p> (齐、梁、隋等)
  $('p').each((_, p) => {
    const $p = $(p);
    const $b = $p.find('b').first();
    const $small = $p.find('small[style*="996666"]').first();

    if ($b.length && $small.length) {
      const emperorTitle = normalizeEmperorTitle($b.text().trim());
      const fullSmallText = $small.text().trim();

      // 提取注解内容
      const noteMatch = fullSmallText.match(/[〈《]?(.+?)[〉》]?$/);
      let note = noteMatch ? noteMatch[1].trim() : fullSmallText;

      // 只保留帝王名讳注解
      if (note.startsWith('讳') || (note.includes('姓') && note.includes('氏'))) {
        notes.push({ emperorTitle, note, volumeNum });
      }
    }
  });

  return notes;
}

/**
 * 处理单个 HTML 文件
 */
async function processVolume(volumeNum: number): Promise<EmperorNote[]> {
  const filePath = path.join(HTML_DIR, `vol_${String(volumeNum).padStart(3, '0')}.html`);

  if (!fs.existsSync(filePath)) {
    console.log(`文件不存在: ${filePath}`);
    return [];
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  return extractEmperorNotes(html, volumeNum);
}

/**
 * 更新 era_years 表
 */
async function updateEraYears(notes: EmperorNote[]): Promise<number> {
  let updatedCount = 0;

  for (const { emperorTitle, note, volumeNum } of notes) {
    // 构建匹配键（帝王称号:卷号）
    // 尝试在当前卷和前后几卷的范围内查找
    let mapping: { eraName: string; emperorName: string } | undefined;

    for (let vol = volumeNum; vol >= volumeNum - 5 && vol >= 119; vol--) {
      const key = `${emperorTitle}:${vol}`;
      if (EMPEROR_TO_FIRST_ERA[key]) {
        mapping = EMPEROR_TO_FIRST_ERA[key];
        break;
      }
    }

    if (!mapping) {
      console.log(`  未找到年号映射: ${emperorTitle} (卷${volumeNum})`);
      continue;
    }

    const { eraName, emperorName } = mapping;

    // 更新该年号元年的 note（同时匹配 era_name 和 emperor_name）
    const result = await pool.query(`
      UPDATE era_years 
      SET note = $1 
      WHERE era_name = $2 AND year_in_era = 1 AND emperor_name = $3
    `, [note, eraName, emperorName]);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`  ✓ ${emperorTitle} → ${eraName}元年(${emperorName}): ${note.substring(0, 30)}...`);
      updatedCount++;
    } else {
      // 如果找不到，尝试只匹配 era_name
      const fallbackResult = await pool.query(`
        UPDATE era_years 
        SET note = $1 
        WHERE era_name = $2 AND year_in_era = 1
      `, [note, eraName]);

      if (fallbackResult.rowCount && fallbackResult.rowCount > 0) {
        console.log(`  ✓ ${emperorTitle} → ${eraName}元年: ${note.substring(0, 30)}... (仅匹配年号)`);
        updatedCount++;
      } else {
        console.log(`  ✗ 未找到年号记录: ${eraName}元年 (${emperorName})`);
      }
    }
  }

  return updatedCount;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始提取帝王胡三省注...\n');

  let allNotes: EmperorNote[] = [];

  // 遍历所有需要处理的卷
  for (const { dynasty, volumes } of VOLUMES_TO_PROCESS) {
    console.log(`\n处理${dynasty}朝 (卷${volumes[0]}-${volumes[1]}):`);

    for (let vol = volumes[0]; vol <= volumes[1]; vol++) {
      const notes = await processVolume(vol);
      if (notes.length > 0) {
        console.log(`  卷${vol}: 找到 ${notes.length} 条帝王注`);
        allNotes = allNotes.concat(notes);
      }
    }
  }

  console.log(`\n共提取 ${allNotes.length} 条帝王注\n`);

  // 去重（同一个帝王可能出现在多卷）
  const uniqueNotes = new Map<string, EmperorNote>();
  for (const note of allNotes) {
    // 保留第一次出现的注解
    if (!uniqueNotes.has(note.emperorTitle)) {
      uniqueNotes.set(note.emperorTitle, note);
    }
  }

  console.log(`去重后 ${uniqueNotes.size} 条\n`);

  // 更新数据库
  console.log('更新 era_years 表:\n');
  const updatedCount = await updateEraYears(Array.from(uniqueNotes.values()));

  console.log(`\n完成！更新了 ${updatedCount} 条记录`);

  await pool.end();
}

main().catch(console.error);

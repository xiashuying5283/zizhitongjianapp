/**
 * 生成年号逐年展开表
 * 将 era_names 表的数据逐年展开到 era_years 表
 * 同时迁移 note 字段
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 天干
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 地支
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 计算干支
 * 公元4年为甲子年
 * 公元前年份需要特殊处理
 */
function getGanZhi(year: number): string {
  // 公元4年为甲子年（天干索引0，地支索引0）
  // 公元前1年为庚申年
  let ganIndex: number;
  let zhiIndex: number;
  
  if (year > 0) {
    // 公元后
    ganIndex = (year - 4) % 10;
    zhiIndex = (year - 4) % 12;
  } else {
    // 公元前
    // 公元前1年 = 庚申 (6, 8)
    // 公元前2年 = 己未 (5, 7)
    // 公元前n年: 
    //   天干 = (1 - n - 4) mod 10 = (-n - 3) mod 10 = (7 - n) mod 10
    //   地支 = (1 - n - 4) mod 12 = (-n - 3) mod 12 = (9 - n) mod 12
    const n = -year;
    ganIndex = ((7 - n) % 10 + 10) % 10;
    zhiIndex = ((9 - n) % 12 + 12) % 12;
  }
  
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/**
 * 数字转中文
 */
function numberToChinese(num: number): string {
  if (num === 1) return '元';
  
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  
  if (num === 10) {
    return '十';
  } else if (num < 10) {
    return digits[num];
  } else if (num < 20) {
    return '十' + digits[num - 10];
  } else if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    if (ones === 0) {
      return digits[tens] + '十';
    } else {
      return digits[tens] + '十' + digits[ones];
    }
  }
  
  return String(num);
}

/**
 * 无年号时期的分期定义
 */
interface EraPhase {
  name: string;       // 阶段名：前/中/后
  startYear: number;  // 开始年份
  endYear: number;    // 结束年份
}

const SPECIAL_ERAS: Record<string, EraPhase[]> = {
  '文帝': [
    { name: '前', startYear: -179, endYear: -164 },
    { name: '后', startYear: -163, endYear: -157 },
  ],
  '景帝': [
    { name: '前', startYear: -156, endYear: -150 },
    { name: '中', startYear: -149, endYear: -144 },
    { name: '后', startYear: -143, endYear: -141 },
  ],
};

/**
 * 主函数
 */
async function main() {
  console.log('开始生成年号逐年展开表...\n');
  
  // 确保 note 列存在
  await pool.query(`
    ALTER TABLE era_years ADD COLUMN IF NOT EXISTS note TEXT
  `);
  
  // 清空表
  await pool.query('TRUNCATE era_years RESTART IDENTITY');
  
  // 读取 era_names 数据（包含 note）
  const { rows: eraNames } = await pool.query(`
    SELECT id, era_name, dynasty, emperor_name, emperor_title, start_year, end_year, note
    FROM era_names 
    ORDER BY start_year
  `);
  
  console.log(`读取到 ${eraNames.length} 条年号记录\n`);
  
  let totalYears = 0;
  
  for (const era of eraNames) {
    const { id, era_name, dynasty, emperor_name, emperor_title, start_year, end_year, note } = era;
    
    // 检查是否为特殊时期（无年号，需要分期）
    const specialPhases = SPECIAL_ERAS[era_name];
    
    if (specialPhases) {
      // 无年号时期，分期处理
      for (const phase of specialPhases) {
        let yearInPhase = 1;
        for (let year = phase.startYear; year <= phase.endYear; year++) {
          const ganZhi = getGanZhi(year);
          const yearChinese = numberToChinese(yearInPhase);
          const displayName = `${era_name}${phase.name}${yearChinese}年`;
          
          await pool.query(`
            INSERT INTO era_years 
            (era_name, era_phase, year_in_era, gan_zhi, gregorian_year, emperor_name, emperor_title, dynasty, original_era_id, display_name, note)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [era_name, phase.name, yearInPhase, ganZhi, year, emperor_name, emperor_title, dynasty, id, displayName, note]);
          
          totalYears++;
          yearInPhase++;
        }
        console.log(`  ${era_name}${phase.name}期: ${phase.startYear} ~ ${phase.endYear}`);
      }
    } else {
      // 有年号时期，逐年展开
      let yearInEra = 1;
      for (let year = start_year; year <= end_year; year++) {
        const ganZhi = getGanZhi(year);
        const yearChinese = numberToChinese(yearInEra);
        const displayName = `${era_name}${yearChinese}年`;
        
        await pool.query(`
          INSERT INTO era_years 
          (era_name, era_phase, year_in_era, gan_zhi, gregorian_year, emperor_name, emperor_title, dynasty, original_era_id, display_name, note)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [era_name, null, yearInEra, ganZhi, year, emperor_name, emperor_title, dynasty, id, displayName, note]);
        
        totalYears++;
        yearInEra++;
      }
      console.log(`${era_name}: ${start_year} ~ ${end_year} (${end_year - start_year + 1}年)${note ? ' [有注解]' : ''}`);
    }
  }
  
  console.log(`\n完成！共生成 ${totalYears} 条年号记录`);
  
  // 显示带注解的记录数
  const { rows: noteCount } = await pool.query(`
    SELECT COUNT(*) as count FROM era_years WHERE note IS NOT NULL
  `);
  console.log(`其中 ${noteCount[0].count} 条有注解`);
  
  // 显示部分结果
  console.log('\n前20条记录：');
  const { rows: sample } = await pool.query(`
    SELECT display_name, gan_zhi, gregorian_year, emperor_name 
    FROM era_years 
    ORDER BY gregorian_year 
    LIMIT 20
  `);
  
  for (const row of sample) {
    const yearStr = row.gregorian_year < 0 ? `前${-row.gregorian_year}年` : `${row.gregorian_year}年`;
    console.log(`  ${row.display_name}（${row.gan_zhi}）${yearStr}`);
  }
  
  // 显示文帝景帝时期
  console.log('\n文帝时期（前元）：');
  const { rows: wenqian } = await pool.query(`
    SELECT display_name, gan_zhi, gregorian_year 
    FROM era_years 
    WHERE era_name = '文帝' AND era_phase = '前'
    ORDER BY gregorian_year
  `);
  for (const row of wenqian) {
    console.log(`  ${row.display_name}（${row.gan_zhi}）前${-row.gregorian_year}`);
  }
  
  console.log('\n文帝时期（后元）：');
  const { rows: wenhou } = await pool.query(`
    SELECT display_name, gan_zhi, gregorian_year 
    FROM era_years 
    WHERE era_name = '文帝' AND era_phase = '后'
    ORDER BY gregorian_year
  `);
  for (const row of wenhou) {
    console.log(`  ${row.display_name}（${row.gan_zhi}）前${-row.gregorian_year}`);
  }
  
  console.log('\n景帝时期：');
  const { rows: jingdi } = await pool.query(`
    SELECT display_name, gan_zhi, gregorian_year 
    FROM era_years 
    WHERE era_name = '景帝'
    ORDER BY gregorian_year
  `);
  for (const row of jingdi) {
    console.log(`  ${row.display_name}（${row.gan_zhi}）前${-row.gregorian_year}`);
  }
  
  await pool.end();
}

main().catch(console.error);

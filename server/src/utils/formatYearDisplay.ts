/**
 * 年份显示格式化工具
 * 
 * 直接从 era_years 表获取 display_name 字段作为年号显示
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 年号缓存（从 era_years 表加载）
let eraYearsCache: Array<{
  era_name: string;
  era_phase: string | null;
  year_in_era: number;
  gan_zhi: string;
  gregorian_year: number;
  emperor_name: string;
  emperor_title: string;
  dynasty: string;
  display_name: string;
  note: string | null;
}> | null = null;

/**
 * 加载年号缓存（从 era_years 表）
 */
async function loadEraYearsCache() {
  if (eraYearsCache) return eraYearsCache;

  const result = await pool.query(
    'SELECT era_name, era_phase, year_in_era, gan_zhi, gregorian_year, emperor_name, emperor_title, dynasty, display_name, note FROM era_years ORDER BY gregorian_year'
  );
  eraYearsCache = result.rows;
  return eraYearsCache;
}

/**
 * 根据年份获取对应的年号信息
 */
export async function getEraNameByYear(bcYear: number | null): Promise<{
  eraName: string | null;
  emperorName: string | null;
  emperorTitle: string | null;
  yearInEra: number | null;
  ganZhi: string | null;
  displayName: string | null;
  note: string | null;
}> {
  if (bcYear === null) {
    return { eraName: null, emperorName: null, emperorTitle: null, yearInEra: null, ganZhi: null, displayName: null, note: null };
  }

  const cache = await loadEraYearsCache();
  
  // gregorian_year 是公元纪年，bcYear 是负数表示公元前
  // 例如：公元前 425 年 = gregorian_year -425
  const record = cache.find(r => r.gregorian_year === bcYear);
  
  if (record) {
    return {
      eraName: record.era_name,
      emperorName: record.emperor_name,
      emperorTitle: record.emperor_title,
      yearInEra: record.year_in_era,
      ganZhi: record.gan_zhi,
      displayName: record.display_name,
      note: record.note,
    };
  }

  return { eraName: null, emperorName: null, emperorTitle: null, yearInEra: null, ganZhi: null, displayName: null, note: null };
}

/**
 * 格式化年份显示
 * 直接从 era_years 表获取 display_name 字段
 * @param yearMark - 年份标记（如"二十三年"、"建元元年"）- 作为备用
 * @param emperor - 帝王名称 - 作为备用
 * @param bcYear - 公元前年份（负数表示公元前）
 * @returns 格式化后的年份显示
 */
export async function formatYearDisplay(
  yearMark: string | null,
  emperor: string | null,
  bcYear: number | null
): Promise<string> {
  // 直接从 era_years 表获取 display_name
  const eraInfo = await getEraNameByYear(bcYear);
  
  if (eraInfo.displayName) {
    return eraInfo.displayName;
  }

  // 数据库查不到时的备用逻辑
  if (emperor && yearMark) {
    return `${emperor}${yearMark}`;
  }
  
  if (yearMark) {
    return yearMark;
  }

  return '';
}

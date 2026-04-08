import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { Pool } from 'pg';
import { formatYearDisplay } from '../utils/formatYearDisplay';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * 格式化年份范围（处理公元前年份）
 */
function formatYearRange(start: number | null, end: number | null): string | null {
  if (!start || !end) return null;
  const startStr = start < 0 ? `前${Math.abs(start)}` : `${start}`;
  const endStr = end < 0 ? `前${Math.abs(end)}` : `${end}`;
  return `${startStr} ~ ${endStr}`;
}

// 解析中文年份（如"二十三年" -> 23）
function parseChineseYear(yearMark: string): number | null {
  const numStr = yearMark.replace('年', '');
  if (numStr === '元') return 1;
  const charToNum: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };
  if (numStr.length === 1) return charToNum[numStr] || null;
  if (numStr.length === 2) {
    if (numStr === '十') return 10;
    if (numStr[0] === '十') return 10 + (charToNum[numStr[1]] || 0);
    if (numStr[1] === '十') return (charToNum[numStr[0]] || 0) * 10;
    return null;
  }
  if (numStr.length === 3 && numStr[1] === '十') {
    return (charToNum[numStr[0]] || 0) * 10 + (charToNum[numStr[2]] || 0);
  }
  return null;
}

/**
 * 服务端文件：server/src/routes/volumes.ts
 * 接口：GET /api/v1/volumes/dynasty-groups
 * Query 参数：userId?: number, deviceId?: string
 * 返回按朝代分组的卷目列表（带阅读状态）
 */
router.get('/dynasty-groups', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;

    // 获取所有卷信息
    const volumesResult = await pool.query(`
      SELECT id, volume_number, volume_name, dynasty, year_start, year_end
      FROM zizhitongjian_volumes
      ORDER BY volume_number ASC
    `);

    const volumes = volumesResult.rows;

    // 查询阅读状态
    const readingStatusMap = new Map<number, { status: string; progress: number }>();
    if (userId || deviceId) {
      const statusResult = await pool.query(`
        SELECT volume_number, progress
        FROM reading_progress
        WHERE ${userId ? 'user_id = $1' : 'device_id = $1'}
      `, [userId || deviceId]);

      for (const row of statusResult.rows) {
        const progress = row.progress || 0;
        let status = 'unread';
        if (progress > 0 && progress < 100) status = 'reading';
        else if (progress >= 100) status = 'read';

        readingStatusMap.set(row.volume_number, { status, progress });
      }
    }

    // 按朝代分组
    const dynastyMap = new Map<string, {
      dynasty: string;
      dynastyLabel: string;
      count: number;
      volumes: Array<{
        id: number;
        volume: number;
        name: string;
        status: string;
        progress: number;
      }>;
    }>();

    // 朝代名称映射（数据库字段 -> 显示名称）
    const dynastyLabelMap: Record<string, string> = {
      '周': '周纪',
      '秦': '秦纪',
      '汉': '汉纪',
      '魏': '魏纪',
      '晋': '晋纪',
      '宋': '宋纪',
      '齐': '齐纪',
      '梁': '梁纪',
      '陈': '陈纪',
      '隋': '隋纪',
      '唐': '唐纪',
      '后梁': '后梁纪',
      '后唐': '后唐纪',
      '后晋': '后晋纪',
      '后汉': '后汉纪',
      '后周': '后周纪',
    };

    for (const v of volumes) {
      const dynasty = v.dynasty || '未知';
      const dynastyLabel = dynastyLabelMap[dynasty] || dynasty;

      if (!dynastyMap.has(dynasty)) {
        dynastyMap.set(dynasty, {
          dynasty,
          dynastyLabel,
          count: 0,
          volumes: [],
        });
      }

      const group = dynastyMap.get(dynasty)!;
      const readingStatus = readingStatusMap.get(v.volume_number);

      group.volumes.push({
        id: v.id,
        volume: v.volume_number,
        name: v.volume_name || '',
        year_start: v.year_start,
        year_end: v.year_end,
        status: readingStatus?.status || 'unread',
        progress: readingStatus?.progress || 0,
      });
      group.count++;
    }

    // 转换为数组（按卷号排序）
    const result = Array.from(dynastyMap.values());

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取朝代分组失败:', error);
    res.status(500).json({
      success: false,
      message: '获取朝代分组失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/volumes.ts
 * 接口：GET /api/v1/volumes
 * Query 参数：era?: string, userId?: number, deviceId?: string, offset?: number, limit?: number
 */
router.get('/', async (req, res) => {
  try {
    const { era, userId, deviceId, offset = 0, limit = 20 } = req.query;
    const offsetNum = parseInt(offset as string) || 0;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50); // 最大 50

    // 查询总数
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM zizhitongjian_volumes
      ${era ? 'WHERE dynasty = $1' : ''}
    `, era ? [era] : []);
    const total = parseInt(countResult.rows[0].total);

    // 分页查询卷
    const volumesResult = await pool.query(`
      SELECT * FROM zizhitongjian_volumes
      ${era ? 'WHERE dynasty = $1' : ''}
      ORDER BY volume_number ASC
      LIMIT $${era ? '2' : '1'} OFFSET $${era ? '3' : '2'}
    `, era ? [era, limitNum, offsetNum] : [limitNum, offsetNum]);

    const volumes = volumesResult.rows;

    // 批量查询当前页卷的首段落信息
    const volumeNumbers = volumes.map(v => v.volume_number);
    let firstParagraphMap = new Map<number, { emperor: string; year_mark: string; bc_year: number | null }>();
    
    if (volumeNumbers.length > 0) {
      const paragraphsResult = await pool.query(`
        SELECT DISTINCT ON (volume_number) volume_number, emperor, year_mark, bc_year
        FROM zizhitongjian_paragraphs
        WHERE volume_number = ANY($1)
        ORDER BY volume_number, id
      `, [volumeNumbers]);

      for (const p of paragraphsResult.rows) {
        firstParagraphMap.set(p.volume_number, {
          emperor: p.emperor || '',
          year_mark: p.year_mark || '',
          bc_year: p.bc_year,
        });
      }
    }

    // 查询阅读状态（如果有用户标识）
    const readingStatusMap = new Map<number, { status: string; progress: number }>();
    if (userId || deviceId) {
      const statusResult = await pool.query(`
        SELECT volume_number, progress
        FROM reading_progress
        WHERE ${userId ? 'user_id = $1' : 'device_id = $1'}
        AND volume_number = ANY($2)
      `, [userId || deviceId, volumeNumbers.length > 0 ? volumeNumbers : [0]]);

      for (const row of statusResult.rows) {
        const progress = row.progress || 0;
        let status = 'unread';
        if (progress > 0 && progress < 100) status = 'reading';
        else if (progress >= 100) status = 'read';
        
        readingStatusMap.set(row.volume_number, {
          status,
          progress,
        });
      }
    }

    // 转换数据格式（异步格式化年份显示）
    const formattedVolumes = await Promise.all(volumes.map(async v => {
      const firstParagraph = firstParagraphMap.get(v.volume_number);
      const readingStatus = readingStatusMap.get(v.volume_number);
      
      // 格式化年份显示
      const yearDisplay = firstParagraph 
        ? await formatYearDisplay(firstParagraph.year_mark, firstParagraph.emperor, firstParagraph.bc_year)
        : '';
      
      return {
        id: v.id,
        volume: v.volume_number,
        name: v.volume_name || '',
        era: v.dynasty || '',
        emperor: firstParagraph?.emperor || '',
        year: firstParagraph?.year_mark || '',
        year_display: yearDisplay,
        year_start: v.year_start,
        year_end: v.year_end,
        year_range: formatYearRange(v.year_start, v.year_end),
        time_range: v.time_range || '',
        summary: v.summary || '',
        status: readingStatus?.status || 'unread',
        progress: readingStatus?.progress || 0,
      };
    }));

    res.json({
      success: true,
      data: formattedVolumes,
      total,
      hasMore: offsetNum + limitNum < total,
    });
  } catch (error) {
    console.error('获取卷列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取卷列表失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/volumes.ts
 * 接口：GET /api/v1/volumes/emperor-groups
 * 按朝代分组返回卷列表（不再按帝王分组，因为一卷跨越多个帝王）
 */
router.get('/emperor-groups', async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    // 获取所有卷信息
    const { data: volumes, error: volumesError } = await supabase
      .from('zizhitongjian_volumes')
      .select('id, volume_number, volume_name, era_name, dynasty, year_start, year_end')
      .order('volume_number', { ascending: true });

    if (volumesError) {
      console.error('获取卷列表失败:', volumesError);
      return res.status(500).json({
        success: false,
        message: '获取卷列表失败',
        error: volumesError.message,
      });
    }

    // 按朝代分组
    const dynastyGroups = new Map<string, {
      dynasty: string;
      year_start: number;
      year_end: number;
      volumes: Array<{
        id: number;
        volume_number: number;
        volume_name: string;
        year_start: number;
        year_end: number;
      }>;
    }>();

    for (const volume of volumes || []) {
      const dynasty = volume.dynasty || '未知';
      if (!dynastyGroups.has(dynasty)) {
        dynastyGroups.set(dynasty, {
          dynasty: dynasty,
          year_start: volume.year_start || 0,
          year_end: volume.year_end || 0,
          volumes: [],
        });
      }

      const group = dynastyGroups.get(dynasty)!;
      group.volumes.push({
        id: volume.id,
        volume_number: volume.volume_number,
        volume_name: volume.volume_name || '',
        year_start: volume.year_start || 0,
        year_end: volume.year_end || 0,
      });

      // 更新年份范围
      if (volume.year_start && volume.year_end) {
        const isBC = volume.year_start > volume.year_end;
        if (isBC) {
          // BC年份：year_start大，year_end小
          if (volume.year_start > group.year_start) {
            group.year_start = volume.year_start;
          }
          if (group.year_end === 0 || volume.year_end < group.year_end) {
            group.year_end = volume.year_end;
          }
        } else {
          // AD年份：year_start小，year_end大
          if (group.year_start === 0 || volume.year_start < group.year_start) {
            group.year_start = volume.year_start;
          }
          if (volume.year_end > group.year_end) {
            group.year_end = volume.year_end;
          }
        }
      }
    }

    // 转换为数组
    const result = Array.from(dynastyGroups.values());

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取朝代分组失败:', error);
    res.status(500).json({
      success: false,
      message: '获取朝代分组失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/volumes.ts
 * 接口：GET /api/v1/volumes/search
 * Query 参数：keyword: string, limit?: number, offset?: number
 * 全文搜索功能 - 搜索段落内容
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, limit = 50, offset = 0 } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词',
      });
    }

    const supabase = getSupabaseClient();
    const searchTerm = keyword.trim();

    // 搜索 zizhitongjian_paragraphs 表
    const { data: paragraphs, error: paragraphsError } = await supabase
      .from('zizhitongjian_paragraphs')
      .select('id, volume_number, volume_name, year_mark, emperor, bc_year, content, translation')
      .or(`content.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%`)
      .order('volume_number', { ascending: true })
      .order('id', { ascending: true })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (paragraphsError) {
      console.error('搜索失败:', paragraphsError);
      return res.status(500).json({
        success: false,
        message: '搜索失败',
        error: paragraphsError.message,
      });
    }

    // 获取卷信息用于显示朝代
    const volumeNumbers = [...new Set(paragraphs?.map(p => p.volume_number) || [])];
    const { data: volumes } = await supabase
      .from('zizhitongjian_volumes')
      .select('volume_number, dynasty')
      .in('volume_number', volumeNumbers);

    const volumeMap = new Map(volumes?.map(v => [v.volume_number, v]));

    // 高亮关键词
    const highlightText = (text: string | null) => {
      if (!text) return null;
      return text.replace(new RegExp(`(${searchTerm})`, 'gi'), '**$1**');
    };

    // 格式化搜索结果
    const results = (paragraphs || []).map(p => {
      const volume = volumeMap.get(p.volume_number);

      return {
        id: p.id,
        volume_number: p.volume_number || 0,
        volume_name: p.volume_name || '',
        dynasty: volume?.dynasty || '',
        emperor: p.emperor || '',
        year_name: p.year_mark || '',
        bc_year: p.bc_year,
        content_highlight: highlightText(p.content),
        translation_highlight: highlightText(p.translation),
        context: getContext(p.content, searchTerm) || getContext(p.translation, searchTerm),
      };
    });

    // 获取总数
    const { count } = await supabase
      .from('zizhitongjian_paragraphs')
      .select('*', { count: 'exact', head: true })
      .or(`content.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%`);

    res.json({
      success: true,
      data: results,
      total: count || 0,
      keyword: searchTerm,
    });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/volumes.ts
 * 接口：GET /api/v1/volumes/:id
 * Path 参数：id: number
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const volumeId = parseInt(id);

    if (isNaN(volumeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的卷ID',
      });
    }

    const supabase = getSupabaseClient();

    // 获取卷信息 - 使用卷号查询
    const { data: volume, error: volumeError } = await supabase
      .from('zizhitongjian_volumes')
      .select('*')
      .eq('volume_number', volumeId)
      .single();

    if (volumeError || !volume) {
      return res.status(404).json({
        success: false,
        message: '卷不存在',
      });
    }

    // 转换数据格式
    const volumeDetail = {
      id: volume.id,
      volume_number: volume.volume_number,
      title: volume.volume_name,
      name: volume.volume_name,
      era: volume.dynasty,
      year_start: volume.year_start,
      year_end: volume.year_end,
      time_range: volume.time_range,
      summary: volume.summary,
      introduction: volume.introduction,  // 卷首注
    };

    res.json({
      success: true,
      data: volumeDetail,
    });
  } catch (error) {
    console.error('获取卷详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取卷详情失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/volumes.ts
 * 接口：GET /api/v1/volumes/:id/catalog
 * Path 参数：id: number（卷号）
 * 返回按帝王分组的目录结构
 */
router.get('/:id/catalog', async (req, res) => {
  try {
    const { id } = req.params;
    const volumeNumber = parseInt(id);

    if (isNaN(volumeNumber)) {
      return res.status(400).json({
        success: false,
        message: '无效的卷号',
      });
    }

    const supabase = getSupabaseClient();

    // 获取卷信息
    const { data: volume, error: volumeError } = await supabase
      .from('zizhitongjian_volumes')
      .select('*')
      .eq('volume_number', volumeNumber)
      .single();

    if (volumeError || !volume) {
      return res.status(404).json({
        success: false,
        message: '卷不存在',
      });
    }

    // 从 zizhitongjian_paragraphs 表获取目录数据（按年份和帝王分组）
    const { data: paragraphs, error: paragraphsError } = await supabase
      .from('zizhitongjian_paragraphs')
      .select('id, year_mark, emperor, bc_year')
      .eq('volume_number', volumeNumber)
      .order('bc_year', { ascending: true });

    if (paragraphsError) {
      console.error('获取目录数据失败:', paragraphsError);
      return res.status(500).json({
        success: false,
        message: '获取目录数据失败',
        error: paragraphsError.message,
      });
    }

    // 按帝王和年份分组（去重）
    // 注意：同一个帝王下可能有相同的年份标记（如"四年"），但属于不同年号
    // 使用 bc_year 作为唯一标识，而不是 year_mark
    const yearSet = new Set<string>();
    const emperorMap = new Map<string, {
      emperor: { id: number; name: string };
      years: Array<{ id: number; year_name: string; year_num: number; year_display: string; bc_year: number }>;
    }>();

    let emperorOrder = 0;
    for (const p of paragraphs || []) {
      // 使用 bc_year 作为唯一标识，避免同一年号下的相同年份标记被去重
      const key = `${p.emperor}_${p.bc_year}`;
      if (yearSet.has(key)) continue;
      yearSet.add(key);

      if (!emperorMap.has(p.emperor)) {
        emperorMap.set(p.emperor, {
          emperor: { id: emperorOrder++, name: p.emperor },
          years: [],
        });
      }

      // 解析年份数字（如"二十三年" -> 23）
      const yearNum = parseChineseYear(p.year_mark);
      const bcYear = p.bc_year || 0;

      emperorMap.get(p.emperor)!.years.push({
        id: p.id,
        year_name: p.year_mark,
        year_num: yearNum || 0,
        year_display: `${p.emperor} ${p.year_mark}`,  // 默认值，后面会覆盖
        bc_year: bcYear,
      });
    }

    // 格式化年份显示
    const catalog = await Promise.all(
      Array.from(emperorMap.values()).map(async group => ({
        emperor: group.emperor,
        years: await Promise.all(
          group.years.map(async year => ({
            ...year,
            year_display: await formatYearDisplay(year.year_name, group.emperor.name, year.bc_year),
          }))
        ),
      }))
    );

    res.json({
      success: true,
      data: {
        volume: {
          id: volume.id,
          volume_number: volume.volume_number,
          title: volume.volume_name,
        },
        catalog,
      },
    });
  } catch (error) {
    console.error('获取目录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取目录失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 获取上下文（关键词前后各50个字符）
function getContext(text: string | null, keyword: string): string {
  if (!text) return '';
  const index = text.indexOf(keyword);
  if (index === -1) return text.substring(0, 100);
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + keyword.length + 50);
  return (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
}

/**
 * 服务端文件：server/src/routes/volumes.ts
 * 接口：GET /api/v1/volumes/emperor-notes/:emperorName
 * Path 参数：emperorName: string
 * 返回帝王注解（从 era_years 表获取）
 */
router.get('/emperor-notes/:emperorName', async (req, res) => {
  try {
    const { emperorName } = req.params;
    const decodedName = decodeURIComponent(emperorName);
    
    // 从 era_years 表获取帝王注解（只取元年的记录）
    // 尝试多种匹配方式
    let result = await pool.query(
      `SELECT emperor_name, note FROM era_years 
       WHERE emperor_name = $1 AND note IS NOT NULL 
       ORDER BY gregorian_year LIMIT 1`,
      [decodedName]
    );
    
    // 如果精确匹配失败，尝试后缀匹配
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT emperor_name, note FROM era_years 
         WHERE emperor_name LIKE $1 AND note IS NOT NULL 
         ORDER BY gregorian_year LIMIT 1`,
        [`%${decodedName}`]
      );
    }
    
    // 如果仍然失败，尝试 emperor_title 匹配
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT emperor_name, note FROM era_years 
         WHERE emperor_title = $1 AND note IS NOT NULL 
         ORDER BY gregorian_year LIMIT 1`,
        [decodedName]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该帝王注解',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('获取帝王注解失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帝王注解失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

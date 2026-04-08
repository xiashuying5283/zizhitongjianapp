import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { getEraNameByYear } from '../utils/formatYearDisplay';

const router = Router();

/**
 * 服务端文件：server/src/routes/paragraphs.ts
 * 接口：GET /api/v1/paragraphs
 * Query 参数：volume_number?: number, year_mark?: string, event_index?: number
 * 返回段落列表（支持按卷、年份、事件筛选）
 */
router.get('/', async (req, res) => {
  try {
    const { volume_number, year_mark, event_index } = req.query;
    const supabase = getSupabaseClient();

    let query = supabase
      .from('zizhitongjian_paragraphs')
      .select('*')
      .order('volume_number', { ascending: true })
      .order('bc_year', { ascending: true })
      .order('event_index', { ascending: true })
      .order('paragraph_index', { ascending: true });

    // 可选过滤
    if (volume_number) {
      query = query.eq('volume_number', parseInt(volume_number as string));
    }
    if (year_mark) {
      query = query.eq('year_mark', year_mark);
    }
    if (event_index) {
      query = query.eq('event_index', parseInt(event_index as string));
    }

    const { data: paragraphs, error } = await query;

    if (error) {
      console.error('获取段落列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取段落列表失败',
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: paragraphs,
      total: paragraphs?.length || 0,
    });
  } catch (error) {
    console.error('获取段落列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取段落列表失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/paragraphs.ts
 * 接口：GET /api/v1/paragraphs/search
 * Query 参数：keyword: string, limit?: number, offset?: number
 * 全文搜索功能（搜索段落内容）
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
      .select('*')
      .ilike('content', `%${searchTerm}%`)
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1)
      .order('volume_number', { ascending: true })
      .order('bc_year', { ascending: true })
      .order('event_index', { ascending: true })
      .order('paragraph_index', { ascending: true });

    if (paragraphsError) {
      console.error('搜索失败:', paragraphsError);
      return res.status(500).json({
        success: false,
        message: '搜索失败',
        error: paragraphsError.message,
      });
    }

    // 高亮关键词
    const highlightText = (text: string | null) => {
      if (!text) return null;
      return text.replace(new RegExp(`(${searchTerm})`, 'gi'), '**$1**');
    };

    // 格式化搜索结果
    const results = (paragraphs || []).map(p => ({
      id: p.id,
      volume_number: p.volume_number,
      year_mark: p.year_mark,
      emperor: p.emperor,
      bc_year: p.bc_year,
      event_index: p.event_index,
      paragraph_index: p.paragraph_index,
      content_highlight: highlightText(p.content),
      content: p.content,
      translation: p.translation,
      is_chenguangyue: p.is_chenguangyue,
    }));

    // 获取总数
    const { count } = await supabase
      .from('zizhitongjian_paragraphs')
      .select('*', { count: 'exact', head: true })
      .ilike('content', `%${searchTerm}%`);

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
 * 服务端文件：server/src/routes/paragraphs.ts
 * 接口：GET /api/v1/paragraphs/volume/:volumeNumber
 * Path 参数：volumeNumber: number
 * Query 参数：offset?: number, limit?: number
 * 返回指定卷的段落（支持分页，按年份分组）
 */
router.get('/volume/:volumeNumber', async (req, res) => {
  try {
    const { volumeNumber } = req.params;
    const { offset = 0, limit } = req.query;
    const volumeNum = parseInt(volumeNumber);
    const offsetNum = parseInt(offset as string) || 0;
    const limitNum = limit ? parseInt(limit as string) : null; // null 表示不分页

    if (isNaN(volumeNum)) {
      return res.status(400).json({
        success: false,
        message: '无效的卷号',
      });
    }

    const supabase = getSupabaseClient();

    // 先获取总数
    const { count, error: countError } = await supabase
      .from('zizhitongjian_paragraphs')
      .select('*', { count: 'exact', head: true })
      .eq('volume_number', volumeNum);

    if (countError) {
      console.error('获取段落总数失败:', countError);
      return res.status(500).json({
        success: false,
        message: '获取段落总数失败',
        error: countError.message,
      });
    }

    // 查询段落
    let query = supabase
      .from('zizhitongjian_paragraphs')
      .select('*')
      .eq('volume_number', volumeNum)
      .order('bc_year', { ascending: true })
      .order('event_index', { ascending: true })
      .order('paragraph_index', { ascending: true });

    // 分页
    if (limitNum !== null) {
      query = query.range(offsetNum, offsetNum + limitNum - 1);
    }

    const { data: paragraphs, error } = await query;

    if (error) {
      console.error('获取卷段落失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取卷段落失败',
        error: error.message,
      });
    }

    // 按年份分组（使用 bc_year 作为唯一key，因为 year_mark 可能重复）
    const yearGroups = new Map<number, typeof paragraphs>();
    for (const p of paragraphs || []) {
      if (!yearGroups.has(p.bc_year)) {
        yearGroups.set(p.bc_year, []);
      }
      yearGroups.get(p.bc_year)!.push(p);
    }

    // 格式化年份显示
    const formattedYears = await Promise.all(
      Array.from(yearGroups.entries()).map(async ([key, paras]) => {
        const first = paras[0];
        
        // 从 era_years 表获取年份信息（display_name、gan_zhi、note）
        const eraInfo = await getEraNameByYear(first.bc_year);
        
        // 只显示年号，不显示干支
        const yearDisplay = eraInfo.displayName || first.year_mark;
        
        return {
          emperor: first.emperor,
          year_mark: first.year_mark,
          year_display: yearDisplay,
          era_name: eraInfo.eraName,
          gan_zhi: eraInfo.ganZhi,
          bc_year: first.bc_year,
          emperor_note: eraInfo.note,  // 直接使用 era_years 表的 note 字段
          paragraphs: paras,
        };
      })
    );

    res.json({
      success: true,
      data: {
        volume_number: volumeNum,
        years: formattedYears,
      },
      total: count || 0,
      hasMore: limitNum !== null ? offsetNum + limitNum < (count || 0) : false,
    });
  } catch (error) {
    console.error('获取卷段落失败:', error);
    res.status(500).json({
      success: false,
      message: '获取卷段落失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

import { Router } from 'express';
import { Pool } from 'pg';
import { getEraNameByYear } from '../utils/formatYearDisplay';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

/**
 * GET /api/v1/paragraphs
 */
router.get('/', async (req, res) => {
  try {
    const { volume_number, year_mark, event_index } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (volume_number) {
      conditions.push(`volume_number = $${paramIndex++}`);
      params.push(parseInt(volume_number as string));
    }
    if (year_mark) {
      conditions.push(`year_mark = $${paramIndex++}`);
      params.push(year_mark);
    }
    if (event_index) {
      conditions.push(`event_index = $${paramIndex++}`);
      params.push(parseInt(event_index as string));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM zizhitongjian_paragraphs ${where} ORDER BY volume_number ASC, bc_year ASC, event_index ASC, paragraph_index ASC`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
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
 * GET /api/v1/paragraphs/search
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, limit = 50, offset = 0 } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ success: false, message: '请输入搜索关键词' });
    }

    const searchTerm = keyword.trim();
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    const result = await pool.query(
      `SELECT * FROM zizhitongjian_paragraphs WHERE content ILIKE $1
       ORDER BY volume_number ASC, bc_year ASC, event_index ASC, paragraph_index ASC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limitNum, offsetNum]
    );

    // 获取总数
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM zizhitongjian_paragraphs WHERE content ILIKE $1',
      [`%${searchTerm}%`]
    );

    const highlightText = (text: string | null) => {
      if (!text) return null;
      return text.replace(new RegExp(`(${searchTerm})`, 'gi'), '**$1**');
    };

    const results = result.rows.map((p: any) => ({
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

    res.json({
      success: true,
      data: results,
      total: parseInt(countResult.rows[0].count),
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
 * GET /api/v1/paragraphs/volume/:volumeNumber
 */
router.get('/volume/:volumeNumber', async (req, res) => {
  try {
    const { volumeNumber } = req.params;
    const { offset = 0, limit } = req.query;
    const volumeNum = parseInt(volumeNumber);
    const offsetNum = parseInt(offset as string) || 0;
    const limitNum = limit ? parseInt(limit as string) : null;

    if (isNaN(volumeNum)) {
      return res.status(400).json({ success: false, message: '无效的卷号' });
    }

    // 获取总数
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM zizhitongjian_paragraphs WHERE volume_number = $1',
      [volumeNum]
    );
    const count = parseInt(countResult.rows[0].count);

    // 查询段落
    let query = `SELECT * FROM zizhitongjian_paragraphs WHERE volume_number = $1 ORDER BY bc_year ASC, event_index ASC, paragraph_index ASC`;
    const params: unknown[] = [volumeNum];

    if (limitNum !== null) {
      query += ` LIMIT $2 OFFSET $3`;
      params.push(limitNum, offsetNum);
    }

    const result = await pool.query(query, params);
    const paragraphs = result.rows;

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
        const eraInfo = await getEraNameByYear(first.bc_year);
        const yearDisplay = eraInfo.displayName || first.year_mark;

        return {
          emperor: first.emperor,
          emperor_title: eraInfo.emperorTitle,
          year_mark: first.year_mark,
          year_display: yearDisplay,
          era_name: eraInfo.eraName,
          era_phase: eraInfo.eraPhase,
          gan_zhi: eraInfo.ganZhi,
          bc_year: first.bc_year,
          emperor_note: eraInfo.note,
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
      total: count,
      hasMore: limitNum !== null ? offsetNum + limitNum < count : false,
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

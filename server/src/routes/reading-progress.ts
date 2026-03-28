import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

function formatYearRange(start: number | null, end: number | null): string {
  if (!start || !end) return '';
  const startStr = start < 0 ? `前${Math.abs(start)}` : `${start}`;
  const endStr = end < 0 ? `前${Math.abs(end)}` : `${end}`;
  return `${startStr}~${endStr}年`;
}

/**
 * GET /api/v1/reading-progress/recent
 * 获取最近一条阅读记录
 */
router.get('/recent', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.json({ success: true, data: null });
    }

    const result = await pool.query(
      `SELECT urp.id, urp.para_id, urp.read_percent, urp.update_time,
              urp.char_index, urp.content_type,
              zv.volume_number, zv.volume_name, zv.dynasty, zv.year_start, zv.year_end
       FROM user_read_progress urp
       JOIN zizhitongjian_volumes zv ON urp.volume_id = zv.id
       WHERE urp.user_id = $1
       ORDER BY urp.update_time DESC
       LIMIT 1`,
      [parseInt(userId as string)]
    );

    const progress = result.rows[0];
    if (!progress) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        id: progress.id,
        volume: progress.volume_number,
        name: progress.volume_name || '',
        era: progress.dynasty || '',
        year: formatYearRange(progress.year_start, progress.year_end),
        progress: Number(progress.read_percent),
        lastParagraphIndex: progress.para_id,
        lastReadAt: progress.update_time,
      },
    });
  } catch (error) {
    console.error('获取最近阅读失败:', error);
    res.status(500).json({
      success: false,
      message: '获取最近阅读失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/reading-progress
 * 获取全部阅读记录（含卷信息）
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.query(
      `SELECT urp.*, zv.volume_number, zv.volume_name, zv.dynasty, zv.year_start, zv.year_end
       FROM user_read_progress urp
       JOIN zizhitongjian_volumes zv ON urp.volume_id = zv.id
       WHERE urp.user_id = $1
       ORDER BY urp.update_time DESC`,
      [parseInt(userId as string)]
    );

    const records = result.rows.map((p: any) => {
      let status: 'unread' | 'reading' | 'read' = 'unread';
      if (p.read_percent >= 100) status = 'read';
      else if (p.read_percent > 0) status = 'reading';

      return {
        volumeNumber: p.volume_number,
        volumeId: p.volume_id,
        paraId: p.para_id,
        charIndex: p.char_index,
        contentType: p.content_type,
        readPercent: Number(p.read_percent),
        updateTime: p.update_time,
        status,
        volumeInfo: {
          id: p.volume_id,
          name: p.volume_name,
          era: p.dynasty,
          year: formatYearRange(p.year_start, p.year_end),
        },
      };
    });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取阅读记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取阅读记录失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/reading-progress
 * 保存阅读进度（UPSERT：每用户每卷仅1条）
 * Body: { userId, volumeNumber, paraId, charIndex, contentType, readPercent }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, volumeNumber, paraId = 0, charIndex = 0, contentType = 0, readPercent = 0 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }
    if (!volumeNumber) {
      return res.status(400).json({ success: false, message: '缺少卷号' });
    }

    const clampedPercent = Math.min(100, Math.max(0, readPercent));

    const result = await pool.query(
      `WITH vol AS (
        SELECT id FROM zizhitongjian_volumes WHERE volume_number = $1
      )
      INSERT INTO user_read_progress (user_id, volume_id, year_id, item_id, para_id, char_index, content_type, update_time, read_percent)
      SELECT $2, vol.id, 0, 0, $3, $4, $5, NOW(), $6
      FROM vol
      ON CONFLICT (user_id, volume_id)
      DO UPDATE SET
        year_id = EXCLUDED.year_id,
        item_id = EXCLUDED.item_id,
        para_id = EXCLUDED.para_id,
        char_index = EXCLUDED.char_index,
        content_type = EXCLUDED.content_type,
        update_time = NOW(),
        read_percent = EXCLUDED.read_percent
      RETURNING id, volume_id, para_id, char_index, content_type, read_percent, update_time`,
      [volumeNumber, userId, paraId, charIndex, contentType, clampedPercent]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '卷不存在' });
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        volumeId: result.rows[0].volume_id,
        paraId: result.rows[0].para_id,
        charIndex: result.rows[0].char_index,
        contentType: result.rows[0].content_type,
        readPercent: Number(result.rows[0].read_percent),
        updateTime: result.rows[0].update_time,
      },
    });
  } catch (error) {
    console.error('更新阅读进度失败:', error);
    res.status(500).json({
      success: false,
      message: '更新阅读进度失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/reading-progress/status
 * 批量获取指定卷的阅读状态
 */
router.get('/status', async (req, res) => {
  try {
    const { userId, volumeNumbers } = req.query;

    if (!userId) {
      return res.json({ success: true, data: {} });
    }
    if (!volumeNumbers) {
      return res.status(400).json({ success: false, message: '缺少卷号列表' });
    }

    const volumes = (volumeNumbers as string).split(',').map(Number).filter(n => !isNaN(n));

    const result = await pool.query(
      `SELECT zv.volume_number, urp.read_percent, urp.update_time
       FROM user_read_progress urp
       JOIN zizhitongjian_volumes zv ON urp.volume_id = zv.id
       WHERE urp.user_id = $1 AND zv.volume_number = ANY($2)`,
      [parseInt(userId as string), volumes]
    );

    const statusMap: Record<number, { status: string; progress: number }> = {};
    volumes.forEach(v => {
      statusMap[v] = { status: 'unread', progress: 0 };
    });

    for (const p of result.rows) {
      let status = 'unread';
      if (p.read_percent >= 100) status = 'read';
      else if (p.read_percent > 0) status = 'reading';
      statusMap[p.volume_number] = { status, progress: Number(p.read_percent) };
    }

    res.json({ success: true, data: statusMap });
  } catch (error) {
    console.error('获取阅读状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取阅读状态失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

/**
 * GET /api/v1/reading-progress/recent
 */
router.get('/recent', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少用户ID或设备ID' });
    }

    let result;
    if (userId) {
      result = await pool.query(
        'SELECT * FROM reading_progress WHERE user_id = $1 ORDER BY last_read_at DESC LIMIT 1',
        [parseInt(userId as string)]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM reading_progress WHERE device_id = $1 ORDER BY last_read_at DESC LIMIT 1',
        [deviceId]
      );
    }

    const progress = result.rows[0];
    if (!progress) {
      return res.json({ success: true, data: null });
    }

    const volResult = await pool.query(
      'SELECT * FROM zizhitongjian_volumes WHERE volume_number = $1',
      [progress.volume_number]
    );
    const volume = volResult.rows[0];

    function formatYearRange(start: number | null, end: number | null): string {
      if (!start || !end) return '';
      const startStr = start < 0 ? `前${Math.abs(start)}` : `${start}`;
      const endStr = end < 0 ? `前${Math.abs(end)}` : `${end}`;
      return `${startStr}~${endStr}年`;
    }

    res.json({
      success: true,
      data: {
        id: progress.id,
        volume: progress.volume_number,
        name: volume?.volume_name || '',
        era: volume?.dynasty || '',
        year: formatYearRange(volume?.year_start, volume?.year_end),
        progress: progress.progress,
        lastParagraphIndex: progress.last_paragraph_index,
        lastReadAt: progress.last_read_at,
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
 */
router.get('/', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少用户ID或设备ID' });
    }

    let result;
    if (userId) {
      result = await pool.query(
        'SELECT * FROM reading_progress WHERE user_id = $1 ORDER BY last_read_at DESC',
        [parseInt(userId as string)]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM reading_progress WHERE device_id = $1 ORDER BY last_read_at DESC',
        [deviceId]
      );
    }

    const progressList = result.rows;

    // 获取所有卷信息
    const volumeNumbers = progressList.map((p: any) => p.volume_number);
    let volumeMap = new Map<number, any>();
    if (volumeNumbers.length > 0) {
      const volResult = await pool.query(
        `SELECT * FROM zizhitongjian_volumes WHERE volume_number = ANY($1)`,
        [volumeNumbers]
      );
      volumeMap = new Map(volResult.rows.map((v: any) => [v.volume_number, v]));
    }

    function formatYearRange(start: number | null, end: number | null): string {
      if (!start || !end) return '';
      const startStr = start < 0 ? `前${Math.abs(start)}` : `${start}`;
      const endStr = end < 0 ? `前${Math.abs(end)}` : `${end}`;
      return `${startStr}~${endStr}年`;
    }

    const records = progressList.map((p: any) => {
      const volume = volumeMap.get(p.volume_number);
      let status: 'unread' | 'reading' | 'read' = 'unread';
      if (p.progress >= 100) status = 'read';
      else if (p.progress > 0) status = 'reading';

      return {
        volumeNumber: p.volume_number,
        progress: p.progress,
        lastParagraphIndex: p.last_paragraph_index,
        lastReadAt: p.last_read_at,
        status,
        volumeInfo: volume ? {
          id: volume.id,
          name: volume.volume_name,
          era: volume.dynasty,
          year: formatYearRange(volume.year_start, volume.year_end),
        } : null,
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
 */
router.post('/', async (req, res) => {
  try {
    const { userId, deviceId, volumeNumber, progress = 0, lastParagraphIndex = 0 } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少用户ID或设备ID' });
    }
    if (!volumeNumber) {
      return res.status(400).json({ success: false, message: '缺少卷号' });
    }

    // 查询是否存在
    const progressVal = Math.min(100, Math.max(0, progress));
    let result;
    if (userId) {
      result = await pool.query(
        'SELECT id FROM reading_progress WHERE volume_number = $1 AND user_id = $2',
        [volumeNumber, userId]
      );
    } else {
      result = await pool.query(
        'SELECT id FROM reading_progress WHERE volume_number = $1 AND device_id = $2',
        [volumeNumber, deviceId]
      );
    }

    let data;
    if (result.rows.length > 0) {
      // 更新
      const updateResult = await pool.query(
        `UPDATE reading_progress SET progress = $1, last_paragraph_index = $2, last_read_at = NOW(), updated_at = NOW()
         WHERE id = $3 RETURNING id, volume_number, progress, last_paragraph_index, last_read_at`,
        [progressVal, lastParagraphIndex, result.rows[0].id]
      );
      data = updateResult.rows[0];
    } else {
      // 插入
      const insertResult = await pool.query(
        `INSERT INTO reading_progress (volume_number, progress, last_paragraph_index, last_read_at, updated_at, user_id, device_id)
         VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)
         RETURNING id, volume_number, progress, last_paragraph_index, last_read_at`,
        [volumeNumber, progressVal, lastParagraphIndex, userId || null, deviceId || null]
      );
      data = insertResult.rows[0];
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        volumeNumber: data.volume_number,
        progress: data.progress,
        lastParagraphIndex: data.last_paragraph_index,
        lastReadAt: data.last_read_at,
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
 */
router.get('/status', async (req, res) => {
  try {
    const { userId, deviceId, volumeNumbers } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少用户ID或设备ID' });
    }
    if (!volumeNumbers) {
      return res.status(400).json({ success: false, message: '缺少卷号列表' });
    }

    const volumes = (volumeNumbers as string).split(',').map(Number).filter(n => !isNaN(n));

    let result;
    if (userId) {
      result = await pool.query(
        'SELECT volume_number, progress, last_read_at FROM reading_progress WHERE user_id = $1 AND volume_number = ANY($2)',
        [parseInt(userId as string), volumes]
      );
    } else {
      result = await pool.query(
        'SELECT volume_number, progress, last_read_at FROM reading_progress WHERE device_id = $1 AND volume_number = ANY($2)',
        [deviceId, volumes]
      );
    }

    const statusMap: Record<number, { status: string; progress: number }> = {};
    volumes.forEach(v => {
      statusMap[v] = { status: 'unread', progress: 0 };
    });

    for (const p of result.rows) {
      let status = 'unread';
      if (p.progress >= 100) status = 'read';
      else if (p.progress > 0) status = 'reading';
      statusMap[p.volume_number] = { status, progress: p.progress };
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

import express, { type Request, type Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 获取用户阅读统计
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: '缺少 deviceId' });
    }

    // 获取批注数量
    const annotationResult = await pool.query(
      `SELECT COUNT(*) as count FROM annotations WHERE device_id = $1 AND annotation IS NOT NULL`,
      [deviceId]
    );
    const annotationCount = parseInt(annotationResult.rows[0]?.count || '0', 10);

    // 获取高亮数量
    const highlightResult = await pool.query(
      `SELECT COUNT(*) as count FROM annotations WHERE device_id = $1 AND highlight_color IS NOT NULL`,
      [deviceId]
    );
    const highlightCount = parseInt(highlightResult.rows[0]?.count || '0', 10);

    // 获取已读卷数
    const readResult = await pool.query(
      `SELECT COUNT(DISTINCT volume_number) as count FROM reading_progress WHERE device_id = $1 AND progress >= 100`,
      [deviceId]
    );
    const readVolumes = parseInt(readResult.rows[0]?.count || '0', 10);

    // 获取在读卷数
    const readingResult = await pool.query(
      `SELECT COUNT(DISTINCT volume_number) as count FROM reading_progress WHERE device_id = $1 AND progress > 0 AND progress < 100`,
      [deviceId]
    );
    const readingVolumes = parseInt(readingResult.rows[0]?.count || '0', 10);

    // 获取阅读天数（去重）
    const daysResult = await pool.query(
      `SELECT COUNT(DISTINCT DATE(last_read_at)) as count FROM reading_progress WHERE device_id = $1`,
      [deviceId]
    );
    const readingDays = parseInt(daysResult.rows[0]?.count || '0', 10);

    res.json({
      success: true,
      data: {
        annotationCount,
        highlightCount,
        readVolumes,
        readingVolumes,
        readingDays,
        totalVolumes: 294, // 资治通鉴共294卷
      },
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// 获取用户所有批注列表
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { deviceId, limit = '20', offset = '0' } = req.query;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: '缺少 deviceId' });
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // 获取批注列表，关联卷信息
    const result = await pool.query(
      `SELECT a.id, a.volume_number, a.paragraph_id, a.selected_text, a.annotation, a.highlight_color, a.created_at,
              v.era_name, v.dynasty, v.volume_name
       FROM annotations a
       LEFT JOIN zizhitongjian_volumes v ON a.volume_number = v.volume_number
       WHERE a.device_id = $1 AND a.annotation IS NOT NULL
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [deviceId, limitNum, offsetNum]
    );

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM annotations WHERE device_id = $1 AND annotation IS NOT NULL`,
      [deviceId]
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const data = result.rows.map(row => ({
      id: row.id,
      volumeNumber: row.volume_number,
      paragraphId: row.paragraph_id,
      selectedText: row.selected_text,
      annotation: row.annotation,
      highlightColor: row.highlight_color,
      createdAt: row.created_at,
      volumeInfo: row.era_name ? {
        eraName: row.era_name,
        dynasty: row.dynasty,
        volumeName: row.volume_name,
      } : null,
    }));

    res.json({ success: true, data, total });
  } catch (error) {
    console.error('获取批注列表失败:', error);
    res.status(500).json({ success: false, message: '获取批注列表失败' });
  }
});

// 获取高亮和批注列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { deviceId, volumeNumber, paragraphId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: '缺少 deviceId' });
    }

    const result = await pool.query(
      `SELECT id, selected_text, start_offset, end_offset, highlight_color, annotation, created_at
       FROM annotations 
       WHERE device_id = $1 
         AND volume_number = $2 
         AND paragraph_id = $3
         AND (highlight_color IS NOT NULL OR annotation IS NOT NULL)
       ORDER BY start_offset`,
      [deviceId, volumeNumber, paragraphId]
    );

    const data = result.rows.map(row => ({
      id: row.id,
      selected_text: row.selected_text,
      start_offset: row.start_offset,
      end_offset: row.end_offset,
      highlight_color: row.highlight_color,
      annotation: row.annotation,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取高亮失败:', error);
    res.status(500).json({ success: false, message: '获取高亮失败' });
  }
});

// 创建高亮
router.post('/', async (req: Request, res: Response) => {
  try {
    const { deviceId, volumeNumber, paragraphId, selectedText, startOffset, endOffset, highlightColor, annotation } = req.body;

    if (!deviceId || volumeNumber === undefined || paragraphId === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await pool.query(
      `INSERT INTO annotations (device_id, volume_number, paragraph_id, selected_text, start_offset, end_offset, highlight_color, annotation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [deviceId, volumeNumber, paragraphId, selectedText, startOffset, endOffset, highlightColor, annotation || null]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('创建高亮失败:', error);
    res.status(500).json({ success: false, message: '创建高亮失败' });
  }
});

// 更新高亮/批注
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId, highlightColor, annotation } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: '缺少 deviceId' });
    }

    // 验证所有权
    const checkResult = await pool.query(
      'SELECT id FROM annotations WHERE id = $1 AND device_id = $2',
      [id, deviceId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未找到记录或无权限' });
    }

    // 更新
    if (highlightColor !== undefined) {
      await pool.query('UPDATE annotations SET highlight_color = $1 WHERE id = $2', [highlightColor, id]);
    }
    if (annotation !== undefined) {
      await pool.query('UPDATE annotations SET annotation = $1 WHERE id = $2', [annotation, id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('更新高亮失败:', error);
    res.status(500).json({ success: false, message: '更新高亮失败' });
  }
});

// 删除高亮/批注
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: '缺少 deviceId' });
    }

    const result = await pool.query(
      'DELETE FROM annotations WHERE id = $1 AND device_id = $2',
      [id, deviceId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '未找到记录或无权限' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除高亮失败:', error);
    res.status(500).json({ success: false, message: '删除高亮失败' });
  }
});

export default router;

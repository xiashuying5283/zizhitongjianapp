import express, { type Request, type Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 服务端文件：server/src/routes/notes.ts
 * 接口：GET /api/v1/notes
 * Query 参数：userId?: number, deviceId?: string, volumeNumber?: number, paragraphId?: number
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, volumeNumber, paragraphId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    let sql = `
      SELECT n.id, n.volume_number, n.paragraph_id, n.start_offset, n.end_offset, 
             n.highlighted_text, n.note_content, n.color, n.created_at, n.updated_at,
             v.era_name, v.dynasty, v.volume_name
      FROM notes n
      LEFT JOIN zizhitongjian_volumes v ON n.volume_number = v.volume_number
      WHERE ${userId ? 'n.user_id = $1' : 'n.device_id = $1'}
    `;
    const params: any[] = [userId || deviceId];
    let paramIndex = 2;

    if (volumeNumber) {
      sql += ` AND n.volume_number = $${paramIndex}`;
      params.push(volumeNumber);
      paramIndex++;
    }

    if (paragraphId) {
      sql += ` AND n.paragraph_id = $${paramIndex}`;
      params.push(paragraphId);
      paramIndex++;
    }

    sql += ' ORDER BY n.volume_number, n.paragraph_id, n.start_offset';

    const result = await pool.query(sql, params);

    const data = result.rows.map(row => ({
      id: row.id,
      volumeNumber: row.volume_number,
      paragraphId: row.paragraph_id,
      startOffset: row.start_offset,
      endOffset: row.end_offset,
      highlightedText: row.highlighted_text,
      noteContent: row.note_content,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      volumeInfo: row.era_name ? {
        eraName: row.era_name,
        dynasty: row.dynasty,
        volumeName: row.volume_name,
      } : null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取笔记失败:', error);
    res.status(500).json({ success: false, message: '获取笔记失败' });
  }
});

/**
 * 服务端文件：server/src/routes/notes.ts
 * 接口：GET /api/v1/notes/list
 * Query 参数：userId?: number, deviceId?: string, limit?: number, offset?: number
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, limit = '20', offset = '0' } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    const result = await pool.query(
      `SELECT n.id, n.volume_number, n.paragraph_id, n.highlighted_text, n.note_content, 
              n.color, n.created_at,
              v.era_name, v.dynasty, v.volume_name
       FROM notes n
       LEFT JOIN zizhitongjian_volumes v ON n.volume_number = v.volume_number
       WHERE ${userId ? 'n.user_id = $1' : 'n.device_id = $1'}
         AND n.note_content IS NOT NULL
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId || deviceId, limitNum, offsetNum]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM notes 
       WHERE ${userId ? 'user_id = $1' : 'device_id = $1'} AND note_content IS NOT NULL`,
      [userId || deviceId]
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const data = result.rows.map(row => ({
      id: row.id,
      volumeNumber: row.volume_number,
      paragraphId: row.paragraph_id,
      highlightedText: row.highlighted_text,
      noteContent: row.note_content,
      color: row.color,
      createdAt: row.created_at,
      volumeInfo: row.era_name ? {
        eraName: row.era_name,
        dynasty: row.dynasty,
        volumeName: row.volume_name,
      } : null,
    }));

    res.json({ success: true, data, total });
  } catch (error) {
    console.error('获取笔记列表失败:', error);
    res.status(500).json({ success: false, message: '获取笔记列表失败' });
  }
});

/**
 * 服务端文件：server/src/routes/notes.ts
 * 接口：POST /api/v1/notes
 * Body 参数：userId?: number, deviceId?: string, volumeNumber: number, paragraphId: number, 
 *           startOffset: number, endOffset: number, highlightedText: string, noteContent?: string, color?: string
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, volumeNumber, paragraphId, startOffset, endOffset, highlightedText, noteContent, color } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    if (!volumeNumber || paragraphId === undefined || startOffset === undefined || endOffset === undefined || !highlightedText) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await pool.query(
      `INSERT INTO notes (user_id, device_id, volume_number, paragraph_id, start_offset, end_offset, highlighted_text, note_content, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        userId || null,
        deviceId || null,
        volumeNumber,
        paragraphId,
        startOffset,
        endOffset,
        highlightedText,
        noteContent || null,
        color || '#FFEB3B',
      ]
    );

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('创建笔记失败:', error);
    res.status(500).json({ success: false, message: '创建笔记失败' });
  }
});

/**
 * 服务端文件：server/src/routes/notes.ts
 * 接口：PUT /api/v1/notes/:id
 * Body 参数：userId?: number, deviceId?: string, noteContent?: string, color?: string
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, deviceId, noteContent, color } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    // 验证所有权
    const checkResult = await pool.query(
      `SELECT id FROM notes WHERE id = $1 AND (${userId ? 'user_id = $2' : 'device_id = $2'})`,
      [id, userId || deviceId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '笔记不存在或无权限' });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (noteContent !== undefined) {
      updates.push(`note_content = $${paramIndex}`);
      params.push(noteContent);
      paramIndex++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      params.push(color);
      paramIndex++;
    }

    params.push(id);

    await pool.query(
      `UPDATE notes SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('更新笔记失败:', error);
    res.status(500).json({ success: false, message: '更新笔记失败' });
  }
});

/**
 * 服务端文件：server/src/routes/notes.ts
 * 接口：DELETE /api/v1/notes/:id
 * Query 参数：userId?: number, deviceId?: string
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    const result = await pool.query(
      `DELETE FROM notes WHERE id = $1 AND (${userId ? 'user_id = $2' : 'device_id = $2'})`,
      [id, userId || deviceId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '笔记不存在或无权限' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除笔记失败:', error);
    res.status(500).json({ success: false, message: '删除笔记失败' });
  }
});

export default router;

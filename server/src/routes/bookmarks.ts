import express, { type Request, type Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 服务端文件：server/src/routes/bookmarks.ts
 * 接口：GET /api/v1/bookmarks
 * Query 参数：userId?: number, deviceId?: string, volumeNumber?: number
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, volumeNumber, tag } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    let sql = `
      SELECT b.id, b.volume_number, b.paragraph_id, b.year_mark, b.emperor, b.title, b.note, b.tags, b.created_at, b.updated_at,
             v.era_name, v.dynasty, v.volume_name
      FROM bookmarks b
      LEFT JOIN zizhitongjian_volumes v ON b.volume_number = v.volume_number
      WHERE ${userId ? 'b.user_id = $1' : 'b.device_id = $1'}
    `;
    const params: any[] = [userId || deviceId];
    let paramIndex = 2;

    if (volumeNumber) {
      sql += ` AND b.volume_number = $${paramIndex}`;
      params.push(volumeNumber);
      paramIndex++;
    }

    if (tag) {
      sql += ` AND $${paramIndex} = ANY(b.tags)`;
      params.push(tag);
      paramIndex++;
    }

    sql += ' ORDER BY b.created_at DESC';

    const result = await pool.query(sql, params);

    const data = result.rows.map(row => ({
      id: row.id,
      volumeNumber: row.volume_number,
      paragraphId: row.paragraph_id,
      yearMark: row.year_mark,
      emperor: row.emperor,
      title: row.title,
      note: row.note,
      tags: row.tags || [],
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
    console.error('获取书签失败:', error);
    res.status(500).json({ success: false, message: '获取书签失败' });
  }
});

/**
 * 服务端文件：server/src/routes/bookmarks.ts
 * 接口：GET /api/v1/bookmarks/tags
 * Query 参数：userId?: number, deviceId?: string
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    const result = await pool.query(
      `SELECT DISTINCT unnest(tags) as tag FROM bookmarks 
       WHERE ${userId ? 'user_id = $1' : 'device_id = $1'}`,
      [userId || deviceId]
    );

    const tags = result.rows.map(row => row.tag).filter(Boolean);

    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('获取标签失败:', error);
    res.status(500).json({ success: false, message: '获取标签失败' });
  }
});

/**
 * 服务端文件：server/src/routes/bookmarks.ts
 * 接口：POST /api/v1/bookmarks
 * Body 参数：userId?: number, deviceId?: string, volumeNumber: number, paragraphId?: number, yearMark?: string, emperor?: string, title?: string, note?: string, tags?: string[]
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, volumeNumber, paragraphId, yearMark, emperor, title, note, tags } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    if (!volumeNumber) {
      return res.status(400).json({ success: false, message: '缺少卷号' });
    }

    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, device_id, volume_number, paragraph_id, year_mark, emperor, title, note, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        userId || null,
        deviceId || null,
        volumeNumber,
        paragraphId || null,
        yearMark || null,
        emperor || null,
        title || null,
        note || null,
        JSON.stringify(tags || []),
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
    console.error('创建书签失败:', error);
    res.status(500).json({ success: false, message: '创建书签失败' });
  }
});

/**
 * 服务端文件：server/src/routes/bookmarks.ts
 * 接口：PUT /api/v1/bookmarks/:id
 * Body 参数：userId?: number, deviceId?: string, title?: string, note?: string, tags?: string[]
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, deviceId, title, note, tags } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    // 验证所有权
    const checkResult = await pool.query(
      `SELECT id FROM bookmarks WHERE id = $1 AND (${userId ? 'user_id = $2' : 'device_id = $2'})`,
      [id, userId || deviceId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '书签不存在或无权限' });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }

    if (note !== undefined) {
      updates.push(`note = $${paramIndex}`);
      params.push(note);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(JSON.stringify(tags));
      paramIndex++;
    }

    params.push(id);

    await pool.query(
      `UPDATE bookmarks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('更新书签失败:', error);
    res.status(500).json({ success: false, message: '更新书签失败' });
  }
});

/**
 * 服务端文件：server/src/routes/bookmarks.ts
 * 接口：DELETE /api/v1/bookmarks/:id
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
      `DELETE FROM bookmarks WHERE id = $1 AND (${userId ? 'user_id = $2' : 'device_id = $2'})`,
      [id, userId || deviceId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '书签不存在或无权限' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除书签失败:', error);
    res.status(500).json({ success: false, message: '删除书签失败' });
  }
});

export default router;

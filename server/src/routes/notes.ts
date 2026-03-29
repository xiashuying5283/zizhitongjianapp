import express, { type Request, type Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 确保 user_notes 表存在（包含 mark_type 字段）
async function ensureNotesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      device_id VARCHAR(100),
      volume_number INTEGER NOT NULL,
      paragraph_id INTEGER NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      highlighted_text TEXT NOT NULL,
      note_content TEXT,
      color VARCHAR(20) DEFAULT '#FFEB3B',
      mark_type VARCHAR(20) DEFAULT 'background',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  
  // 添加 mark_type 列（如果不存在）
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'user_notes' AND column_name = 'mark_type') THEN
        ALTER TABLE user_notes ADD COLUMN mark_type VARCHAR(20) DEFAULT 'background';
      END IF;
    END $$;
  `);
}

// 初始化表
ensureNotesTable().catch(console.error);

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
             n.highlighted_text, n.note_content, n.color, n.mark_type, n.created_at, n.updated_at,
             v.era_name, v.dynasty, v.volume_name
      FROM user_notes n
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
      markType: row.mark_type || 'background',
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
              n.color, n.mark_type, n.created_at,
              v.era_name, v.dynasty, v.volume_name
       FROM user_notes n
       LEFT JOIN zizhitongjian_volumes v ON n.volume_number = v.volume_number
       WHERE ${userId ? 'n.user_id = $1' : 'n.device_id = $1'}
         AND n.note_content IS NOT NULL
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId || deviceId, limitNum, offsetNum]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM user_notes 
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
      markType: row.mark_type || 'background',
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
 *           startOffset: number, endOffset: number, highlightedText: string, noteContent?: string, 
 *           color?: string, markType?: string
 * 说明：如果相同位置已存在批注，则更新；否则创建新批注
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, volumeNumber, paragraphId, startOffset, endOffset, highlightedText, noteContent, color, markType } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    if (!volumeNumber || paragraphId === undefined || startOffset === undefined || endOffset === undefined || !highlightedText) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // 先查找是否存在相同位置的批注
    const existingNote = await pool.query(
      `SELECT id FROM user_notes 
       WHERE ${userId ? 'user_id = $1' : 'device_id = $1'}
         AND paragraph_id = $2 
         AND start_offset = $3 
         AND end_offset = $4`,
      [userId || deviceId, paragraphId, startOffset, endOffset]
    );

    let result;

    if (existingNote.rows.length > 0) {
      // 存在则更新
      const noteId = existingNote.rows[0].id;
      await pool.query(
        `UPDATE user_notes 
         SET highlighted_text = $1, note_content = COALESCE($2, note_content), 
             color = $3, mark_type = $4, updated_at = NOW()
         WHERE id = $5`,
        [highlightedText, noteContent || null, color || '#FECACA', markType || 'background', noteId]
      );
      result = { id: noteId, updated: true };
    } else {
      // 不存在则创建
      const insertResult = await pool.query(
        `INSERT INTO user_notes (user_id, device_id, volume_number, paragraph_id, start_offset, end_offset, highlighted_text, note_content, color, mark_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
          color || '#FECACA',
          markType || 'background',
        ]
      );
      result = { id: insertResult.rows[0].id, createdAt: insertResult.rows[0].created_at, updated: false };
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('创建笔记失败:', error);
    res.status(500).json({ success: false, message: '创建笔记失败' });
  }
});

/**
 * 服务端文件：server/src/routes/notes.ts
 * 接口：PUT /api/v1/notes/:id
 * Body 参数：userId?: number, deviceId?: string, noteContent?: string, color?: string, markType?: string
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, deviceId, noteContent, color, markType } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    // 验证所有权
    const checkResult = await pool.query(
      `SELECT id FROM user_notes WHERE id = $1 AND (${userId ? 'user_id = $2' : 'device_id = $2'})`,
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

    if (markType !== undefined) {
      updates.push(`mark_type = $${paramIndex}`);
      params.push(markType);
      paramIndex++;
    }

    params.push(id);

    await pool.query(
      `UPDATE user_notes SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
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
      `DELETE FROM user_notes WHERE id = $1 AND (${userId ? 'user_id = $2' : 'device_id = $2'})`,
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

import express, { type Request, type Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 创建反馈表（如果不存在）
 */
async function ensureFeedbackTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      contact VARCHAR(255),
      device_id VARCHAR(255),
      user_id INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// 确保表存在
ensureFeedbackTable().catch(console.error);

/**
 * POST /api/v1/feedback
 * 提交用户反馈
 * Body: type, content, contact?, deviceId?
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, content, contact, deviceId } = req.body;

    if (!type || !content) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: '反馈内容过长',
      });
    }

    const result = await pool.query(
      `INSERT INTO feedback (type, content, contact, device_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, type, content, contact, status, created_at`,
      [type, content, contact || null, deviceId || null]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

/**
 * GET /api/v1/feedback
 * 获取反馈列表（管理用）
 * Query: limit?, offset?
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT id, type, content, contact, device_id, status, created_at
       FROM feedback
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM feedback');

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get feedback list error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

/**
 * PATCH /api/v1/feedback/:id/status
 * 更新反馈状态
 * Body: status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值',
      });
    }

    const result = await pool.query(
      `UPDATE feedback SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '反馈不存在',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

export default router;

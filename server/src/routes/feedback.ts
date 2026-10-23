import express, { type Request, type Response } from 'express';
import { getPgPool } from '../storage/database/pg-pool';

const router = express.Router();
const pool = getPgPool();

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

export default router;

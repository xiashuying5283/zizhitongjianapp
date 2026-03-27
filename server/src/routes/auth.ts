import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();
const SALT_ROUNDS = 10;

/**
 * POST /api/v1/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({ success: false, message: '用户名长度应为2-50个字符' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6个字符' });
    }

    // 检查用户名是否已存在
    const existResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname, avatar, created_at',
      [username, passwordHash, nickname || username]
    );

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/auth/check-username
 */
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ success: false, message: '用户名不能为空' });
    }

    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    res.json({
      success: true,
      data: { available: result.rows.length === 0 },
    });
  } catch (error) {
    res.json({
      success: true,
      data: { available: true },
    });
  }
});

/**
 * GET /api/v1/auth/user/:id
 */
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, username, nickname, avatar, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

/**
 * PUT /api/v1/auth/profile
 */
router.put('/profile', async (req, res) => {
  try {
    const { userId, nickname, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const updateFields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (nickname !== undefined) {
      if (nickname.length < 1 || nickname.length > 50) {
        return res.status(400).json({ success: false, message: '昵称长度应为1-50个字符' });
      }
      updateFields.push(`nickname = $${paramIndex++}`);
      params.push(nickname);
    }
    if (avatar !== undefined) {
      updateFields.push(`avatar = $${paramIndex++}`);
      params.push(avatar);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的内容' });
    }

    params.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, nickname, avatar, created_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(500).json({ success: false, message: '更新失败' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

export default router;

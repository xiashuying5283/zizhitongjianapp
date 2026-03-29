import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

const VALID_CATEGORIES = ['discussion', 'question', 'sharing', 'notice'];

// 辅助：将 posts 行附加 user 信息
function attachUser(rows: any[], userMap: Map<number, any>) {
  return rows.map((row: any) => ({
    ...row,
    user: userMap.get(row.user_id) ? {
      id: userMap.get(row.user_id).id,
      username: userMap.get(row.user_id).username,
      nickname: userMap.get(row.user_id).nickname,
    } : null,
  }));
}

/**
 * GET /api/v1/posts
 */
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 20, userId } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category && VALID_CATEGORIES.includes(category as string)) {
      conditions.push(`p.category = $${paramIndex++}`);
      params.push(category);
    }

    if (userId) {
      conditions.push(`p.user_id = $${paramIndex++}`);
      params.push(parseInt(userId as string));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await pool.query(`SELECT COUNT(*) FROM posts p ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    // 获取帖子
    const result = await pool.query(
      `SELECT p.id, p.title, p.content, p.category, p.like_count, p.comment_count, p.is_pinned, p.created_at, p.updated_at, p.user_id,
              u.id as user_id_col, u.username, u.nickname
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       ${where}
       ORDER BY p.is_pinned DESC NULLS LAST, p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limitNum, offset]
    );

    // 将行转为带 user 对象的结构
    const posts = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      like_count: row.like_count,
      comment_count: row.comment_count,
      is_pinned: row.is_pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: row.user_id_col ? {
        id: row.user_id_col,
        username: row.username,
        nickname: row.nickname,
      } : null,
    }));

    res.json({
      success: true,
      data: {
        posts,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取帖子列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帖子列表失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/posts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.title, p.content, p.category, p.like_count, p.comment_count, p.is_pinned, p.created_at, p.updated_at, p.user_id,
              u.id as user_id_col, u.username, u.nickname
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const row = result.rows[0];
    const post = {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      like_count: row.like_count,
      comment_count: row.comment_count,
      is_pinned: row.is_pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: row.user_id_col ? {
        id: row.user_id_col,
        username: row.username,
        nickname: row.nickname,
      } : null,
    };

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    res.status(500).json({ success: false, message: '获取帖子详情失败' });
  }
});

/**
 * POST /api/v1/posts
 */
router.post('/', async (req, res) => {
  try {
    const { title, content, category = 'discussion', userId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容不能为空' });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, message: '标题不能超过200个字符' });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: '无效的帖子分类' });
    }

    const result = await pool.query(
      `INSERT INTO posts (title, content, category, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, content, category, like_count, comment_count, created_at`,
      [title, content, category, userId]
    );

    const row = result.rows[0];

    // 获取用户信息
    const userResult = await pool.query('SELECT id, username, nickname FROM users WHERE id = $1', [userId]);

    const post = {
      ...row,
      user: userResult.rows[0] ? {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        nickname: userResult.rows[0].nickname,
      } : null,
    };

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('创建帖子失败:', error);
    res.status(500).json({ success: false, message: '创建帖子失败' });
  }
});

/**
 * PUT /api/v1/posts/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, userId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    // 检查帖子是否存在且属于当前用户
    const existResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [parseInt(id)]);
    if (existResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (existResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权编辑此帖子' });
    }

    const updateFields: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (title) {
      updateFields.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (content) {
      updateFields.push(`content = $${paramIndex++}`);
      params.push(content);
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      updateFields.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    params.push(parseInt(id));
    const result = await pool.query(
      `UPDATE posts SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, title, content, category, like_count, comment_count, updated_at, user_id`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(500).json({ success: false, message: '更新帖子失败' });
    }

    const row = result.rows[0];
    const userResult = await pool.query('SELECT id, username, nickname FROM users WHERE id = $1', [row.user_id]);

    const post = {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      like_count: row.like_count,
      comment_count: row.comment_count,
      updated_at: row.updated_at,
      user: userResult.rows[0] ? {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        nickname: userResult.rows[0].nickname,
      } : null,
    };

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('更新帖子失败:', error);
    res.status(500).json({ success: false, message: '更新帖子失败' });
  }
});

/**
 * DELETE /api/v1/posts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const existResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [parseInt(id)]);
    if (existResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (existResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此帖子' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [parseInt(id)]);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({ success: false, message: '删除帖子失败' });
  }
});

/**
 * POST /api/v1/posts/:id/like
 */
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const postId = parseInt(id);

    // 检查是否已点赞
    const existingResult = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingResult.rows.length > 0) {
      // 取消点赞
      await pool.query('DELETE FROM post_likes WHERE id = $1', [existingResult.rows[0].id]);
      // 减少点赞数
      await pool.query('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1', [postId]);

      res.json({ success: true, data: { liked: false } });
    } else {
      // 添加点赞
      await pool.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, userId]
      );
      // 增加点赞数
      await pool.query('UPDATE posts SET like_count = like_count + 1 WHERE id = $1', [postId]);

      res.json({ success: true, data: { liked: true } });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({ success: false, message: '点赞操作失败' });
  }
});

export default router;

import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// 辅助：将评论行附加 user 信息
function commentRowToObject(row: any) {
  return {
    id: row.id,
    content: row.content,
    like_count: row.like_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent_id: row.parent_id,
    user: row.user_id_col ? {
      id: row.user_id_col,
      username: row.username,
      nickname: row.nickname,
    } : null,
  };
}

/**
 * GET /api/v1/comments/post/:postId
 */
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    // 获取总数
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM comments WHERE post_id = $1',
      [parseInt(postId)]
    );
    const total = parseInt(countResult.rows[0].count);

    // 获取顶级评论
    const result = await pool.query(
      `SELECT c.id, c.content, c.like_count, c.created_at, c.updated_at, c.parent_id, c.user_id,
              u.id as user_id_col, u.username, u.nickname
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [parseInt(postId), limitNum, offset]
    );

    const comments = result.rows.map(commentRowToObject);

    // 获取每个顶级评论的回复
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const repliesResult = await pool.query(
          `SELECT c.id, c.content, c.like_count, c.created_at, c.updated_at, c.parent_id, c.user_id,
                  u.id as user_id_col, u.username, u.nickname
           FROM comments c
           LEFT JOIN users u ON c.user_id = u.id
           WHERE c.parent_id = $1
           ORDER BY c.created_at ASC`,
          [comment.id]
        );

        return {
          ...comment,
          replies: repliesResult.rows.map(commentRowToObject),
        };
      })
    );

    res.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(500).json({ success: false, message: '获取评论列表失败' });
  }
});

/**
 * POST /api/v1/comments
 */
router.post('/', async (req, res) => {
  try {
    const { postId, content, parentId, userId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' });
    }
    if (!postId || !userId) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    // 检查帖子是否存在
    const postResult = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 如果有父评论，检查是否存在
    if (parentId) {
      const parentResult = await pool.query('SELECT id FROM comments WHERE id = $1', [parentId]);
      if (parentResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: '回复的评论不存在' });
      }
    }

    // 创建评论
    const result = await pool.query(
      `INSERT INTO comments (post_id, content, parent_id, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, like_count, created_at, parent_id, user_id`,
      [postId, content.trim(), parentId || null, userId]
    );

    const commentRow = result.rows[0];
    const userResult = await pool.query('SELECT id, username, nickname FROM users WHERE id = $1', [userId]);

    const comment = {
      id: commentRow.id,
      content: commentRow.content,
      like_count: commentRow.like_count,
      created_at: commentRow.created_at,
      parent_id: commentRow.parent_id,
      user: userResult.rows[0] ? {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        nickname: userResult.rows[0].nickname,
      } : null,
    };

    // 更新帖子评论数
    await pool.query(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(500).json({ success: false, message: '创建评论失败' });
  }
});

/**
 * DELETE /api/v1/comments/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    // 检查评论是否存在且属于当前用户
    const existResult = await pool.query(
      'SELECT user_id, post_id FROM comments WHERE id = $1',
      [parseInt(id)]
    );

    if (existResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }
    if (existResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此评论' });
    }

    // 删除评论
    await pool.query('DELETE FROM comments WHERE id = $1', [parseInt(id)]);

    // 更新帖子评论数
    await pool.query(
      'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1',
      [existResult.rows[0].post_id]
    );

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ success: false, message: '删除评论失败' });
  }
});

/**
 * POST /api/v1/comments/:id/like
 */
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const commentId = parseInt(id);

    // 检查是否已点赞
    const existingResult = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (existingResult.rows.length > 0) {
      // 取消点赞
      await pool.query('DELETE FROM comment_likes WHERE id = $1', [existingResult.rows[0].id]);
      await pool.query(
        'UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
        [commentId]
      );

      res.json({ success: true, data: { liked: false } });
    } else {
      // 添加点赞
      await pool.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [commentId, userId]
      );
      await pool.query(
        'UPDATE comments SET like_count = like_count + 1 WHERE id = $1',
        [commentId]
      );

      res.json({ success: true, data: { liked: true } });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({ success: false, message: '点赞操作失败' });
  }
});

export default router;

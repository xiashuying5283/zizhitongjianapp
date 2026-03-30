import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

/**
 * GET /api/v1/notifications
 * 获取当前用户的通知列表
 */
router.get('/', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // 获取总数
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [parseInt(userId as string)]
    );
    const total = parseInt(countResult.rows[0].count);

    // 获取未读数
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [parseInt(userId as string)]
    );
    const unreadCount = parseInt(unreadResult.rows[0].count);

    // 获取通知列表
    const result = await pool.query(
      `SELECT n.id, n.type, n.content, n.is_read, n.created_at,
              n.post_id, n.comment_id,
              u.id as from_user_id, u.nickname as from_user_nickname,
              p.title as post_title
       FROM notifications n
       LEFT JOIN users u ON n.from_user_id = u.id
       LEFT JOIN posts p ON n.post_id = p.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [parseInt(userId as string), limitNum, offset]
    );

    const notifications = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      isRead: row.is_read,
      createdAt: row.created_at,
      postId: row.post_id,
      commentId: row.comment_id,
      postTitle: row.post_title,
      fromUser: row.from_user_id ? {
        id: row.from_user_id,
        nickname: row.from_user_nickname,
      } : null,
    }));

    res.json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    res.status(500).json({ success: false, message: '获取通知列表失败' });
  }
});

/**
 * POST /api/v1/notifications/read
 * 标记通知为已读
 */
router.post('/read', async (req, res) => {
  try {
    const { userId, notificationIds } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // 标记指定通知为已读
      await pool.query(
        `UPDATE notifications SET is_read = TRUE
         WHERE id = ANY($1::int[]) AND user_id = $2`,
        [notificationIds, userId]
      );
    } else {
      // 标记所有通知为已读
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
        [userId]
      );
    }

    res.json({ success: true, message: '已标记为已读' });
  } catch (error) {
    console.error('标记通知失败:', error);
    res.status(500).json({ success: false, message: '标记通知失败' });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * 删除通知
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [parseInt(id), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '通知不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({ success: false, message: '删除通知失败' });
  }
});

/**
 * 创建通知的辅助函数
 */
export async function createNotification(params: {
  userId: number;          // 接收通知的用户
  type: 'post_comment' | 'comment_reply';
  fromUserId: number;      // 发起动作的用户
  postId: number;
  commentId: number;
  content?: string;
}) {
  const { userId, type, fromUserId, postId, commentId, content } = params;

  // 不给自己发通知
  if (userId === fromUserId) return;

  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, from_user_id, post_id, comment_id, content)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, fromUserId, postId, commentId, content || null]
    );
  } catch (error) {
    console.error('创建通知失败:', error);
  }
}

export default router;

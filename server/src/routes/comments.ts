import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

/**
 * 服务端文件：server/src/routes/comments.ts
 * 接口：GET /api/v1/comments/post/:postId
 * Path 参数：postId: number
 * Query 参数：page?: number, limit?: number
 */
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const supabase = getSupabaseClient();

    // 获取评论列表（只获取顶级评论，不获取回复）
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        like_count,
        created_at,
        updated_at,
        parent_id,
        user:users(id, username, nickname)
      `)
      .eq('post_id', parseInt(postId))
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('获取评论列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取评论列表失败',
      });
    }

    // 获取每个顶级评论的回复
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            like_count,
            created_at,
            updated_at,
            parent_id,
            user:users(id, username, nickname)
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });

        return {
          ...comment,
          replies: replies || [],
        };
      })
    );

    // 获取总数
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', parseInt(postId));

    res.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        total: count || 0,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/comments.ts
 * 接口：POST /api/v1/comments
 * Body 参数：postId: number, content: string, parentId?: number, userId: number
 */
router.post('/', async (req, res) => {
  try {
    const { postId, content, parentId, userId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空',
      });
    }

    if (!postId || !userId) {
      return res.status(400).json({
        success: false,
        message: '参数错误',
      });
    }

    const supabase = getSupabaseClient();

    // 检查帖子是否存在
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    // 如果有父评论，检查父评论是否存在
    if (parentId) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .single();

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: '回复的评论不存在',
        });
      }
    }

    // 创建评论
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        content: content.trim(),
        parent_id: parentId || null,
        user_id: userId,
      })
      .select(`
        id,
        content,
        like_count,
        created_at,
        parent_id,
        user:users(id, username, nickname)
      `)
      .single();

    if (error) {
      console.error('创建评论失败:', error);
      return res.status(500).json({
        success: false,
        message: '创建评论失败',
      });
    }

    // 更新帖子评论数
    const { data: postUpdate } = await supabase
      .from('posts')
      .select('comment_count')
      .eq('id', postId)
      .single();

    await supabase
      .from('posts')
      .update({ comment_count: (postUpdate?.comment_count || 0) + 1 })
      .eq('id', postId);

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(500).json({
      success: false,
      message: '创建评论失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/comments.ts
 * 接口：DELETE /api/v1/comments/:id
 * Path 参数：id: number
 * Body 参数：userId: number
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    const supabase = getSupabaseClient();

    // 检查评论是否存在且属于当前用户
    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id, post_id')
      .eq('id', parseInt(id))
      .single();

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在',
      });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权删除此评论',
      });
    }

    // 删除评论（级联删除子评论）
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('删除评论失败:', error);
      return res.status(500).json({
        success: false,
        message: '删除评论失败',
      });
    }

    // 更新帖子评论数
    const { data: postUpdate } = await supabase
      .from('posts')
      .select('comment_count')
      .eq('id', existingComment.post_id)
      .single();

    await supabase
      .from('posts')
      .update({ comment_count: Math.max(0, (postUpdate?.comment_count || 1) - 1) })
      .eq('id', existingComment.post_id);

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/comments.ts
 * 接口：POST /api/v1/comments/:id/like
 * Path 参数：id: number
 * Body 参数：userId: number
 */
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    const supabase = getSupabaseClient();

    // 检查是否已点赞
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', parseInt(id))
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // 取消点赞
      await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      // 减少点赞数
      const { data: comment } = await supabase
        .from('comments')
        .select('like_count')
        .eq('id', parseInt(id))
        .single();

      await supabase
        .from('comments')
        .update({ like_count: Math.max(0, (comment?.like_count || 1) - 1) })
        .eq('id', parseInt(id));

      res.json({
        success: true,
        data: { liked: false },
      });
    } else {
      // 添加点赞
      await supabase
        .from('comment_likes')
        .insert({ comment_id: parseInt(id), user_id: userId });

      // 增加点赞数
      const { data: comment } = await supabase
        .from('comments')
        .select('like_count')
        .eq('id', parseInt(id))
        .single();

      await supabase
        .from('comments')
        .update({ like_count: (comment?.like_count || 0) + 1 })
        .eq('id', parseInt(id));

      res.json({
        success: true,
        data: { liked: true },
      });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({
      success: false,
      message: '点赞操作失败',
    });
  }
});

export default router;

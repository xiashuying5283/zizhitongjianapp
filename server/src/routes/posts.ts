import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

// 帖子分类
const VALID_CATEGORIES = ['discussion', 'question', 'sharing', 'notice'];

/**
 * 服务端文件：server/src/routes/posts.ts
 * 接口：GET /api/v1/posts
 * Query 参数：category?: string, userId?: number, page?: number, limit?: number
 */
router.get('/', async (req, res) => {
  try {
    const { category, userId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const supabase = getSupabaseClient();

    // 构建查询
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        category,
        like_count,
        comment_count,
        is_pinned,
        created_at,
        updated_at,
        user:users(id, username, nickname)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (category && VALID_CATEGORIES.includes(category as string)) {
      query = query.eq('category', category);
    }

    if (userId) {
      query = query.eq('user_id', parseInt(userId as string));
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('获取帖子列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取帖子列表失败',
      });
    }

    // 获取总数
    let countQuery = supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (category && VALID_CATEGORIES.includes(category as string)) {
      countQuery = countQuery.eq('category', category);
    }

    if (userId) {
      countQuery = countQuery.eq('user_id', parseInt(userId as string));
    }

    const { count } = await countQuery;

    res.json({
      success: true,
      data: {
        posts: posts || [],
        total: count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((count || 0) / limitNum),
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
 * 服务端文件：server/src/routes/posts.ts
 * 接口：GET /api/v1/posts/:id
 * Path 参数：id: number
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = getSupabaseClient();

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        category,
        like_count,
        comment_count,
        is_pinned,
        created_at,
        updated_at,
        user:users(id, username, nickname)
      `)
      .eq('id', parseInt(id))
      .single();

    if (error || !post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帖子详情失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/posts.ts
 * 接口：POST /api/v1/posts
 * Body 参数：title: string, content: string, category?: string, userId: number
 */
router.post('/', async (req, res) => {
  try {
    const { title, content, category = 'discussion', userId } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '标题和内容不能为空',
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: '标题不能超过200个字符',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: '无效的帖子分类',
      });
    }

    const supabase = getSupabaseClient();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        category,
        user_id: userId,
      })
      .select(`
        id,
        title,
        content,
        category,
        like_count,
        comment_count,
        created_at,
        user:users(id, username, nickname)
      `)
      .single();

    if (error) {
      console.error('创建帖子失败:', error);
      return res.status(500).json({
        success: false,
        message: '创建帖子失败',
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('创建帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '创建帖子失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/posts.ts
 * 接口：PUT /api/v1/posts/:id
 * Path 参数：id: number
 * Body 参数：title?: string, content?: string, category?: string, userId: number
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, userId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    const supabase = getSupabaseClient();

    // 检查帖子是否存在且属于当前用户
    const { data: existingPost } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', parseInt(id))
      .single();

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权编辑此帖子',
      });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category && VALID_CATEGORIES.includes(category)) updateData.category = category;

    const { data: post, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', parseInt(id))
      .select(`
        id,
        title,
        content,
        category,
        like_count,
        comment_count,
        updated_at,
        user:users(id, username, nickname)
      `)
      .single();

    if (error) {
      console.error('更新帖子失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新帖子失败',
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('更新帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '更新帖子失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/posts.ts
 * 接口：DELETE /api/v1/posts/:id
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

    // 检查帖子是否存在且属于当前用户
    const { data: existingPost } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', parseInt(id))
      .single();

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权删除此帖子',
      });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('删除帖子失败:', error);
      return res.status(500).json({
        success: false,
        message: '删除帖子失败',
      });
    }

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '删除帖子失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/posts.ts
 * 接口：POST /api/v1/posts/:id/like
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
      .from('post_likes')
      .select('id')
      .eq('post_id', parseInt(id))
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // 取消点赞
      await supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id);

      // 减少点赞数
      await supabase.rpc('decrement_post_like', { post_id: parseInt(id) });

      res.json({
        success: true,
        data: { liked: false },
      });
    } else {
      // 添加点赞
      await supabase
        .from('post_likes')
        .insert({ post_id: parseInt(id), user_id: userId });

      // 增加点赞数
      const { data: post } = await supabase
        .from('posts')
        .select('like_count')
        .eq('id', parseInt(id))
        .single();

      await supabase
        .from('posts')
        .update({ like_count: (post?.like_count || 0) + 1 })
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

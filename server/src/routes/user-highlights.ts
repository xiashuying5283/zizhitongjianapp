import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// 用户高亮数据结构
interface UserHighlight {
  id: number;
  user_id: number | null;
  device_id: string;
  volume_number: number;
  paragraph_id: number;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserHighlightBody {
  userId?: number;
  deviceId: string;
  volumeNumber: number;
  paragraphId: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  color?: string;
}

/**
 * GET /api/v1/user-highlights
 * 获取用户高亮列表
 * Query 参数：userId (可选), deviceId (可选), volumeNumber (可选), paragraphId (可选)
 */
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, deviceId, volumeNumber, paragraphId } = req.query;

    // 至少需要 userId 或 deviceId
    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        message: '至少需要 userId 或 deviceId',
      });
    }

    const supabase = getSupabaseClient();
    let query = supabase
      .from('user_highlights')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', parseInt(userId as string));
    }

    if (deviceId) {
      query = query.eq('device_id', deviceId as string);
    }

    if (volumeNumber) {
      query = query.eq('volume_number', parseInt(volumeNumber as string));
    }

    if (paragraphId) {
      query = query.eq('paragraph_id', parseInt(paragraphId as string));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch user highlights:', error);
      return res.status(500).json({
        success: false,
        message: '获取用户高亮失败',
      });
    }

    res.json({
      success: true,
      data: data as UserHighlight[],
    });
  } catch (err) {
    console.error('Error fetching user highlights:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/user-highlights
 * 创建用户高亮
 * Body 参数：userId?: number, deviceId: string, volumeNumber: number, paragraphId: number,
 *            startOffset: number, endOffset: number, selectedText: string, color?: string
 */
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const {
      userId,
      deviceId,
      volumeNumber,
      paragraphId,
      startOffset,
      endOffset,
      selectedText,
      color,
    } = req.body as CreateUserHighlightBody;

    // 参数校验
    if ((!userId && !deviceId) || !volumeNumber || !paragraphId || startOffset === undefined || endOffset === undefined || !selectedText) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_highlights')
      .insert({
        user_id: userId || null,
        device_id: deviceId,
        volume_number: volumeNumber,
        paragraph_id: paragraphId,
        start_offset: startOffset,
        end_offset: endOffset,
        selected_text: selectedText,
        color: color || '#FFEB3B',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create user highlight:', error);
      return res.status(500).json({
        success: false,
        message: '创建用户高亮失败',
      });
    }

    res.status(201).json({
      success: true,
      data: data as UserHighlight,
    });
  } catch (err) {
    console.error('Error creating user highlight:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * PUT /api/v1/user-highlights/:id
 * 更新用户高亮
 * Path 参数：id
 * Body 参数：color?: string
 */
router.put('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { color } = req.body;

    if (!color) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_highlights')
      .update({
        color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Failed to update user highlight:', error);
      return res.status(500).json({
        success: false,
        message: '更新用户高亮失败',
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: '用户高亮不存在',
      });
    }

    res.json({
      success: true,
      data: data as UserHighlight,
    });
  } catch (err) {
    console.error('Error updating user highlight:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/v1/user-highlights/:id
 * 删除用户高亮
 * Path 参数：id
 * Query 参数：userId (可选), deviceId (可选)
 */
router.delete('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        message: '至少需要 userId 或 deviceId',
      });
    }

    const supabase = getSupabaseClient();
    let query = supabase
      .from('user_highlights')
      .delete()
      .eq('id', parseInt(id));

    if (userId) {
      query = query.eq('user_id', parseInt(userId as string));
    }

    if (deviceId) {
      query = query.eq('device_id', deviceId as string);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to delete user highlight:', error);
      return res.status(500).json({
        success: false,
        message: '删除用户高亮失败',
      });
    }

    res.json({
      success: true,
      message: '用户高亮已删除',
    });
  } catch (err) {
    console.error('Error deleting user highlight:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;

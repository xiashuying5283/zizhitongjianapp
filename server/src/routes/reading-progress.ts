import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

/**
 * 格式化年份范围（处理公元前年份）
 */
function formatYearRange(start: number | null, end: number | null): string {
  if (!start || !end) return '';
  const startStr = start < 0 ? `前${Math.abs(start)}` : `${start}`;
  const endStr = end < 0 ? `前${Math.abs(end)}` : `${end}`;
  return `${startStr}~${endStr}年`;
}

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：GET /api/v1/reading-progress/recent
 * Query 参数：userId?: number, deviceId?: string
 * 优先使用userId，没有则使用deviceId
 */
router.get('/recent', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少用户ID或设备ID',
      });
    }

    const supabase = getSupabaseClient();

    let query = supabase
      .from('reading_progress')
      .select('*')
      .order('last_read_at', { ascending: false })
      .limit(1);

    // 优先使用userId
    if (userId) {
      query = query.eq('user_id', parseInt(userId as string));
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data: progress, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取最近阅读失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取最近阅读失败',
        error: error.message,
      });
    }

    if (!progress) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // 获取对应的卷信息
    const { data: volume } = await supabase
      .from('zizhitongjian_volumes')
      .select('*')
      .eq('volume_number', progress.volume_number)
      .single();

    res.json({
      success: true,
      data: {
        id: progress.id,
        volume: progress.volume_number,
        name: volume?.volume_name || '',
        era: volume?.dynasty || '',
        year: formatYearRange(volume?.year_start, volume?.year_end),
        progress: progress.progress,
        lastParagraphIndex: progress.last_paragraph_index,
        lastReadAt: progress.last_read_at,
      },
    });
  } catch (error) {
    console.error('获取最近阅读失败:', error);
    res.status(500).json({
      success: false,
      message: '获取最近阅读失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：GET /api/v1/reading-progress
 * Query 参数：userId?: number, deviceId?: string
 */
router.get('/', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少用户ID或设备ID',
      });
    }

    const supabase = getSupabaseClient();

    let query = supabase
      .from('reading_progress')
      .select('*')
      .order('last_read_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', parseInt(userId as string));
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data: progressList, error } = await query;

    if (error) {
      console.error('获取阅读记录失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取阅读记录失败',
        error: error.message,
      });
    }

    // 获取所有卷信息
    const volumeNumbers = progressList?.map(p => p.volume_number) || [];
    const { data: volumes } = await supabase
      .from('zizhitongjian_volumes')
      .select('*')
      .in('volume_number', volumeNumbers);

    const volumeMap = new Map((volumes || []).map(v => [v.volume_number, v]));

    const records = (progressList || []).map(p => {
      const volume = volumeMap.get(p.volume_number);
      let status: 'unread' | 'reading' | 'read' = 'unread';
      if (p.progress >= 100) status = 'read';
      else if (p.progress > 0) status = 'reading';

      return {
        volumeNumber: p.volume_number,
        progress: p.progress,
        lastParagraphIndex: p.last_paragraph_index,
        lastReadAt: p.last_read_at,
        status,
        volumeInfo: volume ? {
          id: volume.id,
          name: volume.volume_name,
          era: volume.dynasty,
          year: formatYearRange(volume.year_start, volume.year_end),
        } : null,
      };
    });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('获取阅读记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取阅读记录失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：POST /api/v1/reading-progress
 * Body 参数：userId?: number, deviceId?: string, volumeNumber: number, progress?: number, lastParagraphIndex?: number
 */
router.post('/', async (req, res) => {
  try {
    const { userId, deviceId, volumeNumber, progress = 0, lastParagraphIndex = 0 } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少用户ID或设备ID',
      });
    }

    if (!volumeNumber) {
      return res.status(400).json({
        success: false,
        message: '缺少卷号',
      });
    }

    const supabase = getSupabaseClient();

    // 构建查询条件
    let query = supabase
      .from('reading_progress')
      .select('id')
      .eq('volume_number', volumeNumber);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    // 查询是否存在
    const { data: existing } = await query.single();

    const recordData: any = {
      progress: Math.min(100, Math.max(0, progress)),
      last_paragraph_index: lastParagraphIndex,
      last_read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let data, error;

    if (existing) {
      // 更新现有记录
      const result = await supabase
        .from('reading_progress')
        .update(recordData)
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // 插入新记录
      const insertData: any = {
        ...recordData,
        volume_number: volumeNumber,
      };
      if (userId) {
        insertData.user_id = userId;
      } else {
        insertData.device_id = deviceId;
      }
      const result = await supabase
        .from('reading_progress')
        .insert(insertData)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('更新阅读进度失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新阅读进度失败',
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        volumeNumber: data.volume_number,
        progress: data.progress,
        lastParagraphIndex: data.last_paragraph_index,
        lastReadAt: data.last_read_at,
      },
    });
  } catch (error) {
    console.error('更新阅读进度失败:', error);
    res.status(500).json({
      success: false,
      message: '更新阅读进度失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/reading-progress.ts
 * 接口：GET /api/v1/reading-progress/status
 * Query 参数：userId?: number, deviceId?: string, volumeNumbers: string
 */
router.get('/status', async (req, res) => {
  try {
    const { userId, deviceId, volumeNumbers } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少用户ID或设备ID',
      });
    }

    if (!volumeNumbers) {
      return res.status(400).json({
        success: false,
        message: '缺少卷号列表',
      });
    }

    const volumes = (volumeNumbers as string).split(',').map(Number).filter(n => !isNaN(n));

    const supabase = getSupabaseClient();

    let query = supabase
      .from('reading_progress')
      .select('volume_number, progress, last_read_at')
      .in('volume_number', volumes);

    if (userId) {
      query = query.eq('user_id', parseInt(userId as string));
    } else {
      query = query.eq('device_id', deviceId);
    }

    const { data: progressList, error } = await query;

    if (error) {
      console.error('获取阅读状态失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取阅读状态失败',
        error: error.message,
      });
    }

    const statusMap: Record<number, { status: string; progress: number }> = {};
    volumes.forEach(v => {
      statusMap[v] = { status: 'unread', progress: 0 };
    });

    progressList?.forEach(p => {
      let status = 'unread';
      if (p.progress >= 100) status = 'read';
      else if (p.progress > 0) status = 'reading';
      statusMap[p.volume_number] = { status, progress: p.progress };
    });

    res.json({
      success: true,
      data: statusMap,
    });
  } catch (error) {
    console.error('获取阅读状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取阅读状态失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

import express, { type Request, type Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 服务端文件：server/src/routes/reading-stats.ts
 * 接口：GET /api/v1/reading-stats/summary
 * Query 参数：userId?: number, deviceId?: string
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    const identifier = userId || deviceId;
    const idField = userId ? 'user_id' : 'device_id';

    // 获取总阅读时长
    const durationResult = await pool.query(
      `SELECT COALESCE(SUM(reading_duration), 0) as total_duration 
       FROM reading_stats WHERE ${idField} = $1`,
      [identifier]
    );
    const totalDuration = parseInt(durationResult.rows[0]?.total_duration || '0', 10);

    // 获取总阅读字数
    const charsResult = await pool.query(
      `SELECT COALESCE(SUM(characters_read), 0) as total_chars 
       FROM reading_stats WHERE ${idField} = $1`,
      [identifier]
    );
    const totalCharacters = parseInt(charsResult.rows[0]?.total_chars || '0', 10);

    // 获取总阅读天数
    const daysResult = await pool.query(
      `SELECT COUNT(DISTINCT stat_date) as days 
       FROM reading_stats WHERE ${idField} = $1 AND reading_duration > 0`,
      [identifier]
    );
    const totalDays = parseInt(daysResult.rows[0]?.days || '0', 10);

    // 获取连续阅读天数
    const streakResult = await pool.query(
      `WITH date_series AS (
        SELECT DISTINCT stat_date 
        FROM reading_stats 
        WHERE ${idField} = $1 AND reading_duration > 0
        ORDER BY stat_date DESC
      )
      SELECT COUNT(*) as streak
      FROM (
        SELECT stat_date, 
               stat_date - (ROW_NUMBER() OVER (ORDER BY stat_date DESC))::int AS grp
        FROM date_series
      ) sub
      WHERE grp = (SELECT stat_date - 0 FROM date_series LIMIT 1)
      `,
      [identifier]
    );
    const currentStreak = parseInt(streakResult.rows[0]?.streak || '0', 10);

    // 获取本周阅读时长
    const weekResult = await pool.query(
      `SELECT COALESCE(SUM(reading_duration), 0) as week_duration 
       FROM reading_stats 
       WHERE ${idField} = $1 AND stat_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [identifier]
    );
    const weekDuration = parseInt(weekResult.rows[0]?.week_duration || '0', 10);

    // 获取本月阅读时长
    const monthResult = await pool.query(
      `SELECT COALESCE(SUM(reading_duration), 0) as month_duration 
       FROM reading_stats 
       WHERE ${idField} = $1 AND stat_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [identifier]
    );
    const monthDuration = parseInt(monthResult.rows[0]?.month_duration || '0', 10);

    res.json({
      success: true,
      data: {
        totalDuration,
        totalCharacters,
        totalDays,
        currentStreak,
        weekDuration,
        monthDuration,
        formattedDuration: formatDuration(totalDuration),
      },
    });
  } catch (error) {
    console.error('获取阅读统计失败:', error);
    res.status(500).json({ success: false, message: '获取阅读统计失败' });
  }
});

/**
 * 服务端文件：server/src/routes/reading-stats.ts
 * 接口：GET /api/v1/reading-stats/daily
 * Query 参数：userId?: number, deviceId?: string, days?: number
 */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, days = '30' } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    const identifier = userId || deviceId;
    const idField = userId ? 'user_id' : 'device_id';
    const daysNum = parseInt(days as string, 10);

    const result = await pool.query(
      `SELECT stat_date, reading_duration, characters_read, paragraphs_read
       FROM reading_stats 
       WHERE ${idField} = $1 AND stat_date >= CURRENT_DATE - $2 * INTERVAL '1 day'
       ORDER BY stat_date DESC`,
      [identifier, daysNum]
    );

    const data = result.rows.map(row => ({
      date: row.stat_date,
      duration: row.reading_duration || 0,
      characters: row.characters_read || 0,
      paragraphs: row.paragraphs_read || 0,
      formattedDuration: formatDuration(row.reading_duration || 0),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取每日统计失败:', error);
    res.status(500).json({ success: false, message: '获取每日统计失败' });
  }
});

/**
 * 服务端文件：server/src/routes/reading-stats.ts
 * 接口：POST /api/v1/reading-stats
 * Body 参数：userId?: number, deviceId?: string, duration: number, volumeNumber?: number, 
 *           paragraphsRead?: number, charactersRead?: number
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId, duration, volumeNumber, paragraphsRead, charactersRead } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    if (duration === undefined || duration <= 0) {
      return res.status(400).json({ success: false, message: '阅读时长必须大于0' });
    }

    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已有记录
    const existingResult = await pool.query(
      `SELECT id, reading_duration, characters_read, paragraphs_read 
       FROM reading_stats 
       WHERE ${userId ? 'user_id' : 'device_id'} = $1 AND stat_date = $2`,
      [userId || deviceId, today]
    );

    if (existingResult.rows.length > 0) {
      // 更新现有记录
      const existing = existingResult.rows[0];
      await pool.query(
        `UPDATE reading_stats 
         SET reading_duration = $1, 
             characters_read = $2,
             paragraphs_read = $3,
             volume_number = COALESCE($4, volume_number),
             updated_at = NOW()
         WHERE id = $5`,
        [
          existing.reading_duration + duration,
          (existing.characters_read || 0) + (charactersRead || 0),
          (existing.paragraphs_read || 0) + (paragraphsRead || 0),
          volumeNumber || null,
          existing.id,
        ]
      );
    } else {
      // 创建新记录
      await pool.query(
        `INSERT INTO reading_stats (user_id, device_id, stat_date, reading_duration, volume_number, paragraphs_read, characters_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId || null,
          deviceId || null,
          today,
          duration,
          volumeNumber || null,
          paragraphsRead || 0,
          charactersRead || 0,
        ]
      );
    }

    // 检查并解锁成就
    await checkAchievements(userId, deviceId);

    res.json({ success: true });
  } catch (error) {
    console.error('记录阅读统计失败:', error);
    res.status(500).json({ success: false, message: '记录阅读统计失败' });
  }
});

/**
 * 服务端文件：server/src/routes/reading-stats.ts
 * 接口：GET /api/v1/reading-stats/achievements
 * Query 参数：userId?: number, deviceId?: string
 */
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: '缺少 userId 或 deviceId' });
    }

    const identifier = userId || deviceId;
    const idField = userId ? 'user_id' : 'device_id';

    // 获取所有成就定义
    const achievementsResult = await pool.query(
      `SELECT id, achievement_type, title, description, icon FROM achievements ORDER BY id`
    );

    // 获取用户已解锁的成就
    const unlockedResult = await pool.query(
      `SELECT achievement_id, unlocked_at 
       FROM user_achievements 
       WHERE ${idField} = $1`,
      [identifier]
    );

    const unlockedMap = new Map(
      unlockedResult.rows.map(row => [row.achievement_id, row.unlocked_at])
    );

    const data = achievementsResult.rows.map(row => ({
      id: row.id,
      type: row.achievement_type,
      title: row.title,
      description: row.description,
      icon: row.icon,
      unlocked: unlockedMap.has(row.id),
      unlockedAt: unlockedMap.get(row.id) || null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取成就失败:', error);
    res.status(500).json({ success: false, message: '获取成就失败' });
  }
});

// 格式化时长
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
  }
}

// 检查并解锁成就
async function checkAchievements(userId: number | undefined, deviceId: string | undefined) {
  const identifier = userId || deviceId;
  const idField = userId ? 'user_id' : 'device_id';

  // 获取用户统计数据
  const statsResult = await pool.query(
    `SELECT 
       COALESCE(SUM(reading_duration), 0) as total_duration,
       COALESCE(SUM(characters_read), 0) as total_characters,
       COUNT(DISTINCT stat_date) as total_days
     FROM reading_stats WHERE ${idField} = $1`,
    [identifier]
  );

  const stats = statsResult.rows[0];
  const totalDuration = parseInt(stats?.total_duration || '0', 10);
  const totalCharacters = parseInt(stats?.total_characters || '0', 10);

  // 获取已完成卷数
  const volumesResult = await pool.query(
    `SELECT COUNT(DISTINCT volume_number) as count 
     FROM reading_progress 
     WHERE ${idField} = $1 AND progress >= 100`,
    [identifier]
  );
  const volumesCompleted = parseInt(volumesResult.rows[0]?.count || '0', 10);

  // 获取连续阅读天数
  const streakResult = await pool.query(
    `WITH date_series AS (
      SELECT DISTINCT stat_date 
      FROM reading_stats 
      WHERE ${idField} = $1 AND reading_duration > 0
      ORDER BY stat_date DESC
    )
    SELECT COUNT(*) as streak
    FROM (
      SELECT stat_date, 
             stat_date - (ROW_NUMBER() OVER (ORDER BY stat_date DESC))::int AS grp
      FROM date_series
    ) sub
    WHERE grp = (SELECT stat_date - 0 FROM date_series LIMIT 1)
    `,
    [identifier]
  );
  const currentStreak = parseInt(streakResult.rows[0]?.streak || '0', 10);

  // 获取所有成就定义
  const achievementsResult = await pool.query(
    `SELECT id, achievement_type, condition_data FROM achievements`
  );

  // 检查每个成就
  for (const achievement of achievementsResult.rows) {
    const condition = achievement.condition_data;
    let shouldUnlock = false;

    switch (condition.type) {
      case 'total_duration':
        shouldUnlock = totalDuration >= condition.value;
        break;
      case 'total_characters':
        shouldUnlock = totalCharacters >= condition.value;
        break;
      case 'volumes_completed':
        shouldUnlock = volumesCompleted >= condition.value;
        break;
      case 'streak':
        shouldUnlock = currentStreak >= condition.value;
        break;
    }

    if (shouldUnlock) {
      // 尝试解锁
      await pool.query(
        `INSERT INTO user_achievements (user_id, device_id, achievement_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId || null, deviceId || null, achievement.id]
      );
    }
  }
}

export default router;

import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ==================== 人物接口 ====================

/**
 * 服务端文件：server/src/routes/characters.ts
 * 接口：GET /api/v1/characters
 * 获取所有历史人物
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, dynasty, title, personality, speaking_style, avatar, related_topics FROM historical_characters ORDER BY dynasty, name'
    );
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        dynasty: row.dynasty,
        title: row.title,
        personality: row.personality,
        speakingStyle: row.speaking_style,
        avatar: row.avatar,
        relatedTopics: row.related_topics || [],
      })),
    });
  } catch (error) {
    console.error('获取人物列表失败:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * 服务端文件：server/src/routes/characters.ts
 * 接口：GET /api/v1/characters/by-topic/:topicId
 * 根据话题获取相关人物
 */
router.get('/by-topic/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const result = await pool.query(
      'SELECT id, name, dynasty, title, personality, speaking_style, avatar, related_topics FROM historical_characters WHERE $1 = ANY(related_topics) ORDER BY name',
      [topicId]
    );
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        dynasty: row.dynasty,
        title: row.title,
        personality: row.personality,
        speakingStyle: row.speaking_style,
        avatar: row.avatar,
        relatedTopics: row.related_topics || [],
      })),
    });
  } catch (error) {
    console.error('获取话题人物失败:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * 服务端文件：server/src/routes/characters.ts
 * 接口：GET /api/v1/characters/:id
 * 获取单个人物详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM historical_characters WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '人物不存在' });
    }
    
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        dynasty: row.dynasty,
        title: row.title,
        personality: row.personality,
        speakingStyle: row.speaking_style,
        avatar: row.avatar,
        skillData: row.skill_data,
        relatedTopics: row.related_topics || [],
      },
    });
  } catch (error) {
    console.error('获取人物详情失败:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * 服务端文件：server/src/routes/characters.ts
 * 接口：POST /api/v1/characters
 * 创建新人物
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, dynasty, title, personality, speakingStyle, avatar, relatedTopics } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'id和名称不能为空' });
    }
    
    await pool.query(
      `INSERT INTO historical_characters (id, name, dynasty, title, personality, speaking_style, avatar, related_topics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, name, dynasty, title, personality, speakingStyle, avatar, relatedTopics || []]
    );
    
    res.json({ success: true, message: '创建成功' });
  } catch (error) {
    console.error('创建人物失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

export default router;

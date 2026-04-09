import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

/**
 * GET /api/v1/historical-characters
 * 获取群聊历史人物列表
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id, name, dynasty, title, personality, speaking_style as "speakingStyle",
             avatar, skill_data as "skillData", related_topics as "relatedTopics"
      FROM historical_characters
      ORDER BY name
    `);

        const characters = result.rows.map((row: any) => ({
            ...row,
            skillData: row.skillData || { constraints: [] },
            relatedTopics: row.relatedTopics || [],
        }));

        res.json({ success: true, data: characters });
    } catch (error) {
        console.error('获取历史人物失败:', error);
        res.status(500).json({ success: false, message: '获取历史人物失败' });
    }
});

/**
 * GET /api/v1/historical-characters/by-topic/:topicId
 * 根据话题获取相关历史人物
 */
router.get('/by-topic/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;

        const result = await pool.query(`
      SELECT id, name, dynasty, title, personality, speaking_style as "speakingStyle",
             avatar, skill_data as "skillData", related_topics as "relatedTopics"
      FROM historical_characters
      WHERE $1 = ANY(related_topics)
      ORDER BY name
    `, [topicId]);

        const characters = result.rows.map((row: any) => ({
            ...row,
            skillData: row.skillData || { constraints: [] },
            relatedTopics: row.relatedTopics || [],
        }));

        res.json({ success: true, data: characters });
    } catch (error) {
        console.error('获取话题人物失败:', error);
        res.status(500).json({ success: false, message: '获取话题人物失败' });
    }
});

/**
 * GET /api/v1/historical-characters/:id
 * 获取单个历史人物详情
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT id, name, dynasty, title, personality, speaking_style as "speakingStyle",
             avatar, skill_data as "skillData", related_topics as "relatedTopics"
      FROM historical_characters
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: '人物不存在' });
        }

        const character = {
            ...result.rows[0],
            skillData: result.rows[0].skillData || { constraints: [] },
            relatedTopics: result.rows[0].relatedTopics || [],
        };

        res.json({ success: true, data: character });
    } catch (error) {
        console.error('获取人物详情失败:', error);
        res.status(500).json({ success: false, message: '获取人物详情失败' });
    }
});

export default router;

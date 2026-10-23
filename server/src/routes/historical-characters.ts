import { Router } from 'express';
import { getPgPool } from '../storage/database/pg-pool';

const pool = getPgPool();
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

export default router;

import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

/**
 * 获取人物百科
 * GET /api/v1/encyclopedia/characters/:name
 */
router.get('/characters/:name', async (req, res) => {
    try {
        const { name } = req.params;

        // 先按 name 精确匹配
        const result = await pool.query(
            'SELECT * FROM characters WHERE name = $1 LIMIT 1',
            [name]
        );

        let character = result.rows[0];

        // 如果没找到，再在别名中查找
        if (!character) {
            const aliasResult = await pool.query(
                "SELECT * FROM characters WHERE $1 = ANY(string_to_array(aliases, ','))",
                [name]
            );
            character = aliasResult.rows[0];
        }

        if (!character) {
            return res.status(404).json({
                success: false,
                error: '人物未找到'
            });
        }

        // 将 aliases 字段从字符串转换为数组
        const processedData = {
            ...character,
            aliases: character.aliases ? character.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        };

        res.json({
            success: true,
            data: processedData
        });
    } catch (error) {
        console.error('获取人物百科失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 获取官职百科
 * GET /api/v1/encyclopedia/titles/:name
 */
router.get('/titles/:name', async (req, res) => {
    try {
        const { name } = req.params;

        // 先按 name 精确匹配
        const result = await pool.query(
            'SELECT * FROM titles WHERE name = $1 LIMIT 1',
            [name]
        );

        let title = result.rows[0];

        // 如果没找到，再在别名中查找
        if (!title) {
            const aliasResult = await pool.query(
                "SELECT * FROM titles WHERE $1 = ANY(string_to_array(aliases, ','))",
                [name]
            );
            title = aliasResult.rows[0];
        }

        if (!title) {
            return res.status(404).json({
                success: false,
                error: '官职未找到'
            });
        }

        // 将 aliases 字段从字符串转换为数组
        const processedData = {
            ...title,
            aliases: title.aliases ? title.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        };

        res.json({
            success: true,
            data: processedData
        });
    } catch (error) {
        console.error('获取官职百科失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 获取所有人物列表
 * GET /api/v1/encyclopedia/characters
 */
router.get('/characters', async (req, res) => {
    try {
        const { dynasty, limit = 20, offset = 0 } = req.query;

        let query = 'SELECT * FROM characters';
        const params: unknown[] = [];

        if (dynasty) {
            query += ' WHERE dynasty = $1';
            params.push(dynasty);
        }

        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), Number(offset));

        const result = await pool.query(query, params);

        // 将 aliases 字段从字符串转换为数组
        const processedData = result.rows.map((item: any) => ({
            ...item,
            aliases: item.aliases ? item.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        }));

        res.json({
            success: true,
            data: processedData
        });
    } catch (error) {
        console.error('获取人物列表失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 获取所有官职列表
 * GET /api/v1/encyclopedia/titles
 */
router.get('/titles', async (req, res) => {
    try {
        const { dynasty, limit = 20, offset = 0 } = req.query;

        let query = 'SELECT * FROM titles';
        const params: unknown[] = [];

        if (dynasty) {
            query += ' WHERE dynasty = $1';
            params.push(dynasty);
        }

        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), Number(offset));

        const result = await pool.query(query, params);

        // 将 aliases 字段从字符串转换为数组
        const processedData = result.rows.map((item: any) => ({
            ...item,
            aliases: item.aliases ? item.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        }));

        res.json({
            success: true,
            data: processedData
        });
    } catch (error) {
        console.error('获取官职列表失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 批量获取人物/官职信息（用于前端高亮）
 * POST /api/v1/encyclopedia/batch
 */
router.post('/batch', async (req, res) => {
    try {
        const { names } = req.body; // names: string[]

        if (!Array.isArray(names) || names.length === 0) {
            return res.status(400).json({
                success: false,
                error: '参数错误'
            });
        }

        // 并行查询人物和官职
        const [characterResult, titleResult] = await Promise.all([
            pool.query('SELECT * FROM characters WHERE name = ANY($1)', [names]),
            pool.query('SELECT * FROM titles WHERE name = ANY($1)', [names])
        ]);

        // 合并结果，并将 aliases 字段从字符串转换为数组
        const results = [
            ...characterResult.rows.map((c: any) => ({
                ...c,
                type: 'character',
                aliases: c.aliases ? c.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
            })),
            ...titleResult.rows.map((t: any) => ({
                ...t,
                type: 'title',
                aliases: t.aliases ? t.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
            }))
        ];

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('批量获取失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

export default router;

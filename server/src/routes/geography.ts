import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/v1/geography
 * 获取地理数据列表（分页、筛选、搜索）
 * Query: page, limit, category, dynasty, name
 */
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '50', category, dynasty, name } = req.query;
        const pageNum = Math.max(1, parseInt(page as string));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
        const offset = (pageNum - 1) * limitNum;

        let where = 'WHERE 1=1';
        const params: any[] = [];
        let paramIdx = 1;

        if (category) {
            where += ` AND category = $${paramIdx++}`;
            params.push(category);
        }
        if (dynasty) {
            where += ` AND dynasty = $${paramIdx++}`;
            params.push(dynasty);
        }
        if (name) {
            where += ` AND (name ILIKE $${paramIdx} OR aliases::text ILIKE $${paramIdx})`;
            params.push(`%${name}%`);
            paramIdx++;
        }

        const countResult = await pool.query(`SELECT count(*) FROM geography ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        const dataParams = [...params, limitNum, offset];
        const dataResult = await pool.query(
            `SELECT id, slug, name, aliases, category, level, dynasty, location, lng, lat, description FROM geography ${where} ORDER BY name ASC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
            dataParams
        );

        res.json({
            success: true,
            data: {
                items: dataResult.rows,
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('获取地理数据失败:', error);
        res.status(500).json({ success: false, message: '获取地理数据失败', error: String(error) });
    }
});

/**
 * GET /api/v1/geography/categories
 * 获取所有分类及计数
 */
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT category, count(*) as count FROM geography WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

/**
 * GET /api/v1/geography/dynasties
 * 获取所有朝代及计数
 */
router.get('/dynasties', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT dynasty, count(*) as count FROM geography WHERE dynasty IS NOT NULL GROUP BY dynasty ORDER BY count DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('获取朝代失败:', error);
        res.status(500).json({ success: false, message: '获取朝代失败' });
    }
});

/**
 * GET /api/v1/geography/:id
 * 获取单个地理位置详情
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const numId = Number(id);
        if (isNaN(numId)) {
            return res.status(400).json({ success: false, message: '无效ID' });
        }

        const result = await pool.query(
            `SELECT * FROM geography WHERE id = $1`,
            [numId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: '未找到该地理位置' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('获取地理详情失败:', error);
        res.status(500).json({ success: false, message: '获取地理详情失败' });
    }
});

export default router;

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

/**
 * 获取所有朝代列表
 * GET /api/v1/encyclopedia/dynasties
 */
router.get('/dynasties', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT dynasty FROM era_years ORDER BY dynasty');
        const dynasties = result.rows.map((row: any) => row.dynasty);

        res.json({
            success: true,
            data: dynasties
        });
    } catch (error) {
        console.error('获取朝代列表失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 获取年号列表
 * GET /api/v1/encyclopedia/era-years
 * Query参数：dynasty（可选）、search（可选）、limit（默认100）、offset（默认0）
 */
router.get('/era-years', async (req, res) => {
    try {
        const { dynasty, search, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT * FROM era_years';
        let countQuery = 'SELECT COUNT(*) FROM era_years';
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (dynasty && dynasty !== '全部') {
            conditions.push(`dynasty = $${params.length + 1}`);
            params.push(dynasty);
        }

        if (search) {
            const searchParam = `%${search}%`;
            conditions.push(`(era_name ILIKE $${params.length + 1} OR emperor_name ILIKE $${params.length + 1} OR display_name ILIKE $${params.length + 1})`);
            params.push(searchParam);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ` ORDER BY gregorian_year ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), Number(offset));

        const [dataResult, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, params.slice(0, -2)) // count不需要limit和offset参数
        ]);

        const total = parseInt(countResult.rows[0].count, 10);

        res.json({
            success: true,
            data: {
                list: dataResult.rows,
                total,
                hasMore: total > Number(offset) + Number(limit)
            }
        });
    } catch (error) {
        console.error('获取年号列表失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 获取年号详情
 * GET /api/v1/encyclopedia/era-years/:id
 */
router.get('/era-years/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT * FROM era_years WHERE id = $1 LIMIT 1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: '年号未找到'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('获取年号详情失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 按年号名称分组获取（用于展示年号起止年份）
 * GET /api/v1/encyclopedia/era-groups
 * Query参数：dynasty（支持历史时期分组，如"周秦"、"兩漢"等）
 */
router.get('/era-groups', async (req, res) => {
    try {
        const { dynasty } = req.query;

        // 历史时期与具体朝代的映射（支持繁简两种形式）
        const PERIOD_DYNASTY_MAP: Record<string, string[]> = {
            // 繁体
            '周秦': ['周', '秦'],
            '兩漢': ['西汉', '新', '玄汉', '东汉'],
            '三國兩晉': ['魏', '西晋', '东晋'],
            '南北朝': ['宋', '齐', '梁', '陈'],
            '隋唐': ['隋', '唐'],
            '五代': ['后梁', '后唐', '后晋', '后汉', '后周'],
            // 简体
            '两汉': ['西汉', '新', '玄汉', '东汉'],
            '三国两晋': ['魏', '西晋', '东晋'],
        };

        let query = 'SELECT era_name, emperor_name, dynasty, gregorian_year FROM era_years';
        const params: unknown[] = [];

        // 处理历史时期分组查询
        if (dynasty && dynasty !== '全部') {
            const dynastyStr = dynasty as string;
            // 检查是否是历史时期分组
            if (PERIOD_DYNASTY_MAP[dynastyStr]) {
                const placeholders = PERIOD_DYNASTY_MAP[dynastyStr].map((_, i) => `$${i + 1}`).join(', ');
                query += ` WHERE dynasty IN (${placeholders})`;
                params.push(...PERIOD_DYNASTY_MAP[dynastyStr]);
            } else {
                // 单一朝代查询
                query += ' WHERE dynasty = $1';
                params.push(dynastyStr);
            }
        }

        query += ' ORDER BY gregorian_year ASC';

        const result = await pool.query(query, params);
        const data = result.rows;

        // 按年号名称分组，计算起止年份
        const eraMap = new Map<string, {
            era_name: string;
            emperor_name: string;
            dynasty: string;
            startYear: number;
            endYear: number;
            yearCount: number;
        }>();

        data.forEach((item: any) => {
            const key = `${item.era_name}_${item.emperor_name}`;
            if (!eraMap.has(key)) {
                eraMap.set(key, {
                    era_name: item.era_name,
                    emperor_name: item.emperor_name,
                    dynasty: item.dynasty,
                    startYear: item.gregorian_year,
                    endYear: item.gregorian_year,
                    yearCount: 1
                });
            } else {
                const existing = eraMap.get(key)!;
                existing.endYear = Math.max(existing.endYear, item.gregorian_year);
                existing.startYear = Math.min(existing.startYear, item.gregorian_year);
                existing.yearCount++;
            }
        });

        // 转换为数组并按朝代分组
        const eraList = Array.from(eraMap.values());

        // 按朝代分组
        const dynastyGroups = new Map<string, typeof eraList>();
        eraList.forEach(era => {
            if (!dynastyGroups.has(era.dynasty)) {
                dynastyGroups.set(era.dynasty, []);
            }
            dynastyGroups.get(era.dynasty)!.push(era);
        });

        // 转换为数组格式
        const groups = Array.from(dynastyGroups.entries()).map(([dynasty, eras]) => ({
            dynasty,
            eras: eras.sort((a, b) => a.startYear - b.startYear)
        })).sort((a, b) => {
            const minYearA = Math.min(...a.eras.map(e => e.startYear));
            const minYearB = Math.min(...b.eras.map(e => e.startYear));
            return minYearA - minYearB;
        });

        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        console.error('获取年号分组失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

/**
 * 获取年号详情（含背景简述和重大纪事）
 * GET /api/v1/encyclopedia/era-years/detail
 * Query参数：eraName, emperorName
 */
router.get('/era-years/detail', async (req, res) => {
    try {
        const { eraName, emperorName } = req.query;
        console.log('[era-years/detail] 查询参数:', { eraName, emperorName });

        if (!eraName) {
            console.log('[era-years/detail] 缺少eraName参数');
            return res.status(400).json({
                success: false,
                error: '缺少eraName参数'
            });
        }

        // 查询年号所有年份的记录
        let query = 'SELECT * FROM era_years WHERE era_name = $1';
        const params: unknown[] = [eraName];

        if (emperorName) {
            query += ' AND emperor_name = $2';
            params.push(emperorName);
        }

        query += ' ORDER BY gregorian_year ASC';

        const result = await pool.query(query, params);
        const data = result.rows;
        console.log('[era-years/detail] 查询结果:', { dataCount: data?.length });

        if (!data || data.length === 0) {
            console.log('[era-years/detail] 数据为空');
            return res.status(404).json({
                success: false,
                error: '年号未找到'
            });
        }

        // 提取基本信息
        const firstRecord = data[0];
        const startYear = Math.min(...data.map((d: any) => d.gregorian_year));
        const endYear = Math.max(...data.map((d: any) => d.gregorian_year));

        // 构建背景简述（如果有note字段）
        const background = firstRecord.note || null;

        // 构建重大纪事（根据每年记录生成）
        const events = data
            .filter((d: any) => d.display_name || d.note)
            .map((d: any) => ({
                year: d.display_name || `${firstRecord.era_name}${d.gregorian_year - startYear + 1}年`,
                event: d.note || ''
            }))
            .filter((e: any) => e.event); // 只保留有事件的记录

        res.json({
            success: true,
            data: {
                era_name: firstRecord.era_name,
                emperor_name: firstRecord.emperor_name,
                dynasty: firstRecord.dynasty,
                startYear,
                endYear,
                yearCount: data.length,
                background,
                events
            }
        });
    } catch (error) {
        console.error('获取年号详情失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

export default router;

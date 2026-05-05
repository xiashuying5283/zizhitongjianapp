import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * 获取人物百科
 * GET /api/v1/encyclopedia/characters/:name
 */
router.get('/characters/:name', async (req, res) => {
    try {
        const { name } = req.params;

        // 先按 name 精确匹配
        const result = await pool.query(
            'SELECT * FROM characters WHERE name = $1',
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

        // 处理 aliases 字段
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
            'SELECT * FROM official_posts WHERE name = $1',
            [name]
        );

        let title = result.rows[0];

        // 如果没找到，再在别名中查找
        if (!title) {
            const aliasResult = await pool.query(
                "SELECT * FROM official_posts WHERE $1 = ANY(SELECT jsonb_array_elements_text(COALESCE(aliases, '[]'::jsonb)))",
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

        // 处理 aliases 字段
        const processedData = {
            ...title,
            aliases: Array.isArray(title.aliases) ? title.aliases :
                (typeof title.aliases === 'string' ? JSON.parse(title.aliases) : [])
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

        let query = 'SELECT * FROM characters WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (dynasty) {
            query += ` AND dynasty = $${paramIndex}`;
            params.push(dynasty);
            paramIndex++;
        }

        // 分页
        query += ` ORDER BY id LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Number(limit));
        params.push(Number(offset));

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
        const { search, category, dynasty, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM official_posts WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (dynasty) {
            query += ` AND dynasty ILIKE $${paramIndex}`;
            params.push(`%${dynasty}%`);
            paramIndex++;
        }

        // 获取总数
        const countResult = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as subq`, params);
        const total = parseInt(countResult.rows[0].total);

        // 分页
        query += ` ORDER BY id LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Number(limit));
        params.push(Number(offset));

        const result = await pool.query(query, params);

        // 处理 aliases 字段
        const processedData = result.rows.map((item: any) => ({
            ...item,
            aliases: Array.isArray(item.aliases) ? item.aliases :
                (typeof item.aliases === 'string' ? JSON.parse(item.aliases) : [])
        }));

        res.json({
            success: true,
            data: {
                titles: processedData,
                total,
                limit: Number(limit),
                offset: Number(offset)
            }
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

        // 构建查询
        let query = 'SELECT * FROM era_years WHERE era_name = $1';
        const params: any[] = [eraName];

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

        // 构建背景简述
        const background = firstRecord.note || `${firstRecord.era_name}是${firstRecord.dynasty}${firstRecord.emperor_name}時期的年號，共使用${data.length}年。`;

        // 构建重大纪事（从 event 字段获取）
        const events = data
            .filter((d: any) => d.event)
            .map((d: any) => ({
                eraYear: d.display_name || `${firstRecord.era_name}${d.gregorian_year - startYear + 1}年`,
                year: d.gregorian_year < 0 ? `公元前${Math.abs(d.gregorian_year)}年` : `公元${d.gregorian_year}年`,
                desc: d.event
            }));

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

        let allData: any[] = [];
        const dynastyStr = dynasty as string | undefined;

        if (!dynastyStr || dynastyStr === '全部') {
            // 查询全部时，分批查询各时期
            const periods = ['周秦', '兩漢', '三國兩晉', '南北朝', '隋唐', '五代'];
            for (const period of periods) {
                const dynasties = PERIOD_DYNASTY_MAP[period];
                if (dynasties) {
                    const result = await pool.query(
                        `SELECT era_name, emperor_name, dynasty, gregorian_year 
                         FROM era_years 
                         WHERE dynasty = ANY($1) 
                         ORDER BY gregorian_year ASC`,
                        [dynasties]
                    );
                    allData = allData.concat(result.rows);

                    // 周秦时期排除武则天
                    if (period === '周秦') {
                        allData = allData.filter(d => d.emperor_name !== '武则天');
                    }
                    // 隋唐时期额外查询武则天
                    if (period === '隋唐') {
                        const wuzetianResult = await pool.query(
                            `SELECT era_name, emperor_name, dynasty, gregorian_year 
                             FROM era_years 
                             WHERE emperor_name = $1`,
                            ['武则天']
                        );
                        allData = allData.concat(wuzetianResult.rows);
                    }
                }
            }
        } else {
            // 单一时期查询
            if (PERIOD_DYNASTY_MAP[dynastyStr]) {
                // 检查是否是历史时期分组
                let query = `SELECT era_name, emperor_name, dynasty, gregorian_year 
                            FROM era_years 
                            WHERE dynasty = ANY($1)`;
                const params: any[] = [PERIOD_DYNASTY_MAP[dynastyStr]];

                // 周秦时期排除武则天
                if (dynastyStr === '周秦') {
                    query += ' AND emperor_name != $2';
                    params.push('武则天');
                }

                query += ' ORDER BY gregorian_year ASC';
                const result = await pool.query(query, params);
                allData = result.rows;

                // 如果是隋唐时期，额外查询武则天的年号
                if (dynastyStr === '隋唐') {
                    const wuzetianResult = await pool.query(
                        `SELECT era_name, emperor_name, dynasty, gregorian_year 
                         FROM era_years 
                         WHERE emperor_name = $1`,
                        ['武则天']
                    );
                    allData = allData.concat(wuzetianResult.rows);
                }
            } else {
                // 单一朝代查询
                const result = await pool.query(
                    `SELECT era_name, emperor_name, dynasty, gregorian_year 
                     FROM era_years 
                     WHERE dynasty = $1 
                     ORDER BY gregorian_year ASC`,
                    [dynastyStr]
                );
                allData = result.rows;
            }
        }

        console.log('[era-groups] 查询结果:', { totalRecords: allData.length, dynasty: dynastyStr });

        // 按年号名称分组，计算起止年份
        const eraMap = new Map<string, {
            era_name: string;
            emperor_name: string;
            dynasty: string;
            startYear: number;
            endYear: number;
            yearCount: number;
        }>();

        allData.forEach((item: any) => {
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

        // 按朝代分组，武则天的周归入唐朝
        const dynastyGroups = new Map<string, typeof eraList>();
        eraList.forEach(era => {
            // 武则天的周（武周）归入唐朝
            let groupDynasty = era.dynasty;
            if (era.emperor_name === '武则天' && era.dynasty === '周') {
                groupDynasty = '唐';
            }

            if (!dynastyGroups.has(groupDynasty)) {
                dynastyGroups.set(groupDynasty, []);
            }
            dynastyGroups.get(groupDynasty)!.push(era);
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

export default router;

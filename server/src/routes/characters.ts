import { Router } from 'express';
import { Pool } from 'pg';
import OpenAI from 'openai';
import cnchar from 'cnchar';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// 处理状态
let enrichStatus = {
  running: false,
  total: 0,
  processed: 0,
  lastBatch: 0,
  error: null as string | null,
};

// 批量补全传记状态
let fillBioStatus = {
  running: false,
  total: 0,
  processed: 0,
  lastBatch: 0,
  error: null as string | null,
};

/**
 * GET /api/v1/characters/graph
 */
router.get('/graph', async (req, res) => {
  try {
    const { era, characterId } = req.query;

    // 必须选择纪或人物才能加载图谱
    if (!era && !characterId) {
      return res.json({
        success: true,
        data: {
          nodes: [],
          edges: [],
        },
      });
    }

    let charactersResult;
    let characterIds: number[] = [];

    if (characterId) {
      const id = parseInt(characterId as string);

      // 获取相关人物 ID
      const relResult = await pool.query(
          'SELECT character_id, related_character_id FROM character_relations WHERE character_id = $1 OR related_character_id = $1',
          [id]
      );

      const relatedIds = new Set([id]);
      for (const r of relResult.rows) {
        relatedIds.add(r.character_id);
        relatedIds.add(r.related_character_id);
      }

      charactersResult = await pool.query(
          'SELECT id, name, title, era FROM characters WHERE id = ANY($1)',
          [Array.from(relatedIds)]
      );
    } else if (era) {
      charactersResult = await pool.query(
          'SELECT id, name, title, era FROM characters WHERE era = $1',
          [era]
      );
    }

    const characters = charactersResult?.rows || [];
    characterIds = characters.map((c: any) => c.id);

    let relations = [];
    if (characterIds.length > 0) {
      const relResult = await pool.query(
          `SELECT id, character_id, related_character_id, relation_type, description
           FROM character_relations
           WHERE character_id = ANY($1) AND related_character_id = ANY($1)`,
          [characterIds]
      );
      relations = relResult.rows;
    }

    res.json({
      success: true,
      data: {
        nodes: characters,
        edges: relations,
      },
    });
  } catch (error) {
    console.error('获取图谱数据失败:', error);
    res.status(500).json({ success: false, message: '获取图谱数据失败' });
  }
});

/**
 * GET /api/v1/characters/eras
 */
router.get('/eras', async (req, res) => {
  try {
    // 资治通鉴纪的顺序
    const eraOrder = ['周纪', '秦纪', '汉纪', '魏纪', '晋纪', '宋纪', '齐纪', '梁纪', '陈纪', '隋纪', '唐纪', '后梁纪', '后唐纪', '后晋纪', '后汉纪', '后周纪'];

    const result = await pool.query(
        'SELECT era, COUNT(*) as count FROM characters WHERE era IS NOT NULL GROUP BY era'
    );

    const eraMap = new Map<string, number>();
    result.rows.forEach((item: any) => {
      eraMap.set(item.era, parseInt(item.count));
    });

    // 按资治通鉴顺序排列
    const eras = eraOrder
        .filter(era => eraMap.has(era))
        .map(era => ({
          name: era,
          count: eraMap.get(era) || 0,
        }));

    res.json({ success: true, data: eras });
  } catch (error) {
    console.error('获取朝代列表失败:', error);
    res.status(500).json({ success: false, message: '获取朝代列表失败' });
  }
});

/**
 * GET /api/v1/characters
 */
router.get('/', async (req, res) => {
  try {
    const { era, name, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (era) {
      conditions.push(`era = $${paramIndex++}`);
      params.push(era);
    }
    if (name) {
      // 同时搜索name和aliases字段
      conditions.push(`(name ILIKE $${paramIndex} OR aliases::text ILIKE $${paramIndex})`);
      params.push(`%${name}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
        `SELECT COUNT(*) FROM characters ${where}`,
        params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
        `SELECT id, name, title, era, birth_year, death_year, summary FROM characters ${where} ORDER BY id LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: {
        characters: result.rows,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取人物列表失败:', error);
    res.status(500).json({ success: false, message: '获取人物列表失败' });
  }
});

/**
 * POST /api/v1/characters/enrich
 * 批量提取人物的 aliases 和 title
 */
router.post('/enrich', async (req, res) => {
  if (enrichStatus.running) {
    return res.json({ success: true, message: '任务已在运行中', status: enrichStatus });
  }

  // 重置状态
  enrichStatus = { running: true, total: 0, processed: 0, lastBatch: 0, error: null };

  // 异步处理
  (async () => {
    try {
      // 获取所有有 summary 但缺少 title 或 aliases 的人物
      const countResult = await pool.query(
          `SELECT COUNT(*) FROM characters WHERE summary IS NOT NULL AND (title IS NULL OR aliases IS NULL)`
      );
      enrichStatus.total = parseInt(countResult.rows[0].count);
      console.log(`开始处理 ${enrichStatus.total} 条人物数据...`);

      const batchSize = 30;
      let offset = 0;

      while (true) {
        const result = await pool.query(
            `SELECT id, name, summary, era FROM characters
             WHERE summary IS NOT NULL AND (title IS NULL OR aliases IS NULL)
             ORDER BY id LIMIT $1 OFFSET $2`,
            [batchSize, offset]
        );

        if (result.rows.length === 0) break;

        // 构建 prompt
        const characters = result.rows.map((c: any) => ({
          id: c.id,
          name: c.name,
          summary: c.summary,
          era: c.era,
        }));

        const prompt = `请从以下中国历史人物信息中提取【职位/头衔】和【别名】。

规则：
1. title：提取人物的主要职位或身份（如：皇帝、丞相、大将军、太守等），只取最重要的一个，不要超过10个字
2. aliases：提取人物的别名、字、号、谥号、庙号等，用数组格式

输入数据（JSON数组）：
${JSON.stringify(characters, null, 2)}

请直接返回JSON数组格式，不要其他解释：
[{"id": 1, "title": "职位", "aliases": ["别名1", "别名2"]}, ...]

如果没有找到对应信息，title填null，aliases填空数组[]`;

        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: '你是中国历史专家，擅长从文献中提取人物信息。只返回JSON，不要其他内容。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        });

        // 解析结果
        let extracted: Array<{ id: number; title: string | null; aliases: string[] }> = [];
        try {
          const content = response.choices[0]?.message?.content?.trim() || '';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            extracted = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('解析LLM响应失败:', e);
        }

        // 更新数据库
        for (const item of extracted) {
          if (item.title || (item.aliases && item.aliases.length > 0)) {
            await pool.query(
                `UPDATE characters SET title = COALESCE($1, title), aliases = COALESCE($2, aliases), updated_at = NOW() WHERE id = $3`,
                [item.title, item.aliases && item.aliases.length > 0 ? JSON.stringify(item.aliases) : null, item.id]
            );
          }
        }

        enrichStatus.processed += result.rows.length;
        enrichStatus.lastBatch = result.rows.length;
        offset += batchSize;

        console.log(`已处理 ${enrichStatus.processed}/${enrichStatus.total}`);

        // 避免API限流
        await new Promise(r => setTimeout(r, 500));
      }

      enrichStatus.running = false;
      console.log('处理完成');
    } catch (error: any) {
      enrichStatus.running = false;
      enrichStatus.error = error.message;
      console.error('处理失败:', error);
    }
  })();

  res.json({ success: true, message: '任务已启动', status: enrichStatus });
});

/**
 * GET /api/v1/characters/enrich/status
 * 查看处理状态
 */
router.get('/enrich/status', (req, res) => {
  res.json({ success: true, status: enrichStatus });
});


/**
 * GET /api/v1/characters/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取人物基本信息
    const charResult = await pool.query('SELECT * FROM characters WHERE id = $1', [parseInt(id)]);
    if (charResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '人物不存在' });
    }
    const character = charResult.rows[0];

    // 获取正向关系（关联的是 related_character）
    const relationsResult = await pool.query(
        `SELECT cr.id, cr.relation_type, cr.description,
                rc.id as related_id, rc.name as related_name, rc.title as related_title, rc.era as related_era
         FROM character_relations cr
                JOIN characters rc ON cr.related_character_id = rc.id
         WHERE cr.character_id = $1`,
        [parseInt(id)]
    );
    const relations = relationsResult.rows.map((r: any) => ({
      id: r.id,
      relation_type: r.relation_type,
      description: r.description,
      related_character: {
        id: r.related_id,
        name: r.related_name,
        title: r.related_title,
        era: r.related_era,
      },
    }));

    // 获取反向关系（其他人指向这个人物）
    const reverseResult = await pool.query(
        `SELECT cr.id, cr.relation_type, cr.description,
                oc.id as origin_id, oc.name as origin_name, oc.title as origin_title, oc.era as origin_era
         FROM character_relations cr
                JOIN characters oc ON cr.character_id = oc.id
         WHERE cr.related_character_id = $1`,
        [parseInt(id)]
    );
    const reverseRelations = reverseResult.rows.map((r: any) => ({
      id: r.id,
      relation_type: r.relation_type,
      description: r.description,
      character: {
        id: r.origin_id,
        name: r.origin_name,
        title: r.origin_title,
        era: r.origin_era,
      },
    }));

    // 获取生平事件
    const eventsResult = await pool.query(
        'SELECT id, year, event, sort_order FROM character_events WHERE character_id = $1 ORDER BY sort_order',
        [parseInt(id)]
    );

    res.json({
      success: true,
      data: {
        ...character,
        relations,
        reverseRelations,
        events: eventsResult.rows,
      },
    });
  } catch (error) {
    console.error('获取人物详情失败:', error);
    res.status(500).json({ success: false, message: '获取人物详情失败' });
  }
});

/**
 * GET /api/v1/characters/:id/relations
 */
router.get('/:id/relations', async (req, res) => {
  try {
    const { id } = req.params;

    // 正向关系
    const relationsResult = await pool.query(
        `SELECT cr.id, cr.relation_type, cr.description,
                rc.id as related_id, rc.name as related_name, rc.title as related_title, rc.era as related_era
         FROM character_relations cr
                JOIN characters rc ON cr.related_character_id = rc.id
         WHERE cr.character_id = $1`,
        [parseInt(id)]
    );
    const outgoing = relationsResult.rows.map((r: any) => ({
      id: r.id,
      relation_type: r.relation_type,
      description: r.description,
      related_character: {
        id: r.related_id,
        name: r.related_name,
        title: r.related_title,
        era: r.related_era,
      },
    }));

    // 反向关系
    const reverseResult = await pool.query(
        `SELECT cr.id, cr.relation_type, cr.description,
                oc.id as origin_id, oc.name as origin_name, oc.title as origin_title, oc.era as origin_era
         FROM character_relations cr
                JOIN characters oc ON cr.character_id = oc.id
         WHERE cr.related_character_id = $1`,
        [parseInt(id)]
    );
    const incoming = reverseResult.rows.map((r: any) => ({
      id: r.id,
      relation_type: r.relation_type,
      description: r.description,
      character: {
        id: r.origin_id,
        name: r.origin_name,
        title: r.origin_title,
        era: r.origin_era,
      },
    }));

    res.json({
      success: true,
      data: { outgoing, incoming },
    });
  } catch (error) {
    console.error('获取人物关系失败:', error);
    res.status(500).json({ success: false, message: '获取人物关系失败' });
  }
});

/**
 * GET /api/v1/characters/:id/events
 */
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
        'SELECT id, year, event, sort_order FROM character_events WHERE character_id = $1 ORDER BY sort_order',
        [parseInt(id)]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取生平事件失败:', error);
    res.status(500).json({ success: false, message: '获取生平事件失败' });
  }
});

/**
 * POST /api/v1/characters/fill-biography
 * 批量补全人物的传记、籍贯、职位数据
 */
router.post('/fill-biography', async (req, res) => {
  if (fillBioStatus.running) {
    return res.json({ success: true, message: '任务已在运行中', status: fillBioStatus });
  }

  // 重置状态
  fillBioStatus = { running: true, total: 0, processed: 0, lastBatch: 0, error: null };

  // 异步处理
  (async () => {
    try {
      // 获取缺少数据的人物
      const countResult = await pool.query(
          `SELECT COUNT(*) FROM characters
           WHERE (summary IS NULL OR summary = '')
             AND (hometown IS NULL OR hometown = '')
             AND (title IS NULL OR title = '')`
      );
      fillBioStatus.total = parseInt(countResult.rows[0].count);
      console.log(`开始处理 ${fillBioStatus.total} 条人物数据...`);

      const batchSize = 20;
      let offset = 0;

      const SYSTEM_PROMPT = `你是一位专业的中国古代史学家，擅长撰写客观、简洁的史书传记。

请严格按以下JSON格式输出，不要有其他内容：
{
  "summary": "史书传记风格。包含籍贯、字/号、重要官职、科举及第或入仕方式、主要任职经历及时间顺序、重要事件。不加任何主观评价。",
  "title": "主要身份，如：唐宰相、蜀汉将军、北宋词人等",
  "hometown": "籍贯中文名，如：齐州临淄"
}

写作要求：
1. 传记风格：类似《资治通鉴》、《新唐书》人物记载，极简客观
2. 内容要素：姓、字/号、籍贯、科举及第或入仕起点、主要官职历任、重要事件、结局
3. 语气：纯客观陈述，无任何主观词汇
4. 重要：如人物生平不可考，summary 字段留空字符串 ""，不要瞎编
5. 只返回JSON，格式严格如上`;

      while (true) {
        const result = await pool.query(
            `SELECT id, name, era, birth_year, death_year FROM characters
             WHERE (summary IS NULL OR summary = '')
               AND (hometown IS NULL OR hometown = '')
               AND (title IS NULL OR title = '')
             ORDER BY id LIMIT $1 OFFSET $2`,
            [batchSize, offset]
        );

        if (result.rows.length === 0) break;

        const characters = result.rows.map((c: any) => {
          let info = c.name;
          if (c.era) info += `，${c.era}时期`;
          if (c.birth_year || c.death_year) {
            info += `，生卒年: ${c.birth_year || '?'}-${c.death_year || '?'}`;
          }
          return { id: c.id, info };
        });

        const prompt = `请为以下中国历史人物生成传记、职位、籍贯信息：

${characters.map((c: any, i: number) => `${i + 1}. ${c.info}`).join('\n')}

请返回JSON数组，每个元素包含 id, summary, title, hometown 字段。如果人物生平不可考，summary 留空。`;

        try {
          const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
          });

          let extracted: Array<{ id: number; summary: string; title: string; hometown: string }> = [];
          try {
            const content = response.choices[0]?.message?.content?.trim() || '';
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              extracted = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.error('解析LLM响应失败:', e);
          }

          // 更新数据库
          for (const item of extracted) {
            const char = characters.find((c: any) => c.id === item.id);
            if (item.summary || item.title || item.hometown) {
              await pool.query(
                  `UPDATE characters SET
                                       summary = COALESCE(NULLIF($1, ''), summary),
                                       title = COALESCE(NULLIF($2, ''), title),
                                       hometown = COALESCE(NULLIF($3, ''), hometown),
                                       updated_at = NOW()
                   WHERE id = $4 AND (summary IS NULL OR summary = '')`,
                  [item.summary, item.title, item.hometown, item.id]
              );
            }
          }
        } catch (e) {
          console.error('LLM调用失败:', e);
        }

        fillBioStatus.processed += result.rows.length;
        fillBioStatus.lastBatch = result.rows.length;
        offset += batchSize;

        console.log(`已处理 ${fillBioStatus.processed}/${fillBioStatus.total}`);

        // 避免API限流
        await new Promise(r => setTimeout(r, 1000));
      }

      fillBioStatus.running = false;
      console.log('处理完成');
    } catch (error: any) {
      fillBioStatus.running = false;
      fillBioStatus.error = error.message;
      console.error('处理失败:', error);
    }
  })();

  res.json({ success: true, message: '任务已启动', status: fillBioStatus });
});

/**
 * GET /api/v1/characters/fill-biography/status
 * 查看批量补全状态
 */
router.get('/fill-biography/status', (req, res) => {
  res.json({ success: true, status: fillBioStatus });
});

/**
 * POST /api/v1/characters/enrich-from-tongjian
 * 从资治通鉴原文 + LLM知识库 自动补充人物传记和关系
 * Body: { name: string, dryRun?: boolean }
 * dryRun=true 时只返回结果不写入数据库，供审核确认
 * dryRun=false 或不传时直接写入（兼容旧逻辑）
 */
router.post('/enrich-from-tongjian', async (req, res) => {
  try {
    const { name, dryRun = false } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: '请提供人物姓名' });
    }

    // 1. 查找人物
    const charResult = await pool.query(
        `SELECT id, name, era, title, summary, aliases FROM characters WHERE name = $1 OR aliases::text ILIKE $2`,
        [name, `%"${name}"%`]
    );
    if (charResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该人物' });
    }
    const character = charResult.rows[0];

    // 2. 从资治通鉴搜索相关段落
    const paraResult = await pool.query(
        `SELECT content, volume_name, year_mark FROM zizhitongjian_paragraphs
         WHERE content ILIKE $1 ORDER BY id LIMIT 20`,
        [`%${character.name}%`]
    );

    const passages = paraResult.rows.length > 0
        ? paraResult.rows.map((r: any) =>
            `【${r.volume_name}·${r.year_mark || ''}】${r.content}`
        ).join('\n\n')
        : '';

    // 3. 调用LLM提取传记和关系（移除了web-search功能）
    const SYSTEM_PROMPT = `你是一位专业的中国古代史学家，请综合利用以下信息源为人物撰写传记：

信息来源（按可信度排序）：
1. 《资治通鉴》原文（如有）—— 最权威的一手史料
2. 你的历史知识库 —— 用于补充和整合

请严格按以下JSON格式输出，不要有其他内容：
{
  "title": "历史上真实的最主要职位，如：同中书门下三品、归德大将军、松漠都督。只保留一个最重要的职位，使用历史原称",
  "summary": "史书传记风格摘要。包含籍贯、字号、主要官职、重要事件（含年份）、结局。极简客观，不加主观评价。时间线要清晰。",
  "aliases": ["别名1", "别名2"],
  "hometown": "籍贯，如：营州、陕州等",
  "era": "所属纪年，如：周纪、秦纪、汉纪、晋纪、隋纪、唐纪、后周纪等",
  "relationships": [
    {"name": "相关人物姓名", "relation": "关系类型", "description": "关系说明"}
  ]
}

注意事项：
1. title只用历史上真实存在的官职名称，保留最重要的一个即可，不要用顿号分隔多个职位
2. summary要精炼但完整，关键事件要标注年份
3. aliases包含字、号、别称、可汗号、武则天改的名字等
4. relationships提取与此人相关的重要人物，如亲属、君臣、敌对、盟友等
5. era必须从以下选择：周纪、秦纪、汉纪、魏纪、晋纪、宋纪、齐纪、梁纪、陈纪、隋纪、唐纪、后梁纪、后唐纪、后晋纪、后汉纪、后周纪
6. 只返回JSON`;

    let userContent = `人物：${character.name}\n当前纪年：${character.era || '未知'}\n当前title：${character.title || '无'}\n当前summary：${character.summary || '无'}\n当前aliases：${character.aliases ? JSON.stringify(character.aliases) : '无'}\n\n`;

    if (passages) {
      userContent += `【资治通鉴原文】\n${passages}\n\n`;
    } else {
      userContent += `【资治通鉴原文】\n（未找到相关记载）\n\n`;
    }

    userContent += `请综合利用以上信息和你的历史知识，为该人物撰写完整传记。`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
    });

    let extracted: {
      title: string | null;
      summary: string | null;
      aliases: string[];
      hometown: string | null;
      era: string | null;
      relationships: Array<{ name: string; relation: string; description: string }>;
    };

    try {
      const content = response.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        return res.json({ success: false, message: 'LLM返回格式错误', raw: content });
      }
    } catch (e) {
      return res.json({ success: false, message: '解析LLM响应失败', error: String(e) });
    }

    // dryRun模式：只返回结果，不写入数据库
    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        data: {
          characterId: character.id,
          characterName: character.name,
          current: {
            era: character.era,
            title: character.title,
            summary: character.summary,
            aliases: character.aliases,
          },
          proposed: {
            era: extracted.era || character.era,
            title: extracted.title,
            summary: extracted.summary,
            aliases: extracted.aliases,
            hometown: extracted.hometown,
          },
          relationships: extracted.relationships || [],
          sources: {
            tongjian_passages: paraResult.rows.length,
          },
        },
      });
    }

    // 5. 写入模式：直接更新数据库
    const updateFields: string[] = ['updated_at = NOW()'];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (extracted.title) {
      updateFields.push(`title = $${paramIndex++}`);
      updateParams.push(extracted.title);
    }
    if (extracted.summary) {
      updateFields.push(`summary = $${paramIndex++}`);
      updateParams.push(extracted.summary);
    }
    if (extracted.aliases && extracted.aliases.length > 0) {
      updateFields.push(`aliases = $${paramIndex++}::jsonb`);
      updateParams.push(JSON.stringify(extracted.aliases));
    }
    if (extracted.hometown) {
      updateFields.push(`hometown = $${paramIndex++}`);
      updateParams.push(extracted.hometown);
    }
    if (extracted.era) {
      updateFields.push(`era = $${paramIndex++}`);
      updateParams.push(extracted.era);
    }

    if (updateParams.length > 0) {
      updateParams.push(character.id);
      await pool.query(
          `UPDATE characters SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateParams
      );
    }

    // 6. 处理人物关系
    const addedRelations: Array<{ name: string; relation: string; found: boolean; created: boolean }> = [];

    for (const rel of extracted.relationships || []) {
      const relResult = await pool.query(
          `SELECT id FROM characters WHERE name = $1 OR aliases::text ILIKE $2`,
          [rel.name, `%"${rel.name}"%`]
      );

      let relatedId: number;
      let created = false;

      if (relResult.rows.length > 0) {
        relatedId = relResult.rows[0].id;
      } else {
        const createResult = await pool.query(
            `INSERT INTO characters (name, era, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
            [rel.name, extracted.era || character.era || '待定']
        );
        relatedId = createResult.rows[0].id;
        created = true;
      }

      const existResult = await pool.query(
          `SELECT id FROM character_relations WHERE character_id = $1 AND related_character_id = $2`,
          [character.id, relatedId]
      );

      if (existResult.rows.length === 0) {
        await pool.query(
            `INSERT INTO character_relations (character_id, related_character_id, relation_type, description, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
            [character.id, relatedId, rel.relation, rel.description]
        );
      }

      addedRelations.push({
        name: rel.name,
        relation: rel.relation,
        found: true,
        created
      });
    }

    res.json({
      success: true,
      dryRun: false,
      data: {
        character: {
          id: character.id,
          name: character.name,
          title: extracted.title || character.title,
          summary: extracted.summary || character.summary,
          aliases: extracted.aliases,
          hometown: extracted.hometown,
          era: extracted.era || character.era,
        },
        sources: {
          tongjian_passages: paraResult.rows.length,
        },
        relationships: addedRelations,
      },
    });

  } catch (error) {
    console.error('补充人物信息失败:', error);
    res.status(500).json({ success: false, message: '补充人物信息失败', error: String(error) });
  }
});

/**
 * POST /api/v1/characters/enrich-confirm
 * 确认并写入enrich预览结果
 * Body: { characterId: number, title?: string, summary?: string, aliases?: string[], hometown?: string, era?: string, relationships?: Array<{name, relation, description}> }
 */
router.post('/enrich-confirm', async (req, res) => {
  try {
    const { characterId, name, title, summary, aliases, hometown, era, relationships } = req.body;
    if (!characterId) {
      return res.status(400).json({ success: false, message: '请提供characterId' });
    }

    // 查找人物
    const charResult = await pool.query(
        `SELECT id, name, era FROM characters WHERE id = $1`,
        [characterId]
    );
    if (charResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该人物' });
    }
    const character = charResult.rows[0];

    // 更新人物信息
    const updateFields: string[] = ['updated_at = NOW()'];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateParams.push(name);
    }
    if (title) {
      updateFields.push(`title = $${paramIndex++}`);
      updateParams.push(title);
    }
    if (summary) {
      updateFields.push(`summary = $${paramIndex++}`);
      updateParams.push(summary);
    }
    if (aliases && aliases.length > 0) {
      updateFields.push(`aliases = $${paramIndex++}::jsonb`);
      updateParams.push(JSON.stringify(aliases));
    }
    if (hometown) {
      updateFields.push(`hometown = $${paramIndex++}`);
      updateParams.push(hometown);
    }
    if (era) {
      updateFields.push(`era = $${paramIndex++}`);
      updateParams.push(era);
    }

    if (updateParams.length > 0) {
      updateParams.push(characterId);
      await pool.query(
          `UPDATE characters SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateParams
      );
    }

    // 处理人物关系
    const addedRelations: Array<{ name: string; relation: string; found: boolean; created: boolean }> = [];

    for (const rel of (relationships || [])) {
      const relResult = await pool.query(
          `SELECT id FROM characters WHERE name = $1 OR aliases::text ILIKE $2`,
          [rel.name, `%"${rel.name}"%`]
      );

      let relatedId: number;
      let created = false;

      if (relResult.rows.length > 0) {
        relatedId = relResult.rows[0].id;
      } else {
        const createResult = await pool.query(
            `INSERT INTO characters (name, era, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
            [rel.name, era || character.era || '待定']
        );
        relatedId = createResult.rows[0].id;
        created = true;
      }

      const existResult = await pool.query(
          `SELECT id FROM character_relations WHERE character_id = $1 AND related_character_id = $2`,
          [characterId, relatedId]
      );

      if (existResult.rows.length === 0) {
        await pool.query(
            `INSERT INTO character_relations (character_id, related_character_id, relation_type, description, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
            [characterId, relatedId, rel.relation, rel.description]
        );
      }

      addedRelations.push({ name: rel.name, relation: rel.relation, found: true, created });
    }

    res.json({
      success: true,
      data: {
        characterId,
        name: character.name,
        updatedFields: updateFields.filter(f => f !== 'updated_at = NOW()'),
        relationships: addedRelations,
      },
    });

  } catch (error) {
    console.error('确认写入失败:', error);
    res.status(500).json({ success: false, message: '确认写入失败', error: String(error) });
  }
});

/**
 * DELETE /api/v1/characters/:id
 * 删除人物及其所有关系
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    if (!numId || isNaN(numId)) {
      return res.status(400).json({ success: false, message: '无效的ID' });
    }

    // 检查人物是否存在
    const charResult = await pool.query(`SELECT id, name FROM characters WHERE id = $1`, [numId]);
    if (charResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该人物' });
    }
    const character = charResult.rows[0];

    // 删除该人物发出的关系
    await pool.query(`DELETE FROM character_relations WHERE character_id = $1`, [numId]);
    // 删除指向该人物的关系
    await pool.query(`DELETE FROM character_relations WHERE related_character_id = $1`, [numId]);
    // 删除人物本身
    await pool.query(`DELETE FROM characters WHERE id = $1`, [numId]);

    res.json({
      success: true,
      data: { id: numId, name: character.name },
    });
  } catch (error) {
    console.error('删除人物失败:', error);
    res.status(500).json({ success: false, message: '删除人物失败', error: String(error) });
  }
});

export default router;

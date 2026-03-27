import { Router } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

/**
 * GET /api/v1/characters/graph
 */
router.get('/graph', async (req, res) => {
  try {
    const { era, characterId } = req.query;

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
    } else {
      charactersResult = await pool.query('SELECT id, name, title, era FROM characters');
    }

    const characters = charactersResult.rows;
    characterIds = characters.map((c: any) => c.id);

    let relations = [];
    if (characterIds.length > 0) {
      const relResult = await pool.query(
        `SELECT id, character_id, related_character_id, relation_type, description
         FROM character_relations
         WHERE character_id = ANY($1) AND related_character_id = ANY($1)`,
        [characterIds, characterIds]
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
    const result = await pool.query(
      'SELECT era, COUNT(*) as count FROM characters WHERE era IS NOT NULL GROUP BY era ORDER BY era'
    );

    const eras = result.rows.map((item: any) => ({
      name: item.era,
      count: parseInt(item.count),
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
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${name}%`);
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

export default router;

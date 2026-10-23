import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { getPgPool } from '../storage/database/pg-pool';

const router = Router();
const pool = getPgPool();
const columns = `id, name, dynasty, title, personality, speaking_style, avatar,
  owner_id::text AS owner_id, created_at`;

let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool.query(`CREATE TABLE IF NOT EXISTS custom_characters (
      id text PRIMARY KEY,
      owner_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(50) NOT NULL,
      dynasty text NOT NULL DEFAULT '未知',
      title text NOT NULL DEFAULT '平民',
      personality text NOT NULL DEFAULT '',
      speaking_style text NOT NULL DEFAULT '',
      avatar text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`).then(() => pool.query(
      'CREATE INDEX IF NOT EXISTS idx_custom_characters_owner_created ON custom_characters (owner_id, created_at DESC)'
    )).then(() => undefined).catch(error => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

function readText(value: unknown, fallback: string): string | null {
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? value.trim() : null;
}

router.get('/', async (_req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT ${columns} FROM custom_characters
       WHERE owner_id = $1 ORDER BY created_at DESC, id DESC`,
      [res.locals.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取自定义角色失败:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT ${columns} FROM custom_characters WHERE id = $1 AND owner_id = $2`,
      [req.params.id, res.locals.userId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: '角色不存在' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('获取自定义角色失败:', error);
    return res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/', async (req, res) => {
  const name = readText(req.body?.name, '');
  const dynasty = readText(req.body?.dynasty, '未知');
  const title = readText(req.body?.title, '平民');
  const personality = readText(req.body?.personality, '');
  const speakingStyle = readText(req.body?.speaking_style, '');
  if (!name || name.length > 50 || [dynasty, title, personality, speakingStyle].some(value => value === null)) {
    return res.status(400).json({ success: false, message: '角色信息无效' });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO custom_characters
       (id, owner_id, name, dynasty, title, personality, speaking_style, avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${columns}`,
      [`custom_${randomUUID()}`, res.locals.userId, name, dynasty, title,
       personality, speakingStyle, Array.from(name).at(-1)]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('创建自定义角色失败:', error);
    return res.status(500).json({ success: false, message: '创建失败' });
  }
});

router.put('/:id', async (req, res) => {
  const fields: [string, unknown][] = [
    ['name', req.body?.name], ['dynasty', req.body?.dynasty],
    ['title', req.body?.title], ['personality', req.body?.personality],
    ['speaking_style', req.body?.speaking_style],
  ];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const [field, raw] of fields) {
    if (raw === undefined) continue;
    const value = readText(raw, '');
    if (value === null || (field === 'name' && (!value || value.length > 50))) {
      return res.status(400).json({ success: false, message: '角色信息无效' });
    }
    values.push(value);
    updates.push(`${field} = $${values.length}`);
    if (field === 'name') {
      values.push(Array.from(value).at(-1));
      updates.push(`avatar = $${values.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ success: false, message: '没有需要更新的内容' });
  try {
    await ensureTable();
    values.push(req.params.id, res.locals.userId);
    const result = await pool.query(
      `UPDATE custom_characters SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND owner_id = $${values.length}
       RETURNING ${columns}`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: '角色不存在' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('更新自定义角色失败:', error);
    return res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(
      'DELETE FROM custom_characters WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, res.locals.userId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: '角色不存在' });
    return res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除自定义角色失败:', error);
    return res.status(500).json({ success: false, message: '删除失败' });
  }
});

export default router;

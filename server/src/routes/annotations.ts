import express from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

interface Annotation {
  id: number;
  volume_number: number;
  paragraph_id: number;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  annotation: string;
  device_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/v1/annotations
 */
router.get('/', async (req, res) => {
  try {
    const { deviceId, volumeNumber, paragraphId } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, message: 'deviceId is required' });
    }

    const params: unknown[] = [deviceId];
    const conditions: string[] = ['device_id = $1'];
    let paramIndex = 2;

    if (volumeNumber) {
      conditions.push(`volume_number = $${paramIndex++}`);
      params.push(parseInt(volumeNumber as string));
    }
    if (paragraphId) {
      conditions.push(`paragraph_id = $${paramIndex++}`);
      params.push(parseInt(paragraphId as string));
    }

    const result = await pool.query(
      `SELECT * FROM annotations WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows as Annotation[] });
  } catch (err) {
    console.error('Error fetching annotations:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/v1/annotations
 */
router.post('/', async (req, res) => {
  try {
    const {
      volume_number, paragraph_id, selected_text,
      start_offset, end_offset, annotation, device_id,
    } = req.body;

    if (
      !volume_number || !paragraph_id || !selected_text ||
      start_offset === undefined || end_offset === undefined ||
      !annotation || !device_id
    ) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO annotations (volume_number, paragraph_id, selected_text, start_offset, end_offset, annotation, device_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [volume_number, paragraph_id, selected_text, start_offset, end_offset, annotation, device_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] as Annotation });
  } catch (err) {
    console.error('Error creating annotation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/annotations/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { annotation } = req.body;

    if (!annotation) {
      return res.status(400).json({ success: false, message: 'annotation is required' });
    }

    const result = await pool.query(
      `UPDATE annotations SET annotation = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [annotation, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Annotation not found' });
    }

    res.json({ success: true, data: result.rows[0] as Annotation });
  } catch (err) {
    console.error('Error updating annotation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/annotations/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId is required' });
    }

    await pool.query(
      'DELETE FROM annotations WHERE id = $1 AND device_id = $2',
      [parseInt(id), deviceId as string]
    );

    res.json({ success: true, message: 'Annotation deleted' });
  } catch (err) {
    console.error('Error deleting annotation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;

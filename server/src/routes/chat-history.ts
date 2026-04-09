import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ==================== 群聊记录接口 ====================

/**
 * 服务端文件：server/src/routes/chat-history.ts
 * 接口：GET /api/v1/chat-history
 * 获取用户的群聊记录列表
 */
router.get('/', async (req, res) => {
    try {
        const deviceId = req.headers['x-device-id'] as string || 'anonymous';

        const result = await pool.query(
            `SELECT id, topic_id, topic_title, character_ids, status, created_at, updated_at,
              (SELECT COUNT(*) FROM chat_messages WHERE room_id = chat_rooms.id) as message_count
       FROM chat_rooms 
       WHERE device_id = $1 
       ORDER BY updated_at DESC
       LIMIT 50`,
            [deviceId]
        );

        res.json({
            success: true,
            data: result.rows.map(row => ({
                id: row.id,
                topicId: row.topic_id,
                topicTitle: row.topic_title,
                characterIds: row.character_ids || [],
                status: row.status,
                messageCount: parseInt(row.message_count),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            })),
        });
    } catch (error) {
        console.error('获取聊天记录失败:', error);
        res.status(500).json({ success: false, message: '获取失败' });
    }
});

/**
 * 服务端文件：server/src/routes/chat-history.ts
 * 接口：POST /api/v1/chat-history
 * 创建新的群聊会话
 */
router.post('/', async (req, res) => {
    try {
        const deviceId = req.headers['x-device-id'] as string || 'anonymous';
        const { topicId, topicTitle, characterIds } = req.body;

        const result = await pool.query(
            `INSERT INTO chat_rooms (device_id, topic_id, topic_title, character_ids)
       VALUES ($1, $2, $3, $4)
       RETURNING id, topic_id, topic_title, character_ids, status, created_at`,
            [deviceId, topicId, topicTitle, characterIds]
        );

        const row = result.rows[0];
        res.json({
            success: true,
            data: {
                id: row.id,
                topicId: row.topic_id,
                topicTitle: row.topic_title,
                characterIds: row.character_ids || [],
                status: row.status,
                createdAt: row.created_at,
            },
        });
    } catch (error) {
        console.error('创建会话失败:', error);
        res.status(500).json({ success: false, message: '创建失败' });
    }
});

/**
 * 服务端文件：server/src/routes/chat-history.ts
 * 接口：GET /api/v1/chat-history/:roomId
 * 获取指定会话的消息列表
 */
router.get('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;

        // 获取会话信息
        const roomResult = await pool.query(
            'SELECT * FROM chat_rooms WHERE id = $1',
            [roomId]
        );

        if (roomResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '会话不存在' });
        }

        // 获取消息列表
        const messagesResult = await pool.query(
            'SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC',
            [roomId]
        );

        const room = roomResult.rows[0];
        res.json({
            success: true,
            data: {
                room: {
                    id: room.id,
                    topicId: room.topic_id,
                    topicTitle: room.topic_title,
                    characterIds: room.character_ids || [],
                    status: room.status,
                    createdAt: room.created_at,
                },
                messages: messagesResult.rows.map(msg => ({
                    id: msg.id,
                    characterId: msg.character_id,
                    characterName: msg.character_name,
                    content: msg.content,
                    isUser: msg.is_user,
                    createdAt: msg.created_at,
                })),
            },
        });
    } catch (error) {
        console.error('获取消息失败:', error);
        res.status(500).json({ success: false, message: '获取失败' });
    }
});

/**
 * 服务端文件：server/src/routes/chat-history.ts
 * 接口：POST /api/v1/chat-history/:roomId/messages
 * 添加消息到会话
 */
router.post('/:roomId/messages', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { characterId, characterName, content, isUser } = req.body;

        const result = await pool.query(
            `INSERT INTO chat_messages (room_id, character_id, character_name, content, is_user)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [roomId, characterId, characterName, content, isUser || false]
        );

        // 更新会话的更新时间
        await pool.query(
            'UPDATE chat_rooms SET updated_at = NOW() WHERE id = $1',
            [roomId]
        );

        const msg = result.rows[0];
        res.json({
            success: true,
            data: {
                id: msg.id,
                characterId: msg.character_id,
                characterName: msg.character_name,
                content: msg.content,
                isUser: msg.is_user,
                createdAt: msg.created_at,
            },
        });
    } catch (error) {
        console.error('添加消息失败:', error);
        res.status(500).json({ success: false, message: '添加失败' });
    }
});

/**
 * 服务端文件：server/src/routes/chat-history.ts
 * 接口：DELETE /api/v1/chat-history/:roomId
 * 删除群聊会话（同时删除所有消息）
 */
router.delete('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;

        // 先删除消息
        await pool.query('DELETE FROM chat_messages WHERE room_id = $1', [roomId]);
        // 再删除会话
        await pool.query('DELETE FROM chat_rooms WHERE id = $1', [roomId]);

        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除会话失败:', error);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

/**
 * 服务端文件：server/src/routes/chat-history.ts
 * 接口：DELETE /api/v1/chat-history/:roomId/messages
 * 清空会话消息
 */
router.delete('/:roomId/messages', async (req, res) => {
    try {
        const { roomId } = req.params;

        await pool.query('DELETE FROM chat_messages WHERE room_id = $1', [roomId]);
        await pool.query('UPDATE chat_rooms SET updated_at = NOW() WHERE id = $1', [roomId]);

        res.json({ success: true, message: '清空成功' });
    } catch (error) {
        console.error('清空消息失败:', error);
        res.status(500).json({ success: false, message: '清空失败' });
    }
});

/**
 * 服务端文件：server/src/routes/chat-history.ts
 * 接口：PUT /api/v1/chat-history/:roomId/status
 * 更新会话状态
 */
router.put('/:roomId/status', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { status } = req.body;

        await pool.query(
            'UPDATE chat_rooms SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, roomId]
        );

        res.json({ success: true, message: '状态更新成功' });
    } catch (error) {
        console.error('更新状态失败:', error);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

export default router;

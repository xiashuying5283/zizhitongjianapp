import { Router } from 'express';

const router = Router();

// 模拟数据库（实际项目中替换为真实数据库）
// 为了简单起见，使用内存存储，重启后丢失
// 正式环境请使用 PostgreSQL + Prisma/Sequelize
interface CustomCharacter {
  id: string;
  name: string;
  dynasty: string;
  title: string;
  personality: string;
  speaking_style: string;
  avatar: string;
  owner_id: string;
  created_at: string;
}

const customCharacters: Map<string, CustomCharacter> = new Map();

// 生成UUID
function generateId(): string {
  return 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 获取头像（名字最后一个字）
function getAvatar(name: string): string {
  if (!name || name.length === 0) return '?';
  return name.charAt(name.length - 1);
}

/**
 * 获取所有自定义角色
 * GET /api/v1/custom-characters
 */
router.get('/', async (req, res) => {
  try {
    const characters = Array.from(customCharacters.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return res.json({
      success: true,
      data: characters,
    });
  } catch (error) {
    console.error('获取自定义角色失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

/**
 * 获取单个自定义角色
 * GET /api/v1/custom-characters/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const character = customCharacters.get(req.params.id);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }
    
    return res.json({
      success: true,
      data: character,
    });
  } catch (error) {
    console.error('获取自定义角色失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

/**
 * 创建自定义角色
 * POST /api/v1/custom-characters
 * Body: { name, dynasty?, title?, personality?, speaking_style? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, dynasty, title, personality, speaking_style, owner_id } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '角色名字不能为空',
      });
    }

    const id = generateId();
    const avatar = getAvatar(name.trim());
    
    const character: CustomCharacter = {
      id,
      name: name.trim(),
      dynasty: dynasty?.trim() || '未知',
      title: title?.trim() || '平民',
      personality: personality?.trim() || '',
      speaking_style: speaking_style?.trim() || '',
      avatar,
      owner_id: owner_id || 'default',
      created_at: new Date().toISOString(),
    };

    customCharacters.set(id, character);

    return res.status(201).json({
      success: true,
      data: character,
    });
  } catch (error) {
    console.error('创建自定义角色失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

/**
 * 更新自定义角色
 * PUT /api/v1/custom-characters/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const character = customCharacters.get(req.params.id);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    const { name, dynasty, title, personality, speaking_style } = req.body;

    // 更新字段
    if (name !== undefined) {
      character.name = name.trim();
      character.avatar = getAvatar(name.trim());
    }
    if (dynasty !== undefined) character.dynasty = dynasty.trim();
    if (title !== undefined) character.title = title.trim();
    if (personality !== undefined) character.personality = personality.trim();
    if (speaking_style !== undefined) character.speaking_style = speaking_style.trim();

    customCharacters.set(req.params.id, character);

    return res.json({
      success: true,
      data: character,
    });
  } catch (error) {
    console.error('更新自定义角色失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

/**
 * 删除自定义角色
 * DELETE /api/v1/custom-characters/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!customCharacters.has(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    customCharacters.delete(req.params.id);

    return res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除自定义角色失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

export default router;

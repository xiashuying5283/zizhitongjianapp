import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();
const SALT_ROUNDS = 10;

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：POST /api/v1/auth/register
 * Body 参数：username: string, password: string, nickname?: string
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
      });
    }

    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: '用户名长度应为2-50个字符',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6个字符',
      });
    }

    const supabase = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在',
      });
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        nickname: nickname || username,
      })
      .select('id, username, nickname, avatar, created_at')
      .single();

    if (error) {
      console.error('注册失败:', error);
      return res.status(500).json({
        success: false,
        message: '注册失败',
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：POST /api/v1/auth/login
 * Body 参数：username: string, password: string
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
      });
    }

    const supabase = getSupabaseClient();

    // 查找用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：GET /api/v1/auth/check-username
 * Query 参数：username: string
 */
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: '用户名不能为空',
      });
    }

    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('username', username as string)
      .single();

    res.json({
      success: true,
      data: {
        available: !data,
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        available: true,
      },
    });
  }
});

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：GET /api/v1/auth/user/:id
 * Path 参数：id: number
 */
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, nickname, avatar, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
});

/**
 * 服务端文件：server/src/routes/auth.ts
 * 接口：PUT /api/v1/auth/profile
 * Body 参数：userId: number, nickname?: string, avatar?: string
 */
router.put('/profile', async (req, res) => {
  try {
    const { userId, nickname, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少用户ID',
      });
    }

    const supabase = getSupabaseClient();

    // 构建更新对象
    const updateData: { nickname?: string; avatar?: string } = {};
    if (nickname !== undefined) {
      if (nickname.length < 1 || nickname.length > 50) {
        return res.status(400).json({
          success: false,
          message: '昵称长度应为1-50个字符',
        });
      }
      updateData.nickname = nickname;
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的内容',
      });
    }

    // 更新用户信息
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, nickname, avatar, created_at')
      .single();

    if (error) {
      console.error('更新用户资料失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新失败',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败',
    });
  }
});

export default router;

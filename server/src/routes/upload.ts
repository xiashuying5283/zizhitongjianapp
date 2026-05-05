import { Router } from 'express';
import multer from 'multer';
import { s3Storage } from '../utils/s3-storage.js';

const router = Router();

// 配置 multer 用于接收文件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
});

/**
 * 服务端文件：server/src/routes/upload.ts
 * 接口：POST /api/v1/upload/avatar
 * Body 参数：file (FormData), userId: string
 */
router.post('/avatar', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '未上传文件',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少用户ID',
      });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型，仅支持 jpg/png/gif/webp',
      });
    }

    // 生成文件名
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `avatars/${userId}/${Date.now()}.${ext}`;

    // 上传到 S3 存储
    await s3Storage.uploadFile(fileName, file.buffer, file.mimetype || 'image/jpeg');

    // 获取文件URL
    const url = s3Storage.getFileUrl(fileName);

    res.json({ success: true, data: { url, key: fileName } });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

/**
 * POST /api/v1/upload/image
 * 通用图片上传（用于帖子、评论、聊天）
 */
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型，仅支持 jpg/png/gif/webp',
      });
    }

    // 生成文件名
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `community/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // 上传到 S3 存储
    await s3Storage.uploadFile(fileName, file.buffer, file.mimetype || 'image/jpeg');

    // 获取文件URL
    const url = s3Storage.getFileUrl(fileName);

    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

export default router;

import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

// 配置 multer 用于接收文件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
});

// 本地上传目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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

    // 本地文件存储
    const localPath = path.join(UPLOAD_DIR, fileName);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localPath, file.buffer);

    res.json({ success: true, data: { url: `/uploads/${fileName}`, key: fileName } });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

export default router;

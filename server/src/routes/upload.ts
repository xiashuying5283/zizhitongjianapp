import { Router } from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';

const router = Router();

// 配置 multer 用于接收文件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
});

// 初始化 S3Storage
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
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

    // 使用 S3Storage 上传文件
    const fileKey = await storage.uploadFile({
      fileContent: file.buffer,
      fileName,
      contentType: file.mimetype,
    });

    // 生成签名 URL（有效期 30 天）
    const avatarUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 2592000, // 30 天
    });

    res.json({
      success: true,
      data: {
        url: avatarUrl,
        key: fileKey,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: '上传失败',
    });
  }
});

export default router;

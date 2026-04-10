import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * S3 存储客户端
 * 支持任何 S3 兼容的对象存储（AWS S3、腾讯云COS、阿里云OSS、MinIO等）
 */
class S3Storage {
  private client: S3Client;
  private bucketName: string;

  constructor(config: {
    endpointUrl: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    region: string;
  }) {
    this.client = new S3Client({
      endpoint: config.endpointUrl,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true, // 使用路径样式URL
    });
    this.bucketName = config.bucketName;
  }

  /**
   * 上传文件
   * @param key 文件路径/名称
   * @param body 文件内容（Buffer）
   * @param contentType 文件类型
   */
  async uploadFile(key: string, body: Buffer, contentType: string = 'application/octet-stream'): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
  }

  /**
   * 获取文件的公开URL
   * @param key 文件路径/名称
   */
  getFileUrl(key: string): string {
    // 拼接公开访问URL
    const endpoint = process.env.S3_ENDPOINT_URL || 'https://integration.coze.cn/coze-coding-s3proxy/v1';
    return `${endpoint}/${this.bucketName}/${key}`;
  }

  /**
   * 生成预签名URL（用于临时访问）
   * 注意：当前代理服务不支持预签名，直接返回公开URL
   * @param key 文件路径/名称
   * @param _expiresInSeconds 过期时间（秒）
   */
  generatePresignedUrl(key: string, _expiresInSeconds: number = 86400 * 30): string {
    return this.getFileUrl(key);
  }
}

// 初始化 S3 存储实例
export const s3Storage = new S3Storage({
  endpointUrl: process.env.S3_ENDPOINT_URL || 'https://integration.coze.cn/coze-coding-s3proxy/v1',
  accessKey: process.env.S3_ACCESS_KEY || '',
  secretKey: process.env.S3_SECRET_KEY || '',
  bucketName: process.env.S3_BUCKET_NAME || 'bucket_1774094497862',
  region: process.env.S3_REGION || 'cn-beijing',
});

import { Router } from 'express';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = Router();

/**
 * 服务端文件：server/src/routes/fetch-reference.ts
 * 接口：POST /api/v1/fetch-reference
 * Body 参数：url: string
 */
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL不能为空',
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(url);

    res.json({
      success: true,
      data: {
        title: response.title,
        url: response.url,
        content: response.content,
      },
    });
  } catch (error) {
    console.error('获取网页内容失败:', error);
    res.status(500).json({
      success: false,
      message: '获取网页内容失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

import { Router } from 'express';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = Router();

/**
 * 服务端文件：server/src/routes/fetch-zizhitongjian.ts
 * 接口：POST /api/v1/fetch-zizhitongjian
 * Body 参数：url: string
 * 获取资治通鉴网页内容
 */
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: '请提供URL',
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    console.log(`正在获取: ${url}`);
    const response = await client.fetch(url);

    if (response.status_code !== 0) {
      return res.status(500).json({
        success: false,
        message: response.status_message || '获取失败',
      });
    }

    res.json({
      success: true,
      data: {
        title: response.title,
        url: response.url,
        content: response.content,
      },
    });
  } catch (error) {
    console.error('获取网页失败:', error);
    res.status(500).json({
      success: false,
      message: '获取网页失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

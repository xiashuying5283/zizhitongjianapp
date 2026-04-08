import { Router } from 'express';
import type { Request, Response } from 'express';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = Router();

/**
 * 测试爬取资治通鉴网页内容
 * GET /api/v1/fetch-test
 */
router.get('/fetch-test', async (req: Request, res: Response) => {
  try {
    const testUrl = 'http://www.ziyexing.com/files-5/zizhitongjian/zizhitongjian_001.htm';
    
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const client = new FetchClient(config, customHeaders);
    
    const response = await client.fetch(testUrl);
    
    if (response.status_code !== 0) {
      return res.status(500).json({
        success: false,
        message: `Fetch failed: ${response.status_message}`,
      });
    }
    
    // 提取文本内容
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');
    
    res.json({
      success: true,
      data: {
        title: response.title,
        url: response.url,
        textLength: textContent.length,
        textPreview: textContent.substring(0, 1000),
        fullText: textContent,
      },
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

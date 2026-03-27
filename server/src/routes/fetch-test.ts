import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

/**
 * 测试爬取资治通鉴网页内容
 * GET /api/v1/fetch-test
 */
router.get('/fetch-test', async (req: Request, res: Response) => {
  try {
    const testUrl = 'http://www.ziyexing.com/files-5/zizhitongjian/zizhitongjian_001.htm';

    const response = await axios.get(testUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      responseType: 'arraybuffer',
    });

    const iconvLite = await import('iconv-lite').catch(() => null);
    let html: string;
    if (iconvLite) {
      const buffer = Buffer.from(response.data);
      const charsetMatch = buffer.toString('binary').match(/charset=["']?([^"'\s>]+)/i);
      const charset = charsetMatch ? charsetMatch[1] : 'gb2312';
      html = iconvLite.decode(buffer, charset);
    } else {
      html = Buffer.from(response.data).toString('utf-8');
    }

    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    const textContent = $('body').text().replace(/\s+/g, '\n').trim();

    res.json({
      success: true,
      data: {
        title,
        url: testUrl,
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

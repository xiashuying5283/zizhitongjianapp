import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

/**
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

    console.log(`正在获取: ${url}`);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      responseType: 'arraybuffer',
    });

    const iconvLite = await import('iconv-lite').catch(() => null);
    let html: string;
    if (iconvLite) {
      const buffer = Buffer.from(response.data);
      const charsetMatch = buffer.toString('binary').match(/charset=["']?([^"'\s>]+)/i);
      const charset = charsetMatch ? charsetMatch[1] : 'utf-8';
      html = iconvLite.decode(buffer, charset);
    } else {
      html = Buffer.from(response.data).toString('utf-8');
    }

    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();

    res.json({
      success: true,
      data: {
        title,
        url,
        content: [{ type: 'text', text: textContent }],
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

import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';

const router = express.Router();

/**
 * 接口：POST /api/v1/tts/synthesize
 * 可选的云端语音接口。与聊天模型使用独立凭证和地址。
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = req.body ?? {};

    if (typeof text !== 'string' || !text.trim() || text.length > 4096) {
      return res.status(400).json({
        success: false,
        message: '文本必须为 1 至 4096 个字符',
      });
    }

    if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0.25 || speed > 4) {
      return res.status(400).json({ success: false, message: '语速必须在 0.25 至 4 之间' });
    }

    const voices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];
    if (typeof voice !== 'string' || !voices.includes(voice)) {
      return res.status(400).json({ success: false, message: '不支持的音色' });
    }

    if (!process.env.TTS_API_KEY) {
      return res.status(503).json({
        success: false,
        message: '云端语音未配置，请设置 TTS_API_KEY',
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.TTS_API_KEY,
      baseURL: process.env.TTS_BASE_URL || 'https://api.openai.com/v1',
    });
    const response = await openai.audio.speech.create({
      model: process.env.TTS_MODEL || 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text.trim(),
      speed,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('TTS 合成失败:', error);
    res.status(500).json({
      success: false,
      message: '语音合成失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

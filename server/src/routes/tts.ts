import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';
import axios from 'axios';

const router = express.Router();

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// OpenAI TTS 支持的音色
const OPENAI_VOICES = {
  alloy: { id: 'alloy', name: 'Alloy', description: '中性声音，自然流畅', gender: 'neutral' },
  echo: { id: 'echo', name: 'Echo', description: '男声，清亮有力', gender: 'male' },
  fable: { id: 'fable', name: 'Fable', description: '男声，温暖沉稳', gender: 'male' },
  onyx: { id: 'onyx', name: 'Onyx', description: '男声，低沉厚重', gender: 'male' },
  nova: { id: 'nova', name: 'Nova', description: '女声，亲切自然', gender: 'female' },
  shimmer: { id: 'shimmer', name: 'Shimmer', description: '女声，柔和优美', gender: 'female' },
};

/**
 * 接口：POST /api/v1/tts/synthesize
 * 使用 OpenAI TTS API 合成语音
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: '请提供要合成的文本',
      });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return res.status(503).json({
        success: false,
        message: '请先配置 OPENAI_API_KEY',
      });
    }

    // 文本长度限制
    const truncatedText = text.length > 4000 ? text.slice(0, 4000) + '...' : text;

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: truncatedText,
      speed: speed,
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

/**
 * 接口：POST /api/v1/tts/synthesize-long
 * 长文本合成（分段处理）
 */
router.post('/synthesize-long', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: '请提供要合成的文本',
      });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return res.status(503).json({
        success: false,
        message: '请先配置 OPENAI_API_KEY',
      });
    }

    // 分段处理长文本
    const CHUNK_SIZE = 4000;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    const audioBuffers: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: chunks[i],
        speed: speed,
      });

      audioBuffers.push(Buffer.from(await response.arrayBuffer()));
      
      // 避免 API 限流
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 合并音频（简化处理，实际需要专业音频库合并）
    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const combinedBuffer = Buffer.concat(audioBuffers);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', combinedBuffer.length);
    res.send(combinedBuffer);
  } catch (error) {
    console.error('长文本 TTS 合成失败:', error);
    res.status(500).json({
      success: false,
      message: '语音合成失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 接口：GET /api/v1/tts/voices
 * 获取可用的语音列表
 */
router.get('/voices', async (_req: Request, res: Response) => {
  const voices = Object.values(OPENAI_VOICES).map(v => ({
    id: v.id,
    name: v.name,
    description: v.description,
    gender: v.gender,
  }));

  res.json({ success: true, data: voices });
});

/**
 * 接口：GET /api/v1/tts/audio
 * 代理获取音频文件
 */
router.get('/audio', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ success: false, message: '缺少音频URL' });
    }

    const response = await axios.get(url as string, {
      responseType: 'arraybuffer',
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', response.data.length);
    res.send(response.data);
  } catch (error) {
    console.error('获取音频失败:', error);
    res.status(500).json({ success: false, message: '获取音频失败' });
  }
});

export default router;

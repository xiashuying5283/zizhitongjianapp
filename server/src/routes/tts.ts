import express, { type Request, type Response } from 'express';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import axios from 'axios';

const router = express.Router();

// 有声书朗读专用音色
const READING_VOICES = {
  default: 'zh_female_xiaohe_uranus_bigtts',  // 小何 - 通用女声
  male: 'zh_male_m191_uranus_bigtts',  // 云舟 - 男声
  female: 'zh_female_vv_uranus_bigtts',  // Vivi - 女声（中英双语）
  audiobook: 'zh_female_xueayi_saturn_bigtts',  // 有声书专用
  elegant_male: 'zh_male_ruyayichen_saturn_bigtts',  // 儒雅男声
};

/**
 * 服务端文件：server/src/routes/tts.ts
 * 接口：POST /api/v1/tts/synthesize
 * Body 参数：text: string, speaker?: string, speechRate?: number
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, speaker = 'default', speechRate = 0 } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: '缺少文本内容' });
    }

    // 限制单次合成的文本长度
    if (text.length > 5000) {
      return res.status(400).json({ 
        success: false, 
        message: '文本过长，单次最多支持5000字' 
      });
    }

    // 提取转发头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    const config = new Config();
    const client = new TTSClient(config, customHeaders);

    // 选择音色
    const selectedSpeaker = READING_VOICES[speaker as keyof typeof READING_VOICES] || READING_VOICES.default;

    const response = await client.synthesize({
      uid: 'zizhitongjian-reader',
      text,
      speaker: selectedSpeaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate: speechRate, // -50 到 100
    });

    res.json({
      success: true,
      data: {
        audioUri: response.audioUri,
        audioSize: response.audioSize,
      },
    });
  } catch (error) {
    console.error('TTS合成失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '语音合成失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/tts.ts
 * 接口：POST /api/v1/tts/synthesize-long
 * Body 参数：texts: string[], speaker?: string, speechRate?: number
 * 用于长文本分段合成
 */
router.post('/synthesize-long', async (req: Request, res: Response) => {
  try {
    const { texts, speaker = 'default', speechRate = 0 } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ success: false, message: '缺少文本内容' });
    }

    // 限制分段数量
    if (texts.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: '分段过多，单次最多支持50段' 
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const client = new TTSClient(config, customHeaders);

    const selectedSpeaker = READING_VOICES[speaker as keyof typeof READING_VOICES] || READING_VOICES.default;

    const results = [];
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text || text.trim().length === 0) {
        results.push({ index: i, audioUri: null, audioSize: 0 });
        continue;
      }

      try {
        const response = await client.synthesize({
          uid: 'zizhitongjian-reader',
          text: text.trim(),
          speaker: selectedSpeaker,
          audioFormat: 'mp3',
          sampleRate: 24000,
          speechRate: speechRate,
        });

        results.push({
          index: i,
          audioUri: response.audioUri,
          audioSize: response.audioSize,
        });
      } catch (err) {
        console.error(`分段 ${i} 合成失败:`, err);
        results.push({ index: i, audioUri: null, audioSize: 0, error: true });
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('长文本TTS合成失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '语音合成失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 服务端文件：server/src/routes/tts.ts
 * 接口：GET /api/v1/tts/voices
 * 获取可用的朗读音色列表
 */
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = [
      { id: 'default', name: '小何', description: '通用女声，清晰自然', gender: 'female' },
      { id: 'male', name: '云舟', description: '标准男声，沉稳大气', gender: 'male' },
      { id: 'female', name: 'Vivi', description: '中英双语女声', gender: 'female' },
      { id: 'audiobook', name: '有声书', description: '有声书专用女声，适合长篇朗读', gender: 'female' },
      { id: 'elegant_male', name: '儒雅', description: '儒雅男声，适合古文朗读', gender: 'male' },
    ];

    res.json({ success: true, data: voices });
  } catch (error) {
    console.error('获取音色列表失败:', error);
    res.status(500).json({ success: false, message: '获取音色列表失败' });
  }
});

/**
 * 服务端文件：server/src/routes/tts.ts
 * 接口：GET /api/v1/tts/audio
 * Query 参数：url: string
 * 代理获取音频文件，用于处理跨域问题
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

/**
 * 翻译进度监控脚本
 * 每 10 分钟检查一次翻译进度，如果进程停止则自动重启
 * 
 * 使用方法：npx tsx scripts/monitor_translate.ts
 */

import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MONITOR_INTERVAL = 10 * 60 * 1000; // 10 分钟

async function getProgress(): Promise<{ completed: number; total: number }> {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM (
        SELECT volume_number FROM zizhitongjian_paragraphs 
        GROUP BY volume_number
        HAVING COUNT(CASE WHEN translation IS NOT NULL AND translation != '' AND translation != '翻译失败' AND translation != '翻译中' THEN 1 END) = COUNT(*)
      ) t) as completed,
      (SELECT COUNT(DISTINCT volume_number) FROM zizhitongjian_paragraphs) as total
  `);
  
  return {
    completed: parseInt(result.rows[0].completed, 10),
    total: parseInt(result.rows[0].total, 10),
  };
}

async function getNextVolumeToTranslate(): Promise<number | null> {
  const result = await pool.query(`
    SELECT MIN(volume_number) as next_volume FROM (
      SELECT volume_number, 
             COUNT(*) as total,
             COUNT(CASE WHEN translation IS NOT NULL AND translation != '' AND translation != '翻译失败' AND translation != '翻译中' THEN 1 END) as translated
      FROM zizhitongjian_paragraphs 
      GROUP BY volume_number
      HAVING COUNT(CASE WHEN translation IS NOT NULL AND translation != '' AND translation != '翻译失败' AND translation != '翻译中' THEN 1 END) < COUNT(*)
    ) t
  `);
  
  return result.rows[0].next_volume || null;
}

async function isTranslateRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('pgrep -f "translate_volumes.ts"');
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function startTranslate(startVolume: number): Promise<void> {
  console.log(`启动翻译进程，从第 ${startVolume} 卷开始...`);
  
  await execAsync(
    `cd /workspace/projects/server && nohup npm exec tsx scripts/translate_volumes.ts ${startVolume} 294 > /tmp/translate.log 2>&1 &`
  );
  
  console.log('翻译进程已启动');
}

function log(message: string): void {
  const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  console.log(`[${timestamp}] ${message}`);
}

async function monitor(): Promise<void> {
  log('========== 翻译监控启动 ==========');
  
  while (true) {
    try {
      // 获取当前进度
      const progress = await getProgress();
      log(`当前进度: ${progress.completed}/${progress.total} 卷`);
      
      // 检查是否全部完成
      if (progress.completed >= progress.total) {
        log('========== 全部翻译完成！ ==========');
        await pool.end();
        return;
      }
      
      // 检查翻译进程是否在运行
      const isRunning = await isTranslateRunning();
      
      if (!isRunning) {
        log('翻译进程已停止，准备重启...');
        
        // 找到下一个需要翻译的卷
        const nextVolume = await getNextVolumeToTranslate();
        
        if (nextVolume) {
          await startTranslate(nextVolume);
        } else {
          log('没有找到需要翻译的卷，可能已全部完成');
        }
      } else {
        log('翻译进程运行中...');
      }
    } catch (error) {
      log(`监控出错: ${error}`);
    }
    
    // 等待 10 分钟
    log(`等待 ${MONITOR_INTERVAL / 60000} 分钟后再次检查...`);
    await new Promise(resolve => setTimeout(resolve, MONITOR_INTERVAL));
  }
}

monitor().catch(console.error);

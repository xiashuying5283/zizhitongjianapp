import { Pool } from 'pg';

/**
 * 全局唯一的 PostgreSQL 连接池。
 *
 * 之前每个路由各自 `new Pool()`，默认 max=10，17 个模块理论上可占用 170+ 条连接，
 * 而 PostgreSQL 默认 max_connections=100，并发一高就会出现 ETIMEDOUT / too many clients。
 * 统一成单例后由这一处以 max 限制总量。
 */
let pgPool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pgPool = new Pool({
      connectionString,
      // 强制 SSL；rejectUnauthorized=false 兼容数据库自签名证书
      ssl: { rejectUnauthorized: false },
      // 整个进程共用的连接上限
      max: 20,
      // 空闲连接 30s 后回收
      idleTimeoutMillis: 30_000,
      // 建连最多等 10s，快速失败而不是一直挂着拖垮请求
      connectionTimeoutMillis: 10_000,
    });

    // 空闲客户端出错时若没有 error 监听，会导致进程直接崩溃
    pgPool.on('error', (err) => {
      console.error('[pg-pool] 空闲连接异常:', err.message);
    });
  }

  return pgPool;
}

export default getPgPool;

import { Pool } from 'pg';

let pgPool: Pool | null = null;

/**
 * 获取 PostgreSQL 连接池（单例）
 */
function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pgPool = new Pool({ connectionString });
  }
  return pgPool;
}

export { getPgPool };

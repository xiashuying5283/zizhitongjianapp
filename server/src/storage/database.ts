import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// 从环境变量获取数据库连接信息
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// 创建 postgres 连接（require：强制 SSL 但不校验证书，兼容自签名证书）
const client = postgres(connectionString, { ssl: 'require' });

// 创建 Drizzle ORM 实例
export const db = drizzle(client);

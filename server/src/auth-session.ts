import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 characters');
  }
  return value;
}

export function assertSessionConfiguration(): void {
  secret();
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(userId: number): string {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
  })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token: string): number | null {
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) return null;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data !== 'object') return null;
    const claims = data as { sub?: unknown; exp?: unknown };
    if (!Number.isSafeInteger(claims.sub) || Number(claims.sub) <= 0) return null;
    if (typeof claims.exp !== 'number' || claims.exp <= Date.now() / 1000) return null;
    return Number(claims.sub);
  } catch {
    return null;
  }
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const match = /^Bearer (\S+)$/i.exec(req.header('Authorization') || '');
  const userId = match ? verifySessionToken(match[1]) : null;
  if (!userId) {
    res.status(401).json({ success: false, message: '登录已失效，请重新登录' });
    return;
  }
  res.locals.userId = userId;
  req.headers['x-device-id'] = `user:${userId}`;
  // Old clients send an identity in the body or query. Never trust it.
  if (req.body && typeof req.body === 'object') {
    req.body.userId = userId;
    delete req.body.deviceId;
  }
  const query = req.query;
  if ((query.userId !== undefined || query.deviceId !== undefined) && !(req.method === 'GET' && req.path === '/posts')) {
    // Express 4 computes req.query on access, so mutating it would not persist.
    const trustedQuery: Record<string, unknown> = { ...query, userId: String(userId) };
    delete trustedQuery.deviceId;
    Object.defineProperty(req, 'query', { value: trustedQuery, configurable: true });
  }
  next();
}

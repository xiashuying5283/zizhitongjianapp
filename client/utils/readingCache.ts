/**
 * 阅读首页数据缓存模块
 * 用于实现缓存优先加载策略，提升页面切换体验
 */

import { RecentRead } from '@/utils/readingProgress';

export interface DynastyGroup {
  dynasty: string;
  dynastyLabel: string;
  count: number;
  volumes: Array<{
    id: number;
    volume: number;
    name: string;
    year_start: number | null;
    year_end: number | null;
    status: 'unread' | 'reading' | 'read';
    progress: number;
  }>;
}

// 模块级缓存（应用生命周期内有效）
let dynastyGroupsCache: DynastyGroup[] | null = null;
let recentReadCache: RecentRead | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30 * 1000; // 缓存有效期 30 秒

/**
 * 获取缓存的卷分组数据
 */
export function getDynastyGroupsCache(): DynastyGroup[] | null {
  if (dynastyGroupsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return dynastyGroupsCache;
  }
  return null;
}

/**
 * 设置卷分组数据缓存
 */
export function setDynastyGroupsCache(data: DynastyGroup[]): void {
  dynastyGroupsCache = data;
  cacheTimestamp = Date.now();
}

/**
 * 获取缓存的最近阅读数据
 */
export function getRecentReadCache(): RecentRead | null {
  return recentReadCache;
}

/**
 * 设置最近阅读数据缓存
 */
export function setRecentReadCache(data: RecentRead | null): void {
  recentReadCache = data;
}

/**
 * 更新最近阅读的进度（用于乐观更新）
 */
export function updateRecentReadProgress(progress: number): void {
  if (recentReadCache) {
    recentReadCache = { ...recentReadCache, progress };
  }
}

/**
 * 清除所有缓存
 */
export function clearReadingCache(): void {
  dynastyGroupsCache = null;
  recentReadCache = null;
  cacheTimestamp = 0;
}

/**
 * 清除最近阅读缓存（用于页面刷新时）
 */
export function clearRecentReadCache(): void {
  recentReadCache = null;
}

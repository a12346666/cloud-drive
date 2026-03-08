/**
 * 缓存系统 - 用于大规模性能优化
 * 支持内存缓存和Redis扩展
 */

import NodeCache from 'node-cache'

// 缓存配置
const CACHE_TTL = {
  USER: 300,        // 用户数据缓存5分钟
  FILE_LIST: 60,    // 文件列表缓存1分钟
  FOLDER: 120,      // 文件夹缓存2分钟
  STORAGE: 30,      // 存储统计缓存30秒
  SHARE: 600,       // 分享信息缓存10分钟
  CONFIG: 3600,     // 系统配置缓存1小时
}

// 创建缓存实例
const memoryCache = new NodeCache({
  stdTTL: 300,      // 默认5分钟
  checkperiod: 60,  // 每分钟检查过期
  useClones: false, // 提高性能
  maxKeys: 10000,   // 最多10000个key
})

// 缓存统计
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
}

/**
 * 获取缓存
 */
export const get = <T>(key: string): T | undefined => {
  const value = memoryCache.get<T>(key)
  if (value !== undefined) {
    cacheStats.hits++
  } else {
    cacheStats.misses++
  }
  return value
}

/**
 * 设置缓存
 */
export const set = <T>(key: string, value: T, ttl?: number): boolean => {
  cacheStats.sets++
  return memoryCache.set(key, value, ttl || 300)
}

/**
 * 删除缓存
 */
export const del = (key: string): number => {
  cacheStats.deletes++
  return memoryCache.del(key)
}

/**
 * 批量删除缓存(支持通配符)
 */
export const delPattern = (pattern: string): number => {
  const keys = memoryCache.keys()
  const matchingKeys = keys.filter(key => key.includes(pattern))
  return memoryCache.del(matchingKeys)
}

/**
 * 清空缓存
 */
export const flush = (): void => {
  memoryCache.flushAll()
  cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 }
}

/**
 * 获取缓存统计
 */
export const getStats = () => {
  const stats = memoryCache.getStats()
  return {
    ...cacheStats,
    keys: memoryCache.keys().length,
    hitRate: cacheStats.hits + cacheStats.misses > 0
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2) + '%'
      : '0%',
    v8Stats: stats,
  }
}

/**
 * 生成缓存Key
 */
export const generateKey = (...parts: (string | number)[]): string => {
  return parts.join(':')
}

// 用户相关缓存
export const userCache = {
  get: (userId: number) => get<any>(`user:${userId}`),
  set: (userId: number, data: any) => set(`user:${userId}`, data, CACHE_TTL.USER),
  del: (userId: number) => del(`user:${userId}`),
}

// 文件列表缓存
export const fileListCache = {
  get: (userId: number, folderId: number | null, page: number) =>
    get<any>(`files:${userId}:${folderId || 'root'}:${page}`),
  set: (userId: number, folderId: number | null, page: number, data: any) =>
    set(`files:${userId}:${folderId || 'root'}:${page}`, data, CACHE_TTL.FILE_LIST),
  del: (userId: number) => delPattern(`files:${userId}:`),
}

// 存储统计缓存
export const storageCache = {
  get: (userId: number) => get<any>(`storage:${userId}`),
  set: (userId: number, data: any) => set(`storage:${userId}`, data, CACHE_TTL.STORAGE),
  del: (userId: number) => del(`storage:${userId}`),
}

// 分享缓存
export const shareCache = {
  get: (shareId: string) => get<any>(`share:${shareId}`),
  set: (shareId: string, data: any) => set(`share:${shareId}`, data, CACHE_TTL.SHARE),
  del: (shareId: string) => del(`share:${shareId}`),
}

export default {
  get,
  set,
  del,
  delPattern,
  flush,
  getStats,
  generateKey,
  userCache,
  fileListCache,
  storageCache,
  shareCache,
}

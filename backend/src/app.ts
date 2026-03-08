/**
 * Cloud Drive 后端应用入口
 * 苹果风格网盘系统后端API - 大规模优化版本
 * 包含性能优化、安全增强、缓存系统
 */

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import cron from 'node-cron'

// 加载环境变量
dotenv.config()

// 导入路由
import authRoutes from './routes/auth'
import fileRoutes from './routes/files'
import folderRoutes from './routes/folders'
import adminRoutes from './routes/admin'
import shareRoutes from './routes/shares'
import trashRoutes from './routes/trash'
import tagRoutes from './routes/tags'
import batchRoutes from './routes/batch'
import versionRoutes from './routes/versions'
import consentRoutes from './routes/consent'

// 导入安全中间件
import {
  helmetMiddleware,
  xssProtection,
  sqlInjectionProtection,
  requestLogger,
} from './middleware/security'
import {
  pathTraversalProtection,
  validateFileId,
  validateFilename,
  securityHeaders,
  validatePagination,
  validateSearchQuery,
} from './middleware/securityEnhanced'
import { sanitizeInput } from './middleware/validation'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

// 导入定时任务
import { cleanupExpiredShares } from './controllers/shareController'
import { autoCleanupTrash } from './controllers/trashController'
import { cleanupOldLogs } from './utils/logger'
import { getStats } from './utils/cache'
import { cleanupExpiredChunks } from './services/chunkUploadService'
import { cleanupUnreferencedFiles } from './services/deduplicationService'

// 创建Express应用
const app = express()
const PORT = process.env.PORT || 3001

// 信任代理 (用于获取真实IP)
app.set('trust proxy', 1)

// 安全中间件
app.use(helmetMiddleware)
app.use(xssProtection)
app.use(sqlInjectionProtection)
app.use(requestLogger)
app.use(securityHeaders)
app.use(pathTraversalProtection)
app.use(sanitizeInput)
app.use(validatePagination)
app.use(validateSearchQuery)

// 压缩响应
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  level: 6, // 压缩级别
}))

// API限流配置 - 根据环境调整
const isProduction = process.env.NODE_ENV === 'production'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: isProduction ? 100 : 1000, // 生产环境100次，开发环境1000次
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown'
  },
})

// 严格限流(用于登录、注册等敏感操作)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: isProduction ? 5 : 10, // 生产环境5次，开发环境10次
  message: {
    success: false,
    message: '请求过于频繁，请15分钟后再试',
  },
  skipSuccessfulRequests: true, // 成功的请求不计数
  keyGenerator: (req) => {
    return req.ip || 'unknown'
  },
})

// 上传限流
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: isProduction ? 20 : 50, // 生产环境20次，开发环境50次
  message: {
    success: false,
    message: '上传次数已达上限，请稍后再试',
  },
  keyGenerator: (req) => {
    return req.ip || 'unknown'
  },
})

// CORS配置
app.use(cors({
  origin: isProduction
    ? process.env.FRONTEND_URL || 'http://localhost:5173'
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Captcha-Id',
    'X-Security-Token',
  ],
  exposedHeaders: ['X-Captcha-Id', 'X-Total-Count'],
}))

// 增加请求体大小限制以支持大文件上传
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))
app.use(cookieParser())

// 应用全局限流
app.use('/api/', limiter)

// 静态文件服务(用于文件预览) - 添加缓存控制
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: isProduction ? '1d' : 0, // 生产环境缓存1天
  etag: true,
  lastModified: true,
}))

// API路由 - 应用特定限流
app.use('/api/auth/login', strictLimiter)
app.use('/api/auth/register', strictLimiter)
app.use('/api/files/upload', uploadLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/shares', shareRoutes)
app.use('/api/trash', trashRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/batch', batchRoutes)
app.use('/api/files', versionRoutes)
app.use('/api/consent', consentRoutes)

// 缓存统计端点(仅管理员)
app.get('/api/admin/cache-stats', (req, res) => {
  res.json({
    success: true,
    data: getStats(),
  })
})

// 健康检查端点
app.get('/api/health', (req, res) => {
  const os = require('os')
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
    },
  })
})

app.use(notFoundHandler)
app.use(errorHandler)

// 启动服务器
const server = app.listen(PORT, () => {
  console.log('='.repeat(60))
  console.log('🚀 Cloud Drive 后端服务器已启动')
  console.log('='.repeat(60))
  console.log(`📡 服务器地址: http://localhost:${PORT}`)
  console.log(`🔧 运行环境: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📁 上传目录: ${path.resolve(process.env.UPLOAD_DIR || './uploads')}`)
  console.log(`🔒 API限流: 已启用 (${isProduction ? '生产模式' : '开发模式'})`)
  console.log(`🛡️ 安全中间件: 已启用`)
  console.log(`⚡ 响应压缩: 已启用`)
  console.log(`💾 缓存系统: 已启用`)
  console.log('='.repeat(60))
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// 定时任务: 每小时清理过期分享
cron.schedule('0 * * * *', async () => {
  try {
    const count = await cleanupExpiredShares()
    if (count > 0) {
      console.log(`[定时任务] 清理了 ${count} 个过期分享`)
    }
  } catch (error) {
    console.error('[定时任务] 清理过期分享失败:', error)
  }
})

// 定时任务: 每天凌晨3点清理回收站(删除超过30天的项目)
cron.schedule('0 3 * * *', async () => {
  try {
    const result = await autoCleanupTrash()
    if (result.files > 0 || result.folders > 0) {
      console.log(`[定时任务] 清理回收站: ${result.files} 个文件, ${result.folders} 个文件夹`)
    }
  } catch (error) {
    console.error('[定时任务] 清理回收站失败:', error)
  }
})

// 定时任务: 每周一凌晨4点清理过期日志(保留90天)
cron.schedule('0 4 * * 1', async () => {
  try {
    const count = await cleanupOldLogs()
    if (count > 0) {
      console.log(`[定时任务] 清理了 ${count} 条过期日志`)
    }
  } catch (error) {
    console.error('[定时任务] 清理过期日志失败:', error)
  }
})

// 定时任务: 每10分钟清理过期缓存
cron.schedule('*/10 * * * *', () => {
  const stats = getStats()
  console.log(`[缓存统计] Keys: ${stats.keys}, 命中率: ${stats.hitRate}`)
})

// 定时任务: 每天凌晨2点清理过期分片(保留24小时)
cron.schedule('0 2 * * *', async () => {
  try {
    const count = await cleanupExpiredChunks(24)
    if (count > 0) {
      console.log(`[定时任务] 清理了 ${count} 个过期分片`)
    }
  } catch (error) {
    console.error('[定时任务] 清理过期分片失败:', error)
  }
})

// 定时任务: 每周日凌晨3点清理无引用的物理文件
cron.schedule('0 3 * * 0', async () => {
  try {
    const count = await cleanupUnreferencedFiles()
    if (count > 0) {
      console.log(`[定时任务] 清理了 ${count} 个无引用的物理文件`)
    }
  } catch (error) {
    console.error('[定时任务] 清理无引用文件失败:', error)
  }
})

export default app

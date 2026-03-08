/**
 * 安全中间件 - 针对大规模使用的安全增强
 * 包含XSS防护、SQL注入防护、请求验证等
 */

import { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'
import xss from 'xss'

/**
 * Helmet安全头配置
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
})

/**
 * XSS防护中间件
 * 清理请求中的恶意脚本
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 清理请求体
  if (req.body) {
    req.body = sanitizeObject(req.body)
  }

  // 清理查询参数
  if (req.query) {
    req.query = sanitizeObject(req.query)
  }

  // 清理路由参数
  if (req.params) {
    req.params = sanitizeObject(req.params)
  }

  next()
}

/**
 * 递归清理对象中的字符串值
 */
const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {}, // 不允许任何HTML标签
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
    })
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }

  return obj
}

/**
 * SQL注入防护中间件
 * 检测并阻止可疑的SQL注入尝试
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction): void => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|APPLET|OBJECT|EMBED|FRAME|IFRAME)\b)|(--|#|\/\*|\*\/|;)/i

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPattern.test(value)
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue)
    }
    return false
  }

  const suspicious = checkValue(req.body) || checkValue(req.query) || checkValue(req.params)

  if (suspicious) {
    res.status(403).json({
      success: false,
      message: '检测到可疑请求，已被拦截',
    })
    return
  }

  next()
}

/**
 * 请求大小限制中间件
 */
export const requestSizeLimit = (maxSize: string = '100mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0')
    const maxBytes = parseSize(maxSize)

    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        message: '请求体过大',
      })
      return
    }

    next()
  }
}

/**
 * 解析大小字符串为字节数
 */
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  }

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/)
  if (!match) return 100 * 1024 * 1024 // 默认100MB

  const value = parseFloat(match[1])
  const unit = match[2]

  return value * (units[unit] || 1)
}

/**
 * 请求频率限制中间件(更严格的版本)
 */
export const strictRateLimit = (options: {
  windowMs?: number
  maxRequests?: number
  keyPrefix?: string
} = {}) => {
  const { windowMs = 60000, maxRequests = 100, keyPrefix = 'ratelimit' } = options

  const requests = new Map<string, { count: number; resetTime: number }>()

  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of requests.entries()) {
      if (now > record.resetTime) {
        requests.delete(key)
      }
    }
  }, windowMs)

  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${keyPrefix}:${req.ip}`
    const now = Date.now()

    const record = requests.get(key)

    if (!record || now > record.resetTime) {
      requests.set(key, {
        count: 1,
        resetTime: now + windowMs,
      })
      next()
      return
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      })
      return
    }

    record.count++
    next()
  }
}

/**
 * IP黑名单中间件
 */
export const ipBlacklist = (blacklistedIPs: string[] = []) => {
  const blacklist = new Set(blacklistedIPs)

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.socket.remoteAddress || ''

    if (blacklist.has(clientIP)) {
      res.status(403).json({
        success: false,
        message: '访问被拒绝',
      })
      return
    }

    next()
  }
}

/**
 * 敏感操作验证中间件
 * 用于重要操作前的额外验证
 */
export const sensitiveOperationCheck = (req: Request, res: Response, next: NextFunction): void => {
  // 检查请求头中的安全令牌
  const securityToken = req.headers['x-security-token']

  if (!securityToken) {
    res.status(403).json({
      success: false,
      message: '缺少安全验证令牌',
    })
    return
  }

  // 这里可以添加更多的验证逻辑
  // 例如验证令牌的签名、过期时间等

  next()
}

/**
 * 日志记录中间件
 * 记录所有请求的详细信息
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length'),
    }

    // 记录慢请求警告
    if (duration > 5000) {
      console.warn(`[慢请求警告] ${req.method} ${req.originalUrl} 耗时 ${duration}ms`)
    }

    // 记录错误请求
    if (res.statusCode >= 400) {
      console.error(`[错误请求] ${JSON.stringify(logData)}`)
    }
  })

  next()
}

/**
 * MongoDB注入防护
 */
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[安全警告] 检测到并清理了可疑的MongoDB操作符: ${key}`)
  },
})

export default {
  helmetMiddleware,
  xssProtection,
  sqlInjectionProtection,
  requestSizeLimit,
  strictRateLimit,
  ipBlacklist,
  sensitiveOperationCheck,
  requestLogger,
  mongoSanitizeMiddleware,
}

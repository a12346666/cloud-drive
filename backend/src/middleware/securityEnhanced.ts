/**
 * 增强安全中间件
 * 包含路径遍历防护、CSRF保护、输入验证等
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { securityConfig } from '../config/security'

const failedLoginAttempts = new Map<string, { count: number; lockoutUntil: number }>()
const csrfTokens = new Map<string, { token: string; expires: number }>()

export const pathTraversalProtection = (req: Request, res: Response, next: NextFunction): void => {
  const checkPathTraversal = (value: any): boolean => {
    if (typeof value !== 'string') return false
    const lowerValue = value.toLowerCase()
    return securityConfig.pathTraversal.blockedPatterns.some(pattern => 
      lowerValue.includes(pattern.toLowerCase())
    )
  }

  const checkObject = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false
    if (Array.isArray(obj)) {
      return obj.some(checkObject)
    }
    return Object.values(obj).some(val => {
      if (typeof val === 'string') return checkPathTraversal(val)
      if (typeof val === 'object') return checkObject(val)
      return false
    })
  }

  if (checkPathTraversal(req.path) || 
      checkObject(req.body) || 
      checkObject(req.query) || 
      checkObject(req.params)) {
    res.status(403).json({
      success: false,
      message: '检测到非法路径访问',
      code: 'PATH_TRAVERSAL_BLOCKED',
    })
    return
  }

  next()
}

export const validateFileId = (req: Request, res: Response, next: NextFunction): void => {
  const { id, fileId, folderId } = { ...req.params, ...req.body }
  const idsToCheck = [id, fileId, folderId].filter(Boolean)

  for (const idStr of idsToCheck) {
    const num = parseInt(idStr as string)
    if (isNaN(num) || num <= 0 || num > Number.MAX_SAFE_INTEGER) {
      res.status(400).json({
        success: false,
        message: '无效的资源ID',
        code: 'INVALID_ID',
      })
      return
    }
  }

  next()
}

export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') return ''
  
  let sanitized = filename
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, '_$1')
    .trim()
  
  if (sanitized.length > 255) {
    const ext = sanitized.lastIndexOf('.')
    if (ext > 0) {
      const extension = sanitized.substring(ext)
      sanitized = sanitized.substring(0, 255 - extension.length) + extension
    } else {
      sanitized = sanitized.substring(0, 255)
    }
  }

  return sanitized || 'unnamed_file'
}

export const validateFilename = (req: Request, res: Response, next: NextFunction): void => {
  const { name, filename, originalName } = { ...req.body, ...req.query }
  const namesToCheck = [name, filename, originalName].filter(Boolean)

  for (const nameStr of namesToCheck) {
    if (typeof nameStr !== 'string') continue
    
    if (nameStr.length === 0 || nameStr.length > 255) {
      res.status(400).json({
        success: false,
        message: '文件名长度无效',
        code: 'INVALID_FILENAME_LENGTH',
      })
      return
    }

    if (securityConfig.pathTraversal.blockedPatterns.some(p => 
      nameStr.toLowerCase().includes(p.toLowerCase())
    )) {
      res.status(400).json({
        success: false,
        message: '文件名包含非法字符',
        code: 'INVALID_FILENAME_CHARS',
      })
      return
    }
  }

  if (req.body.name) req.body.name = sanitizeFilename(req.body.name)
  if (req.body.filename) req.body.filename = sanitizeFilename(req.body.filename)
  if (req.body.originalName) req.body.originalName = sanitizeFilename(req.body.originalName)

  next()
}

export const validateMimeType = (req: Request, res: Response, next: NextFunction): void => {
  const file = req.file as Express.Multer.File | undefined
  
  if (!file) {
    next()
    return
  }

  const detectedMime = file.mimetype.toLowerCase()
  
  if (!securityConfig.fileUpload.allowedMimeTypes.includes(detectedMime) && 
      detectedMime !== 'application/octet-stream') {
    res.status(415).json({
      success: false,
      message: `不支持的文件类型: ${detectedMime}`,
      code: 'UNSUPPORTED_FILE_TYPE',
    })
    return
  }

  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))
  if (securityConfig.fileUpload.dangerousExtensions.includes(ext)) {
    res.status(415).json({
      success: false,
      message: '禁止上传可执行文件',
      code: 'DANGEROUS_FILE_TYPE',
    })
    return
  }

  next()
}

export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (!securityConfig.csrf.enabled) {
    next()
    return
  }

  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    if (req.user?.id) {
      const existingToken = csrfTokens.get(req.user.id.toString())
      if (!existingToken || existingToken.expires < Date.now()) {
        const newToken = generateCSRFToken()
        csrfTokens.set(req.user.id.toString(), {
          token: newToken,
          expires: Date.now() + securityConfig.session.maxAge,
        })
        res.setHeader('X-CSRF-Token', newToken)
      } else {
        res.setHeader('X-CSRF-Token', existingToken.token)
      }
    }
    next()
    return
  }

  const csrfToken = req.headers['x-csrf-token'] as string
  const userId = req.user?.id?.toString()

  if (!userId || !csrfToken) {
    res.status(403).json({
      success: false,
      message: 'CSRF验证失败',
      code: 'CSRF_MISSING',
    })
    return
  }

  const storedToken = csrfTokens.get(userId)
  if (!storedToken || storedToken.token !== csrfToken || storedToken.expires < Date.now()) {
    res.status(403).json({
      success: false,
      message: 'CSRF令牌无效或已过期',
      code: 'CSRF_INVALID',
    })
    return
  }

  next()
}

export const loginAttemptLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const record = failedLoginAttempts.get(ip)

  if (record && record.lockoutUntil > now) {
    const remainingTime = Math.ceil((record.lockoutUntil - now) / 1000 / 60)
    res.status(429).json({
      success: false,
      message: `账号已被锁定，请在 ${remainingTime} 分钟后重试`,
      code: 'ACCOUNT_LOCKED',
      retryAfter: remainingTime * 60,
    })
    return
  }

  next()
}

export const recordFailedLogin = (ip: string): void => {
  const now = Date.now()
  const record = failedLoginAttempts.get(ip)

  if (!record || now > record.lockoutUntil) {
    failedLoginAttempts.set(ip, { count: 1, lockoutUntil: 0 })
    return
  }

  record.count++
  if (record.count >= securityConfig.rateLimit.auth.maxAttempts) {
    record.lockoutUntil = now + securityConfig.rateLimit.auth.lockoutDuration
  }
}

export const clearFailedLogin = (ip: string): void => {
  failedLoginAttempts.delete(ip)
}

export const checkLoginStatus = (ip: string): { isLocked: boolean; remainingAttempts: number; lockoutMinutes: number } => {
  const record = failedLoginAttempts.get(ip)
  const now = Date.now()

  if (!record || now > record.lockoutUntil) {
    return { 
      isLocked: false, 
      remainingAttempts: securityConfig.rateLimit.auth.maxAttempts,
      lockoutMinutes: 0,
    }
  }

  if (record.lockoutUntil > now) {
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutMinutes: Math.ceil((record.lockoutUntil - now) / 1000 / 60),
    }
  }

  return {
    isLocked: false,
    remainingAttempts: securityConfig.rateLimit.auth.maxAttempts - record.count,
    lockoutMinutes: 0,
  }
}

export const contentLengthCheck = (maxSizeMB: number = 100) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0')
    const maxBytes = maxSizeMB * 1024 * 1024

    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        message: `请求体过大，最大允许 ${maxSizeMB}MB`,
        code: 'CONTENT_TOO_LARGE',
      })
      return
    }

    next()
  }
}

export const noSniff = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
}

export const referrerPolicy = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
}

export const permissionsPolicy = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  )
  next()
}

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  )
  next()
}

export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const { page, limit } = req.query

  if (page) {
    const pageNum = parseInt(page as string)
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 10000) {
      req.query.page = '1'
    }
  }

  if (limit) {
    const limitNum = parseInt(limit as string)
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      req.query.limit = '50'
    }
  }

  next()
}

export const validateSort = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { sortBy, sortOrder } = req.query

    if (sortBy && !allowedFields.includes(sortBy as string)) {
      req.query.sortBy = allowedFields[0]
    }

    if (sortOrder && !['asc', 'desc'].includes((sortOrder as string).toLowerCase())) {
      req.query.sortOrder = 'desc'
    }

    next()
  }
}

export const validateSearchQuery = (req: Request, res: Response, next: NextFunction): void => {
  const { search, q } = req.query
  const searchQuery = (search || q) as string | undefined

  if (searchQuery) {
    if (searchQuery.length > 100) {
      res.status(400).json({
        success: false,
        message: '搜索关键词过长',
        code: 'SEARCH_QUERY_TOO_LONG',
      })
      return
    }

    if (/[<>{}[\]\\\/]/.test(searchQuery)) {
      res.status(400).json({
        success: false,
        message: '搜索关键词包含非法字符',
        code: 'INVALID_SEARCH_CHARS',
      })
      return
    }
  }

  next()
}

export default {
  pathTraversalProtection,
  validateFileId,
  sanitizeFilename,
  validateFilename,
  validateMimeType,
  csrfProtection,
  generateCSRFToken,
  loginAttemptLimiter,
  recordFailedLogin,
  clearFailedLogin,
  checkLoginStatus,
  contentLengthCheck,
  securityHeaders,
  validatePagination,
  validateSort,
  validateSearchQuery,
}

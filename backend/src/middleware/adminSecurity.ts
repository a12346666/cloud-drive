/**
 * 管理员安全中间件
 * 包含权限验证、操作审计、敏感操作确认等功能
 */

import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/db'
import { errorResponse } from '../utils/response'
import crypto from 'crypto'

const SENSITIVE_OPERATIONS = [
  'DELETE_USER',
  'RESET_PASSWORD',
  'UPDATE_STORAGE',
  'VIEW_USER_FILES',
  'DOWNLOAD_USER_FILE',
  'DECRYPT_USER_FILE',
  'CLEAR_CACHE',
  'RUN_SECURITY_TEST',
]

const CONSENT_REQUIRED_OPERATIONS = [
  'VIEW_USER_FILES',
  'DOWNLOAD_USER_FILE',
  'DECRYPT_USER_FILE',
]

export const adminRateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>()
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const adminId = (req as any).user?.id
    if (!adminId) {
      errorResponse(res, '未授权访问', 401)
      return
    }
    
    const key = `admin_${adminId}`
    const now = Date.now()
    const record = requests.get(key)
    
    if (record) {
      if (now > record.resetTime) {
        requests.set(key, { count: 1, resetTime: now + windowMs })
      } else if (record.count >= maxRequests) {
        errorResponse(res, '请求过于频繁，请稍后再试', 429)
        return
      } else {
        record.count++
      }
    } else {
      requests.set(key, { count: 1, resetTime: now + windowMs })
    }
    
    next()
  }
}

export const logAdminAction = (action: string, isSensitive: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res)
    
    res.json = (body: any) => {
      const adminId = (req as any).user?.id
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
      const userAgent = req.headers['user-agent']
      
      if (adminId) {
        prisma.adminAuditLog.create({
          data: {
            adminId,
            action,
            targetType: req.params.id ? 'USER' : req.params.fileId ? 'FILE' : 'SYSTEM',
            targetId: req.params.id ? parseInt(req.params.id) : req.params.fileId ? parseInt(req.params.fileId) : null,
            targetUserId: req.params.userId ? parseInt(req.params.userId) : req.params.id ? parseInt(req.params.id) : null,
            details: JSON.stringify({
              body: req.body,
              query: req.query,
              params: req.params,
              response: body?.success ? 'success' : 'failed',
            }),
            reason: req.body?.reason || null,
            ip: String(ip),
            userAgent,
            isSensitive,
          },
        }).catch(err => console.error('记录管理员操作日志失败:', err))
      }
      
      return originalJson(body)
    }
    
    next()
  }
}

export const requireSensitiveOperationCode = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const adminId = (req as any).user?.id
    const { confirmationCode } = req.body
    
    if (!confirmationCode) {
      errorResponse(res, '敏感操作需要确认码', 403)
      return
    }
    
    const codeRecord = await prisma.sensitiveOperationCode.findFirst({
      where: {
        adminId,
        code: confirmationCode,
        operation,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    })
    
    if (!codeRecord) {
      errorResponse(res, '确认码无效或已过期', 403)
      return
    }
    
    await prisma.sensitiveOperationCode.update({
      where: { id: codeRecord.id },
      data: { usedAt: new Date() },
    })
    
    next()
  }
}

export const requireUserConsent = (consentType: 'VIEW' | 'DOWNLOAD' | 'DECRYPT' | 'ALL') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const adminId = (req as any).user?.id
    const userId = req.params.userId ? parseInt(req.params.userId) : req.params.id ? parseInt(req.params.id) : null
    
    if (!userId) {
      errorResponse(res, '用户ID无效', 400)
      return
    }
    
    if (adminId === userId) {
      next()
      return
    }
    
    const consent = await prisma.adminAccessConsent.findFirst({
      where: {
        userId,
        adminId,
        isRevoked: false,
        AND: [
          {
            OR: [
              { consentType: 'ALL' },
              { consentType },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    })
    
    if (!consent) {
      errorResponse(res, '需要用户授权才能执行此操作', 403)
      return
    }
    
    ;(req as any).consent = consent
    next()
  }
}

export const generateSensitiveCode = async (adminId: number, operation: string): Promise<string> => {
  const code = crypto.randomBytes(6).toString('hex').toUpperCase()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  
  await prisma.sensitiveOperationCode.create({
    data: {
      adminId,
      code,
      operation,
      expiresAt,
    },
  })
  
  return code
}

export const validateAdminPermissions = (requiredRole: string = 'ADMIN') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user
    
    if (!user) {
      errorResponse(res, '未授权访问', 401)
      return
    }
    
    if (requiredRole === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      errorResponse(res, '需要超级管理员权限', 403)
      return
    }
    
    if (requiredRole === 'ADMIN' && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      errorResponse(res, '需要管理员权限', 403)
      return
    }
    
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true, role: true },
    })
    
    if (!dbUser || !dbUser.isActive) {
      errorResponse(res, '账户已被禁用', 403)
      return
    }
    
    next()
  }
}

export const checkAdminActionPermission = async (
  adminId: number,
  action: string,
  targetUserId?: number
): Promise<{ allowed: boolean; reason?: string }> => {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true, isActive: true },
  })
  
  if (!admin || !admin.isActive) {
    return { allowed: false, reason: '管理员账户无效' }
  }
  
  if (admin.role !== 'SUPER_ADMIN' && SENSITIVE_OPERATIONS.includes(action)) {
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { role: true },
      })
      
      if (targetUser && ['ADMIN', 'SUPER_ADMIN'].includes(targetUser.role)) {
        return { allowed: false, reason: '无权操作其他管理员账户' }
      }
    }
  }
  
  return { allowed: true }
}

export const preventSelfModification = (req: Request, res: Response, next: NextFunction): void => {
  const adminId = (req as any).user?.id
  const targetId = req.params.id ? parseInt(req.params.id) : null
  
  if (targetId && adminId === targetId) {
    errorResponse(res, '不能对自己执行此操作', 403)
    return
  }
  
  next()
}

export default {
  adminRateLimiter,
  logAdminAction,
  requireSensitiveOperationCode,
  requireUserConsent,
  generateSensitiveCode,
  validateAdminPermissions,
  checkAdminActionPermission,
  preventSelfModification,
  SENSITIVE_OPERATIONS,
  CONSENT_REQUIRED_OPERATIONS,
}

/**
 * 操作日志工具
 * 记录用户的各种操作行为
 */

import { Request, Response, NextFunction } from 'express'
import { prisma } from './db'

// 操作类型枚举
export enum OperationAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  PERMANENT_DELETE = 'PERMANENT_DELETE',
  RENAME = 'RENAME',
  MOVE = 'MOVE',
  CREATE_FOLDER = 'CREATE_FOLDER',
  SHARE = 'SHARE',
  CANCEL_SHARE = 'CANCEL_SHARE',
  PREVIEW = 'PREVIEW',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  STAR = 'STAR',
  UNSTAR = 'UNSTAR',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

// 操作对象类型
export enum TargetType {
  FILE = 'FILE',
  FOLDER = 'FOLDER',
  USER = 'USER',
  SHARE = 'SHARE',
  SYSTEM = 'SYSTEM',
}

// 日志记录参数接口
interface LogParams {
  userId: number
  action: OperationAction
  targetType?: TargetType
  targetId?: number | string
  details?: Record<string, any>
  req?: Request
}

/**
 * 记录操作日志
 */
export const logOperation = async (params: LogParams): Promise<void> => {
  try {
    const { userId, action, targetType, targetId, details, req } = params

    await prisma.operationLog.create({
      data: {
        userId,
        action,
        targetType: targetType || null,
        targetId: typeof targetId === 'string' ? parseInt(targetId) || null : targetId || null,
        details: details ? JSON.stringify(details) : null,
        ip: req?.ip || req?.socket?.remoteAddress || 'unknown',
        userAgent: req?.headers?.['user-agent'] || null,
      },
    })
  } catch (error) {
    console.error('记录操作日志失败:', error)
    // 日志记录失败不应影响主业务流程
  }
}

/**
 * 创建日志记录中间件
 * 自动记录特定操作
 */
export const createLogMiddleware = (
  action: OperationAction,
  targetType?: TargetType,
  getTargetId?: (req: Request) => number | undefined
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 保存原始的json方法
    const originalJson = res.json

    // 重写json方法以捕获响应
    res.json = function (body: any) {
      // 如果响应成功，记录日志
      if (body?.success && req.user) {
        const targetId = getTargetId ? getTargetId(req) : undefined
        logOperation({
          userId: req.user.id,
          action,
          targetType,
          targetId,
          details: { body: body?.data },
          req,
        }).catch(console.error)
      }

      // 调用原始的json方法
      return originalJson.call(this, body)
    }

    next()
  }
}

/**
 * 获取用户操作日志
 */
export const getUserLogs = async (
  userId: number,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.operationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.operationLog.count({
      where: { userId },
    }),
  ])

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * 获取所有操作日志(管理员用)
 */
export const getAllLogs = async (
  page: number = 1,
  limit: number = 50,
  filters?: {
    userId?: number
    action?: OperationAction
    startDate?: Date
    endDate?: Date
  }
) => {
  const skip = (page - 1) * limit

  const where: any = {}
  if (filters?.userId) where.userId = filters.userId
  if (filters?.action) where.action = filters.action
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = filters.startDate
    if (filters.endDate) where.createdAt.lte = filters.endDate
  }

  const [logs, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.operationLog.count({ where }),
  ])

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * 清理过期日志(保留最近90天)
 */
export const cleanupOldLogs = async (): Promise<number> => {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const result = await prisma.operationLog.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
    },
  })

  return result.count
}

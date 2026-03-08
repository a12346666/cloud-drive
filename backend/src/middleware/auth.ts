/**
 * 认证中间件
 * 验证JWT令牌并设置用户信息
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt'
import { errorResponse } from '../utils/response'

// 扩展Express的Request类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: number }
    }
  }
}

/**
 * JWT认证中间件
 * 验证请求中的JWT令牌
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 从请求头或Cookie中获取token
    const authHeader = req.headers.authorization
    const tokenFromHeader = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null
    const tokenFromCookie = req.cookies?.token
    const token = tokenFromHeader || tokenFromCookie

    if (!token) {
      errorResponse(res, '未提供认证令牌', 401)
      return
    }

    // 验证token
    const decoded = verifyToken(token)
    if (!decoded) {
      errorResponse(res, '认证令牌无效或已过期', 401)
      return
    }

    // 将用户信息附加到请求对象
    req.user = {
      ...decoded,
      id: decoded.userId,
    }

    next()
  } catch (error) {
    errorResponse(res, '认证失败', 401)
  }
}

/**
 * 管理员权限中间件
 * 验证用户是否为管理员
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    errorResponse(res, '未认证', 401)
    return
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    errorResponse(res, '需要管理员权限', 403)
    return
  }

  next()
}

/**
 * 可选认证中间件
 * 验证token但不强制要求
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization
    const tokenFromHeader = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null
    const tokenFromCookie = req.cookies?.token
    const token = tokenFromHeader || tokenFromCookie

    if (token) {
      const decoded = verifyToken(token)
      if (decoded) {
        req.user = {
          ...decoded,
          id: decoded.userId,
        }
      }
    }

    next()
  } catch (error) {
    next()
  }
}

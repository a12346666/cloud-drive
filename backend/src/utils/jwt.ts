/**
 * JWT工具函数
 * 用于生成和验证JWT令牌
 */

import jwt from 'jsonwebtoken'
import { Response } from 'express'

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// JWT Payload接口
export interface JwtPayload {
  userId: number
  username: string
  role: string
}

/**
 * 生成JWT令牌
 * @param payload - 要编码的数据
 * @returns JWT令牌字符串
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any })
}

/**
 * 验证JWT令牌
 * @param token - JWT令牌
 * @returns 解码后的payload或null
 */
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch (error) {
    return null
  }
}

/**
 * 设置JWT Cookie
 * @param res - Express响应对象
 * @param token - JWT令牌
 */
export const setTokenCookie = (res: Response, token: string): void => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  })
}

/**
 * 清除JWT Cookie
 * @param res - Express响应对象
 */
export const clearTokenCookie = (res: Response): void => {
  res.clearCookie('token')
}

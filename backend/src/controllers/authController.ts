/**
 * 认证控制器
 * 处理用户注册、登录、登出等认证相关操作
 */

import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { validationResult } from 'express-validator'
import { prisma } from '../utils/db'
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/jwt'
import { successResponse, errorResponse } from '../utils/response'
import { verifyCaptcha } from './captchaController'
import { logOperation, OperationAction, TargetType } from '../utils/logger'
import { 
  recordFailedLogin, 
  clearFailedLogin, 
  checkLoginStatus 
} from '../middleware/securityEnhanced'
import { validatePasswordStrength } from '../middleware/validation'

const convertUserBigInt = (user: any) => {
  if (!user) return user
  return {
    ...user,
    storageUsed: user.storageUsed ? Number(user.storageUsed) : 0,
    storageLimit: user.storageLimit ? Number(user.storageLimit) : 0,
  }
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      errorResponse(res, '输入数据验证失败', 400, errors.array()[0].msg)
      return
    }

    const { username, email, password, captchaId, captchaCode } = req.body

    if (!verifyCaptcha(captchaId, captchaCode)) {
      errorResponse(res, '验证码错误或已过期', 400)
      return
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })
    if (existingUsername) {
      errorResponse(res, '用户名已被使用', 409)
      return
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    })
    if (existingEmail) {
      errorResponse(res, '邮箱已被注册', 409)
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER',
        storageLimit: 10737418240,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
      },
    })

    const convertedUser = convertUserBigInt(user)

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    setTokenCookie(res, token)

    await logOperation({
      userId: user.id,
      action: OperationAction.REGISTER,
      targetType: TargetType.USER,
      targetId: user.id,
      details: { username, email },
      req,
    })

    successResponse(
      res,
      {
        user: convertedUser,
        token,
      },
      '注册成功',
      201
    )
  } catch (error) {
    console.error('注册错误:', error)
    errorResponse(res, '注册失败，请稍后重试', 500)
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      errorResponse(res, '输入数据验证失败', 400, errors.array()[0].msg)
      return
    }

    const { username, password, captchaId, captchaCode } = req.body
    const ip = req.ip || 'unknown'

    const loginStatus = checkLoginStatus(ip)
    if (loginStatus.isLocked) {
      errorResponse(res, `账号已被锁定，请在 ${loginStatus.lockoutMinutes} 分钟后重试`, 429)
      return
    }

    if (!verifyCaptcha(captchaId, captchaCode)) {
      errorResponse(res, '验证码错误或已过期', 400)
      return
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    })

    if (!user) {
      recordFailedLogin(ip)
      errorResponse(res, '用户名或密码错误', 401)
      return
    }

    if (!user.isActive) {
      errorResponse(res, '账号已被禁用，请联系管理员', 403)
      return
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      recordFailedLogin(ip)
      const remaining = checkLoginStatus(ip).remainingAttempts
      errorResponse(res, `用户名或密码错误，剩余尝试次数: ${remaining}`, 401)
      return
    }

    clearFailedLogin(ip)

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    setTokenCookie(res, token)

    const { password: _, ...userWithoutPassword } = user

    const convertedUser = convertUserBigInt(userWithoutPassword)

    await logOperation({
      userId: user.id,
      action: OperationAction.LOGIN,
      targetType: TargetType.USER,
      targetId: user.id,
      details: { username: user.username, ip },
      req,
    })

    successResponse(res, {
      user: convertedUser,
      token,
    }, '登录成功')
  } catch (error) {
    console.error('登录错误:', error)
    errorResponse(res, '登录失败，请稍后重试', 500)
  }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await logOperation({
        userId: req.user.id,
        action: OperationAction.LOGOUT,
        targetType: TargetType.USER,
        targetId: req.user.id,
        details: { username: req.user.username },
        req,
      })
    }

    clearTokenCookie(res)
    successResponse(res, null, '登出成功')
  } catch (error) {
    console.error('登出错误:', error)
    errorResponse(res, '登出失败', 500)
  }
}

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        storageUsed: true,
        storageLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    const convertedUser = convertUserBigInt(user)

    successResponse(res, convertedUser, '获取用户信息成功')
  } catch (error) {
    console.error('获取用户信息错误:', error)
    errorResponse(res, '获取用户信息失败', 500)
  }
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      errorResponse(res, '输入数据验证失败', 400, errors.array()[0].msg)
      return
    }

    const { currentPassword, newPassword } = req.body

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      errorResponse(res, '当前密码错误', 400)
      return
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    })

    await logOperation({
      userId: req.user.id,
      action: OperationAction.CHANGE_PASSWORD,
      targetType: TargetType.USER,
      targetId: req.user.id,
      req,
    })

    successResponse(res, null, '密码修改成功')
  } catch (error) {
    console.error('修改密码错误:', error)
    errorResponse(res, '修改密码失败', 500)
  }
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { username, email, avatar } = req.body

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: req.user.id },
        },
      })
      if (existingUser) {
        errorResponse(res, '用户名已被使用', 409)
        return
      }
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: req.user.id },
        },
      })
      if (existingUser) {
        errorResponse(res, '邮箱已被注册', 409)
        return
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        storageUsed: true,
        storageLimit: true,
        updatedAt: true,
      },
    })

    const convertedUser = convertUserBigInt(updatedUser)

    await logOperation({
      userId: req.user.id,
      action: OperationAction.UPDATE_PROFILE,
      targetType: TargetType.USER,
      targetId: req.user.id,
      details: { username, email },
      req,
    })

    successResponse(res, convertedUser, '个人信息更新成功')
  } catch (error) {
    console.error('更新用户信息错误:', error)
    errorResponse(res, '更新用户信息失败', 500)
  }
}

export default {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
}

/**
 * 验证码控制器
 * 处理人机校验功能
 */

import { Request, Response } from 'express'
import svgCaptcha from 'svg-captcha'
import { successResponse, errorResponse } from '../utils/response'

const captchaStore = new Map<string, { code: string; expireTime: number }>()

export const generateCaptcha = (req: Request, res: Response): void => {
  try {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 3,
      color: true,
      background: '#f0f0f0',
      width: 120,
      height: 40,
      fontSize: 40,
    })

    const captchaId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    
    captchaStore.set(captchaId, {
      code: captcha.text.toLowerCase(),
      expireTime: Date.now() + 5 * 60 * 1000,
    })

    cleanupExpiredCaptchas()

    successResponse(res, {
      captchaId,
      captchaImage: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`,
    }, '获取验证码成功')
  } catch (error) {
    console.error('生成验证码错误:', error)
    errorResponse(res, '生成验证码失败', 500)
  }
}

export const verifyCaptcha = (captchaId: string, code: string): boolean => {
  if (!captchaId || !code) {
    return false
  }

  const stored = captchaStore.get(captchaId)
  if (!stored) {
    return false
  }

  if (Date.now() > stored.expireTime) {
    captchaStore.delete(captchaId)
    return false
  }

  const isValid = stored.code === code.toLowerCase()
  
  if (isValid) {
    captchaStore.delete(captchaId)
  }

  return isValid
}

const cleanupExpiredCaptchas = (): void => {
  const now = Date.now()
  for (const [id, data] of captchaStore.entries()) {
    if (now > data.expireTime) {
      captchaStore.delete(id)
    }
  }
}

export const getCaptchaStore = (): Map<string, { code: string; expireTime: number }> => {
  return captchaStore
}

/**
 * 输入验证中间件
 * 提供全面的输入验证和清理功能
 */

import { Request, Response, NextFunction } from 'express'
import { body, param, query, validationResult, ValidationChain } from 'express-validator'
import xss from 'xss'

export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return xss(obj, {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style'],
      })
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize)
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {}
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[xss(key)] = sanitize(obj[key])
        }
      }
      return sanitized
    }
    return obj
  }

  if (req.body) req.body = sanitize(req.body)
  if (req.query) req.query = sanitize(req.query)
  if (req.params) req.params = sanitize(req.params)

  next()
}

export const validateRegister: ValidationChain[] = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .withMessage('用户名只能包含字母、数字、下划线和中文')
    .not().isIn(['admin', 'root', 'system', 'test', 'guest', 'user'])
    .withMessage('该用户名不可使用'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('邮箱长度不能超过100个字符'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('密码长度必须在8-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字')
    .not().isIn(['password', '123456', '12345678', 'qwerty', 'abc123'])
    .withMessage('密码过于简单，请使用更强的密码'),
  
  body('captchaId')
    .notEmpty()
    .withMessage('验证码ID不能为空')
    .isString()
    .trim(),
  
  body('captchaCode')
    .notEmpty()
    .withMessage('验证码不能为空')
    .isLength({ min: 4, max: 6 })
    .withMessage('验证码长度无效'),
]

export const validateLogin: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('请输入用户名或邮箱')
    .isLength({ max: 100 })
    .withMessage('输入过长'),
  
  body('password')
    .notEmpty()
    .withMessage('请输入密码')
    .isLength({ max: 128 })
    .withMessage('密码过长'),
  
  body('captchaId')
    .notEmpty()
    .withMessage('验证码ID不能为空'),
  
  body('captchaCode')
    .notEmpty()
    .withMessage('验证码不能为空'),
]

export const validateChangePassword: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('请输入当前密码'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('新密码长度必须在8-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含大小写字母和数字')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('新密码不能与当前密码相同'),
]

export const validateFileId: ValidationChain[] = [
  param('id')
    .isInt({ min: 1, max: Number.MAX_SAFE_INTEGER })
    .withMessage('无效的文件ID'),
]

export const validateFolderId: ValidationChain[] = [
  param('id')
    .isInt({ min: 1, max: Number.MAX_SAFE_INTEGER })
    .withMessage('无效的文件夹ID'),
]

export const validateRename: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('名称长度必须在1-255个字符之间')
    .not().matches(/\.\./)
    .withMessage('名称不能包含连续的点')
    .not().matches(/[<>:"/\\|?*\x00-\x1f]/)
    .withMessage('名称包含非法字符'),
]

export const validateMove: ValidationChain[] = [
  body('folderId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('无效的目标文件夹ID'),
]

export const validatePagination: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('页码无效'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量无效'),
]

export const validateSearch: ValidationChain[] = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('搜索关键词过长')
    .not().matches(/[<>{}[\]\\\/]/)
    .withMessage('搜索关键词包含非法字符'),
]

export const validateBatchOperation: ValidationChain[] = [
  body('fileIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('文件ID列表无效（最多100个）'),
  
  body('fileIds.*')
    .isInt({ min: 1 })
    .withMessage('文件ID无效'),
  
  body('folderIds')
    .optional()
    .isArray({ max: 100 })
    .withMessage('文件夹ID列表无效'),
  
  body('folderIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('文件夹ID无效'),
]

export const validateTag: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('标签名称长度必须在1-30个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5\s]+$/)
    .withMessage('标签名称只能包含字母、数字、下划线、空格和中文'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('颜色格式无效'),
]

export const validateShare: ValidationChain[] = [
  body('fileId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('文件ID无效'),
  
  body('folderId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('文件夹ID无效'),
  
  body('expireHours')
    .optional()
    .isInt({ min: 1, max: 720 })
    .withMessage('过期时间无效（1-720小时）'),
  
  body('password')
    .optional()
    .isLength({ min: 4, max: 20 })
    .withMessage('分享密码长度必须在4-20个字符之间'),
]

export const checkValidation = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg)
    res.status(400).json({
      success: false,
      message: errorMessages[0],
      errors: errors.array(),
      code: 'VALIDATION_ERROR',
    })
    return
  }
  
  next()
}

export const validatePasswordStrength = (password: string): { 
  valid: boolean
  score: number
  feedback: string[]
} => {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 2

  if (password.length < 8) feedback.push('密码长度至少8个字符')
  if (!/[a-z]/.test(password)) feedback.push('建议包含小写字母')
  if (!/[A-Z]/.test(password)) feedback.push('建议包含大写字母')
  if (!/\d/.test(password)) feedback.push('建议包含数字')
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) feedback.push('建议包含特殊字符')

  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', 'master', 'dragon', 'letmein', 'login',
    'admin', 'welcome', 'password1', 'qwerty123',
  ]
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    score -= 2
    feedback.push('密码包含常见密码模式')
  }

  if (/(.)\1{2,}/.test(password)) {
    score -= 1
    feedback.push('密码包含重复字符')
  }

  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 1
    feedback.push('密码只包含字母')
  }

  return {
    valid: score >= 4 && password.length >= 8,
    score: Math.max(0, Math.min(10, score)),
    feedback,
  }
}

export default {
  sanitizeInput,
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateFileId,
  validateFolderId,
  validateRename,
  validateMove,
  validatePagination,
  validateSearch,
  validateBatchOperation,
  validateTag,
  validateShare,
  checkValidation,
  validatePasswordStrength,
}

/**
 * 认证路由
 * 处理用户认证相关的路由
 */

import { Router } from 'express'
import { body } from 'express-validator'
import {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
} from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { generateCaptcha } from '../controllers/captchaController'

const router = Router()

// 注册验证规则
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少为6个字符'),
  body('captchaId').notEmpty().withMessage('验证码ID不能为空'),
  body('captchaCode').notEmpty().withMessage('验证码不能为空'),
]

// 登录验证规则
const loginValidation = [
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
  body('captchaId').notEmpty().withMessage('验证码ID不能为空'),
  body('captchaCode').notEmpty().withMessage('验证码不能为空'),
]

// 修改密码验证规则
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少为6个字符'),
]

// 路由定义
router.post('/register', registerValidation, register)
router.post('/login', loginValidation, login)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getCurrentUser)
router.put('/password', authenticate, changePasswordValidation, changePassword)
router.put('/profile', authenticate, updateProfile)

// 验证码路由
router.get('/captcha', generateCaptcha)

export default router

/**
 * 认证相关API
 */

import api from './axios'

// 用户接口
export interface User {
  id: number
  username: string
  email: string
  role: string
  avatar?: string
  storageUsed: number
  storageLimit: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 登录请求
export interface LoginRequest {
  username: string
  password: string
  captchaId: string
  captchaCode: string
}

// 注册请求
export interface RegisterRequest {
  username: string
  email: string
  password: string
  captchaId: string
  captchaCode: string
}

// 登录响应
export interface LoginResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
  }
}

// 登录
export const login = (data: LoginRequest): Promise<LoginResponse> => {
  return api.post('/auth/login', data)
}

// 注册
export const register = (data: RegisterRequest): Promise<LoginResponse> => {
  return api.post('/auth/register', data)
}

// 登出
export const logout = (): Promise<{ success: boolean; message: string }> => {
  return api.post('/auth/logout')
}

// 获取当前用户
export const getCurrentUser = (): Promise<{ success: boolean; data: User }> => {
  return api.get('/auth/me')
}

// 修改密码
export const changePassword = (data: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean; message: string }> => {
  return api.put('/auth/password', data)
}

// 更新用户信息
export const updateProfile = (data: {
  username?: string
  email?: string
  avatar?: string
}): Promise<{ success: boolean; data: User }> => {
  return api.put('/auth/profile', data)
}

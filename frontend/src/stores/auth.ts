/**
 * 认证状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/auth'
import * as authApi from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string>(localStorage.getItem('token') || '')
  const loading = ref(false)
  const error = ref<string>('')

  // Getters
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'SUPER_ADMIN')

  // Actions
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const clearAuth = () => {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  const login = async (data: { username: string; password: string; captchaId: string; captchaCode: string }) => {
    loading.value = true
    error.value = ''
    try {
      const response = await authApi.login(data)
      if (response.success) {
        user.value = response.data.user
        setToken(response.data.token)
        return true
      }
      return false
    } catch (err: any) {
      error.value = err.message || '登录失败'
      return false
    } finally {
      loading.value = false
    }
  }

  const register = async (data: { username: string; email: string; password: string; captchaId: string; captchaCode: string }) => {
    loading.value = true
    error.value = ''
    try {
      const response = await authApi.register(data)
      if (response.success) {
        user.value = response.data.user
        setToken(response.data.token)
        return true
      }
      return false
    } catch (err: any) {
      error.value = err.message || '注册失败'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
    }
  }

  const fetchUser = async () => {
    if (!token.value) return false
    try {
      const response = await authApi.getCurrentUser()
      if (response.success) {
        user.value = response.data
        return true
      }
      return false
    } catch (err) {
      clearAuth()
      return false
    }
  }

  const updateProfile = async (data: { username?: string; email?: string; avatar?: string }) => {
    try {
      const response = await authApi.updateProfile(data)
      if (response.success) {
        user.value = response.data
        return true
      }
      return false
    } catch (err: any) {
      error.value = err.message || '更新失败'
      return false
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await authApi.changePassword({ currentPassword, newPassword })
      return response.success
    } catch (err: any) {
      error.value = err.message || '修改密码失败'
      return false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    fetchUser,
    updateProfile,
    changePassword,
    clearAuth,
  }
})

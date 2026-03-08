/**
 * Axios配置
 * 设置基础URL和拦截器
 */

import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 600000, // 10分钟超时，支持大文件上传
  headers: {
    'Content-Type': 'application/json',
  },
  // 允许大文件上传
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 对于文件上传，不设置超时限制
    if (config.url?.includes('/upload')) {
      config.timeout = 0 // 无超时限制
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      // 处理401未授权
      if (error.response.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      return Promise.reject(error.response.data)
    }
    return Promise.reject(error)
  }
)

export default api

/**
 * 分享相关API
 */

import api from './axios'

export interface Share {
  id: string
  file: {
    id: number
    name: string
    size: number
    sizeFormatted: string
    mimeType: string
    extension: string
    icon: string
    isPreviewable: boolean
  }
  hasPassword: boolean
  isExpired: boolean
  expireAt: string | null
  maxDownloads: number | null
  downloadCount: number
  isActive: boolean
  createdAt: string
  url: string
}

export interface TrashItem {
  id: number
  type: 'file' | 'folder'
  name: string
  size?: number
  sizeFormatted?: string
  icon?: string
  isPreviewable?: boolean
  deletedAt: string
}

/**
 * 获取分享列表
 */
export const getShares = () => {
  return api.get('/shares')
}

/**
 * 创建分享
 */
export const createShare = (
  fileId: number,
  options: {
    password?: string
    expireDays?: number
    maxDownloads?: number
  }
) => {
  return api.post('/shares', {
    fileId,
    ...options,
  })
}

/**
 * 取消分享
 */
export const cancelShare = (shareId: string) => {
  return api.delete(`/shares/${shareId}`)
}

/**
 * 获取分享信息(公开)
 */
export const getShareInfo = (shareId: string) => {
  return api.get(`/shares/${shareId}`)
}

/**
 * 验证分享密码
 */
export const verifySharePassword = (shareId: string, password: string) => {
  return api.post(`/shares/${shareId}/verify`, { password })
}

/**
 * 下载分享的文件
 */
export const downloadSharedFile = (shareId: string) => {
  return api.get(`/shares/${shareId}/download`, {
    responseType: 'blob',
  })
}

/**
 * 预览分享的文件
 */
export const previewSharedFile = (shareId: string) => {
  return api.get(`/shares/${shareId}/preview`, {
    responseType: 'blob',
  })
}

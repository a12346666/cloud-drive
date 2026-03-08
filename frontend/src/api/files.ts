/**
 * 文件相关API
 */

import api from './axios'

// 文件接口
export interface FileItem {
  id: number
  name: string
  size: number
  sizeFormatted: string
  mimeType: string
  extension?: string
  icon: string
  isPreviewable: boolean
  isEncrypted?: boolean
  isStarred?: boolean
  starredAt?: string
  folderId?: number
  createdAt: string
  updatedAt?: string
}

// 存储统计
export interface StorageStats {
  used: number
  usedFormatted: string
  limit: number
  limitFormatted: string
  percentage: number
  remaining: number
  remainingFormatted: string
  typeStats: {
    mimeType: string
    count: number
    size: number
    sizeFormatted: string
  }[]
}

// 分页响应
export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    files: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

// 获取文件列表
export const getFiles = (params?: {
  folderId?: number
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<FileItem>> => {
  return api.get('/files', { params })
}

// 上传文件
export const uploadFile = (
  file: File,
  folderId?: number,
  encrypt?: boolean,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; data: FileItem }> => {
  const formData = new FormData()
  formData.append('file', file)
  if (folderId) {
    formData.append('folderId', folderId.toString())
  }
  if (encrypt) {
    formData.append('encrypt', 'true')
  }

  return api.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    },
  })
}

// 批量上传文件
export const uploadMultipleFiles = (
  files: File[],
  folderId?: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; data: FileItem[] }> => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  if (folderId) {
    formData.append('folderId', folderId.toString())
  }

  return api.post('/files/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    },
  })
}

// 下载文件
export const downloadFile = (fileId: number): string => {
  return `/api/files/${fileId}/download`
}

// 预览文件
export const previewFile = (fileId: number): string => {
  return `/api/files/${fileId}/preview`
}

// 删除文件
export const deleteFile = (fileId: number): Promise<{ success: boolean; message: string }> => {
  return api.delete(`/files/${fileId}`)
}

// 重命名文件
export const renameFile = (
  fileId: number,
  name: string
): Promise<{ success: boolean; data: { id: number; name: string } }> => {
  return api.put(`/files/${fileId}/rename`, { name })
}

// 移动文件
export const moveFile = (
  fileId: number,
  folderId?: number
): Promise<{ success: boolean; data: { id: number; folderId?: number } }> => {
  return api.put(`/files/${fileId}/move`, { folderId })
}

// 获取存储统计
export const getStorageStats = (): Promise<{ success: boolean; data: StorageStats }> => {
  return api.get('/files/stats')
}

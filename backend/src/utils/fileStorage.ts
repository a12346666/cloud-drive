/**
 * 文件存储工具
 * 处理文件路径生成和存储逻辑
 */

import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// 上传目录配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

/**
 * 获取用户存储目录（用于临时文件或用户专属文件）
 * @param userId - 用户ID
 * @returns 用户存储目录路径
 */
export const getUserStorageDir = (userId: number): string => {
  return path.join(UPLOAD_DIR, 'users', userId.toString())
}

/**
 * 获取共享存储目录（用于去重文件存储）
 * 所有物理文件统一存储在此目录，不区分用户
 * @returns 共享存储目录路径
 */
export const getSharedStorageDir = (): string => {
  return path.join(UPLOAD_DIR, 'shared')
}

/**
 * 确保目录存在
 * @param dirPath - 目录路径
 */
export const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 生成唯一的文件名
 * @param originalName - 原始文件名
 * @returns 唯一文件名
 */
export const generateUniqueFileName = (originalName: string): string => {
  const ext = path.extname(originalName)
  const uuid = uuidv4()
  return `${uuid}${ext}`
}

/**
 * 获取文件扩展名
 * @param filename - 文件名
 * @returns 扩展名(不含点)
 */
export const getFileExtension = (filename: string): string => {
  return path.extname(filename).slice(1).toLowerCase()
}

/**
 * 格式化文件大小
 * @param bytes - 字节数 (支持 number 和 bigint)
 * @returns 格式化后的字符串
 */
export const formatFileSize = (bytes: number | bigint): string => {
  // 将 bigint 转换为 number
  const numBytes = typeof bytes === 'bigint' ? Number(bytes) : bytes
  
  // 处理无效值
  if (numBytes === null || numBytes === undefined || isNaN(numBytes) || numBytes < 0) {
    return '0 B'
  }
  
  if (numBytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(numBytes) / Math.log(k))
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 删除文件
 * @param filePath - 文件路径
 * @returns 是否删除成功
 */
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  } catch (error) {
    console.error('删除文件失败:', error)
    return false
  }
}

/**
 * 获取文件类型图标
 * @param mimeType - MIME类型
 * @param extension - 文件扩展名
 * @returns 图标名称
 */
export const getFileIcon = (mimeType: string, extension: string): string => {
  // 图片
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  // 视频
  if (mimeType.startsWith('video/')) {
    return 'video'
  }
  // 音频
  if (mimeType.startsWith('audio/')) {
    return 'audio'
  }
  // 文档类型
  const docTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt']
  if (docTypes.includes(extension.toLowerCase())) {
    return 'document'
  }
  // 表格类型
  const sheetTypes = ['xls', 'xlsx', 'csv', 'ods']
  if (sheetTypes.includes(extension.toLowerCase())) {
    return 'spreadsheet'
  }
  // 演示文稿
  const presentationTypes = ['ppt', 'pptx', 'odp']
  if (presentationTypes.includes(extension.toLowerCase())) {
    return 'presentation'
  }
  // 压缩文件
  const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz']
  if (archiveTypes.includes(extension.toLowerCase())) {
    return 'archive'
  }
  // 代码文件
  const codeTypes = ['js', 'ts', 'html', 'css', 'py', 'java', 'cpp', 'c', 'go', 'rs']
  if (codeTypes.includes(extension.toLowerCase())) {
    return 'code'
  }
  
  return 'file'
}

/**
 * 检查文件是否可预览
 * @param mimeType - MIME类型
 * @returns 是否可预览
 */
export const isPreviewable = (mimeType: string): boolean => {
  // 图片可预览
  if (mimeType.startsWith('image/')) return true
  // PDF可预览
  if (mimeType === 'application/pdf') return true
  // 文本文件可预览
  if (mimeType.startsWith('text/')) return true
  // 视频可预览
  if (mimeType.startsWith('video/')) return true
  // 音频可预览
  if (mimeType.startsWith('audio/')) return true
  
  return false
}

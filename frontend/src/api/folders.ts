/**
 * 文件夹相关API
 */

import api from './axios'

// 文件夹接口
export interface Folder {
  id: number
  name: string
  parentId?: number
  fileCount: number
  folderCount: number
  size: number
  sizeFormatted: string
  isStarred?: boolean
  starredAt?: string
  createdAt: string
  updatedAt: string
}

// 文件夹树节点
export interface FolderTreeNode {
  id: number
  name: string
  children: FolderTreeNode[]
}

// 文件夹路径
export interface FolderPath {
  id: number | null
  name: string
}

// 文件夹内容
export interface FolderContents {
  folders: {
    id: number
    name: string
    type: 'folder'
    fileCount: number
    folderCount: number
    createdAt: string
    updatedAt: string
  }[]
  files: {
    id: number
    name: string
    type: 'file'
    size: number
    sizeFormatted: string
    mimeType: string
    extension?: string
    createdAt: string
    updatedAt: string
  }[]
}

// 创建文件夹
export const createFolder = (data: {
  name: string
  parentId?: number
}): Promise<{ success: boolean; data: Folder }> => {
  return api.post('/folders', data)
}

// 获取文件夹列表
export const getFolders = (params?: {
  parentId?: number
}): Promise<{ success: boolean; data: Folder[] }> => {
  return api.get('/folders', { params })
}

// 获取文件夹树
export const getFolderTree = (): Promise<{ success: boolean; data: FolderTreeNode[] }> => {
  return api.get('/folders/tree')
}

// 获取文件夹路径
export const getFolderPath = (folderId: number | 'root'): Promise<{ success: boolean; data: FolderPath[] }> => {
  return api.get(`/folders/${folderId}/path`)
}

// 获取文件夹内容
export const getFolderContents = (
  folderId: number | 'root'
): Promise<{ success: boolean; data: FolderContents }> => {
  return api.get(`/folders/${folderId}/contents`)
}

// 重命名文件夹
export const renameFolder = (
  folderId: number,
  name: string
): Promise<{ success: boolean; data: { id: number; name: string } }> => {
  return api.put(`/folders/${folderId}/rename`, { name })
}

// 移动文件夹
export const moveFolder = (
  folderId: number,
  parentId?: number
): Promise<{ success: boolean; data: { id: number; parentId?: number } }> => {
  return api.put(`/folders/${folderId}/move`, { parentId })
}

// 删除文件夹
export const deleteFolder = (folderId: number): Promise<{ success: boolean; message: string }> => {
  return api.delete(`/folders/${folderId}`)
}

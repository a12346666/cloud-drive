/**
 * 回收站相关API
 */

import api from './axios'

/**
 * 获取回收站内容
 */
export const getTrashItems = () => {
  return api.get('/trash')
}

/**
 * 恢复文件
 */
export const restoreFile = (fileId: number) => {
  return api.post(`/trash/files/${fileId}/restore`)
}

/**
 * 恢复文件夹
 */
export const restoreFolder = (folderId: number) => {
  return api.post(`/trash/folders/${folderId}/restore`)
}

/**
 * 永久删除文件
 */
export const permanentDeleteFile = (fileId: number) => {
  return api.delete(`/trash/files/${fileId}`)
}

/**
 * 永久删除文件夹
 */
export const permanentDeleteFolder = (folderId: number) => {
  return api.delete(`/trash/folders/${folderId}`)
}

/**
 * 清空回收站
 */
export const emptyTrash = () => {
  return api.delete('/trash/empty')
}

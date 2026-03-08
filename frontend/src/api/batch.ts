import axios from './axios'

export interface Tag {
  id: number
  name: string
  color: string
  fileCount?: number
  createdAt: string
}

export interface StarredItem {
  id: number
  name: string
  type: 'file' | 'folder'
  size?: number
  sizeFormatted?: string
  mimeType?: string
  extension?: string
  icon?: string
  isPreviewable?: boolean
  isEncrypted?: boolean
  isStarred: boolean
  starredAt: string
  tags?: Tag[]
  fileCount?: number
  folderCount?: number
  folderId?: number
  parentId?: number
  createdAt: string
}

export interface SearchResult {
  files: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const createTag = async (name: string, color?: string) => {
  const response = await axios.post('/api/tags', { name, color })
  return response.data
}

export const getTags = async () => {
  const response = await axios.get('/api/tags')
  return response.data
}

export const updateTag = async (id: number, data: { name?: string; color?: string }) => {
  const response = await axios.put(`/api/tags/${id}`, data)
  return response.data
}

export const deleteTag = async (id: number) => {
  const response = await axios.delete(`/api/tags/${id}`)
  return response.data
}

export const addTagToFile = async (fileId: number, tagId: number) => {
  const response = await axios.post('/api/tags/file', { fileId, tagId })
  return response.data
}

export const removeTagFromFile = async (fileId: number, tagId: number) => {
  const response = await axios.delete(`/api/tags/file/${fileId}/${tagId}`)
  return response.data
}

export const getFilesByTag = async (tagId: number, page = 1, limit = 50) => {
  const response = await axios.get(`/api/tags/${tagId}/files`, {
    params: { page, limit },
  })
  return response.data
}

export const toggleFileStar = async (fileId: number) => {
  const response = await axios.post(`/api/batch/star/file/${fileId}`)
  return response.data
}

export const toggleFolderStar = async (folderId: number) => {
  const response = await axios.post(`/api/batch/star/folder/${folderId}`)
  return response.data
}

export const getStarredItems = async (page = 1, limit = 50) => {
  const response = await axios.get('/api/batch/starred', {
    params: { page, limit },
  })
  return response.data
}

export const batchDelete = async (fileIds: number[]) => {
  const response = await axios.post('/api/batch/delete', { fileIds })
  return response.data
}

export const batchMove = async (data: { fileIds?: number[]; folderIds?: number[]; targetFolderId?: number | null }) => {
  const response = await axios.post('/api/batch/move', data)
  return response.data
}

export const batchDownload = async (data: { fileIds?: number[]; folderIds?: number[] }) => {
  const response = await axios.post('/api/batch/download', data, {
    responseType: 'blob',
  })
  return response
}

export const batchStar = async (data: { fileIds?: number[]; folderIds?: number[]; starred: boolean }) => {
  const response = await axios.post('/api/batch/star', data)
  return response.data
}

export const batchAddTags = async (fileIds: number[], tagIds: number[]) => {
  const response = await axios.post('/api/batch/tags', { fileIds, tagIds })
  return response.data
}

export const searchFiles = async (params: {
  keyword?: string
  mimeType?: string
  minSize?: string
  maxSize?: string
  startDate?: string
  endDate?: string
  isStarred?: boolean
  tagId?: number
  sortBy?: string
  sortOrder?: string
  page?: number
  limit?: number
}) => {
  const response = await axios.get('/api/batch/search', { params })
  return response.data
}

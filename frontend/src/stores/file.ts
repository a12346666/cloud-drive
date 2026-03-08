/**
 * 文件状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FileItem, StorageStats } from '@/api/files'
import type { Folder, FolderPath, FolderContents } from '@/api/folders'
import type { Share, TrashItem } from '@/api/shares'
import type { Tag, StarredItem } from '@/api/batch'
import * as filesApi from '@/api/files'
import * as foldersApi from '@/api/folders'
import * as sharesApi from '@/api/shares'
import * as trashApi from '@/api/trash'
import * as batchApi from '@/api/batch'

export const useFileStore = defineStore('file', () => {
  // State
  const files = ref<FileItem[]>([])
  const folders = ref<Folder[]>([])
  const currentFolderId = ref<number | null>(null)
  const folderPath = ref<FolderPath[]>([{ id: null, name: '根目录' }])
  const storageStats = ref<StorageStats | null>(null)
  const loading = ref(false)
  const uploadProgress = ref<number>(0)
  const error = ref<string>('')
  const shares = ref<Share[]>([])
  const trashItems = ref<TrashItem[]>([])
  const enableEncryption = ref(false)
  const tags = ref<Tag[]>([])
  const starredItems = ref<StarredItem[]>([])
  const selectedItems = ref<{ type: 'file' | 'folder'; id: number }[]>([])
  const sortBy = ref<string>('createdAt')
  const sortOrder = ref<string>('desc')
  const searchKeyword = ref<string>('')

  // Getters
  const currentFolder = computed(() => {
    return folders.value.find((f) => f.id === currentFolderId.value)
  })

  const allItems = computed(() => {
    return [...folders.value, ...files.value]
  })

  // Actions
  const setError = (msg: string) => {
    error.value = msg
    setTimeout(() => {
      error.value = ''
    }, 3000)
  }

  const fetchFiles = async (params?: { folderId?: number; search?: string }) => {
    loading.value = true
    try {
      const response = await filesApi.getFiles(params)
      if (response.success) {
        files.value = response.data.files
      }
    } catch (err: any) {
      setError(err.message || '获取文件失败')
    } finally {
      loading.value = false
    }
  }

  const fetchFolders = async (parentId?: number) => {
    try {
      const response = await foldersApi.getFolders({ parentId })
      if (response.success) {
        folders.value = response.data
      }
    } catch (err: any) {
      setError(err.message || '获取文件夹失败')
    }
  }

  const fetchFolderContents = async (folderId: number | 'root') => {
    loading.value = true
    try {
      const response = await foldersApi.getFolderContents(folderId)
      if (response.success) {
        folders.value = response.data.folders.map((f) => ({
          ...f,
          parentId: folderId === 'root' ? null : folderId,
          size: 0,
          sizeFormatted: '0 B',
        }))
        files.value = response.data.files.map((f) => ({
          ...f,
          icon: getFileIcon(f.mimeType, f.extension || ''),
          isPreviewable: isPreviewable(f.mimeType) && !f.isEncrypted,
        }))
      }
    } catch (err: any) {
      setError(err.message || '获取内容失败')
    } finally {
      loading.value = false
    }
  }

  const fetchFolderPath = async (folderId: number | 'root') => {
    try {
      const response = await foldersApi.getFolderPath(folderId)
      if (response.success) {
        folderPath.value = response.data
      }
    } catch (err: any) {
      console.error('获取路径失败:', err)
    }
  }

  const fetchStorageStats = async () => {
    try {
      const response = await filesApi.getStorageStats()
      console.log('获取存储统计响应:', response)
      if (response.success) {
        storageStats.value = response.data
        console.log('存储统计已更新:', storageStats.value)
      } else {
        console.warn('获取存储统计失败:', response)
      }
    } catch (err: any) {
      console.error('获取存储统计失败:', err)
    }
  }

  const navigateToFolder = async (folderId: number | null) => {
    currentFolderId.value = folderId
    const folderIdParam = folderId ?? 'root'
    await Promise.all([
      fetchFolderContents(folderIdParam),
      fetchFolderPath(folderIdParam),
    ])
  }

  const uploadFile = async (file: File, onProgress?: (progress: number) => void) => {
    try {
      uploadProgress.value = 0
      const response = await filesApi.uploadFile(
        file, 
        currentFolderId.value || undefined, 
        enableEncryption.value,
        (progress) => {
          uploadProgress.value = progress
          onProgress?.(progress)
        }
      )
      if (response.success) {
        files.value.unshift(response.data)
        console.log('文件上传成功，准备更新存储统计')
        await fetchStorageStats()
        console.log('存储统计更新完成')
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '上传失败')
      return false
    } finally {
      uploadProgress.value = 0
    }
  }

  const createFolder = async (name: string) => {
    try {
      const response = await foldersApi.createFolder({
        name,
        parentId: currentFolderId.value || undefined,
      })
      if (response.success) {
        folders.value.unshift(response.data)
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '创建文件夹失败')
      return false
    }
  }

  const deleteFile = async (fileId: number) => {
    try {
      const response = await filesApi.deleteFile(fileId)
      if (response.success) {
        files.value = files.value.filter((f) => f.id !== fileId)
        await fetchStorageStats()
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '删除失败')
      return false
    }
  }

  const deleteFolder = async (folderId: number) => {
    try {
      const response = await foldersApi.deleteFolder(folderId)
      if (response.success) {
        folders.value = folders.value.filter((f) => f.id !== folderId)
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '删除失败')
      return false
    }
  }

  const renameFile = async (fileId: number, name: string) => {
    try {
      const response = await filesApi.renameFile(fileId, name)
      if (response.success) {
        const file = files.value.find((f) => f.id === fileId)
        if (file) {
          file.name = name
        }
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '重命名失败')
      return false
    }
  }

  const renameFolder = async (folderId: number, name: string) => {
    try {
      const response = await foldersApi.renameFolder(folderId, name)
      if (response.success) {
        const folder = folders.value.find((f) => f.id === folderId)
        if (folder) {
          folder.name = name
        }
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '重命名失败')
      return false
    }
  }

  // 分享相关
  const fetchShares = async () => {
    try {
      const response = await sharesApi.getShares()
      if (response.success) {
        shares.value = response.data.shares
      }
    } catch (err: any) {
      setError(err.message || '获取分享列表失败')
    }
  }

  const createShare = async (fileId: number, options: {
    password?: string
    expireDays?: number
    maxDownloads?: number
  }) => {
    try {
      const response = await sharesApi.createShare(fileId, options)
      if (response.success) {
        shares.value.unshift(response.data)
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '创建分享失败')
      return null
    }
  }

  const cancelShare = async (shareId: string) => {
    try {
      const response = await sharesApi.cancelShare(shareId)
      if (response.success) {
        shares.value = shares.value.filter((s) => s.id !== shareId)
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '取消分享失败')
      return false
    }
  }

  // 回收站相关
  const fetchTrashItems = async () => {
    loading.value = true
    try {
      const response = await trashApi.getTrashItems()
      if (response.success) {
        trashItems.value = response.data.items
      }
    } catch (err: any) {
      setError(err.message || '获取回收站内容失败')
    } finally {
      loading.value = false
    }
  }

  const restoreFile = async (fileId: number) => {
    try {
      const response = await trashApi.restoreFile(fileId)
      if (response.success) {
        trashItems.value = trashItems.value.filter((item) => !(item.type === 'file' && item.id === fileId))
        await fetchStorageStats()
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '恢复文件失败')
      return false
    }
  }

  const restoreFolder = async (folderId: number) => {
    try {
      const response = await trashApi.restoreFolder(folderId)
      if (response.success) {
        trashItems.value = trashItems.value.filter((item) => !(item.type === 'folder' && item.id === folderId))
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '恢复文件夹失败')
      return false
    }
  }

  const permanentDeleteFile = async (fileId: number) => {
    try {
      const response = await trashApi.permanentDeleteFile(fileId)
      if (response.success) {
        trashItems.value = trashItems.value.filter((item) => !(item.type === 'file' && item.id === fileId))
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '永久删除失败')
      return false
    }
  }

  const permanentDeleteFolder = async (folderId: number) => {
    try {
      const response = await trashApi.permanentDeleteFolder(folderId)
      if (response.success) {
        trashItems.value = trashItems.value.filter((item) => !(item.type === 'folder' && item.id === folderId))
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '永久删除失败')
      return false
    }
  }

  const emptyTrash = async () => {
    try {
      const response = await trashApi.emptyTrash()
      if (response.success) {
        trashItems.value = []
        await fetchStorageStats()
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '清空回收站失败')
      return false
    }
  }

  // 辅助函数
  const getFileIcon = (mimeType: string, extension: string): string => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf') return 'document'
    if (['xls', 'xlsx', 'csv'].includes(extension)) return 'spreadsheet'
    if (['ppt', 'pptx'].includes(extension)) return 'presentation'
    if (['zip', 'rar', '7z'].includes(extension)) return 'archive'
    if (['js', 'ts', 'html', 'css', 'py', 'java'].includes(extension)) return 'code'
    return 'file'
  }

  const isPreviewable = (mimeType: string): boolean => {
    if (mimeType.startsWith('image/')) return true
    if (mimeType === 'application/pdf') return true
    if (mimeType.startsWith('text/')) return true
    if (mimeType.startsWith('video/')) return true
    if (mimeType.startsWith('audio/')) return true
    return false
  }

  // 标签相关
  const fetchTags = async () => {
    try {
      const response = await batchApi.getTags()
      if (response.success) {
        tags.value = response.data
      }
    } catch (err: any) {
      console.error('获取标签失败:', err)
    }
  }

  const createTag = async (name: string, color?: string) => {
    try {
      const response = await batchApi.createTag(name, color)
      if (response.success) {
        tags.value.push(response.data)
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '创建标签失败')
      return null
    }
  }

  const deleteTag = async (id: number) => {
    try {
      const response = await batchApi.deleteTag(id)
      if (response.success) {
        tags.value = tags.value.filter((t) => t.id !== id)
        return true
      }
      return false
    } catch (err: any) {
      setError(err.message || '删除标签失败')
      return false
    }
  }

  const addTagToFile = async (fileId: number, tagId: number) => {
    try {
      const response = await batchApi.addTagToFile(fileId, tagId)
      return response.success
    } catch (err: any) {
      setError(err.message || '添加标签失败')
      return false
    }
  }

  // 收藏相关
  const toggleFileStar = async (fileId: number) => {
    try {
      const response = await batchApi.toggleFileStar(fileId)
      if (response.success) {
        const file = files.value.find((f) => f.id === fileId)
        if (file) {
          file.isStarred = response.data.isStarred
        }
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '操作失败')
      return null
    }
  }

  const toggleFolderStar = async (folderId: number) => {
    try {
      const response = await batchApi.toggleFolderStar(folderId)
      if (response.success) {
        const folder = folders.value.find((f) => f.id === folderId)
        if (folder) {
          folder.isStarred = response.data.isStarred
        }
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '操作失败')
      return null
    }
  }

  const fetchStarredItems = async () => {
    loading.value = true
    try {
      const response = await batchApi.getStarredItems()
      if (response.success) {
        starredItems.value = response.data.items
      }
    } catch (err: any) {
      setError(err.message || '获取收藏列表失败')
    } finally {
      loading.value = false
    }
  }

  // 批量操作
  const batchDelete = async (fileIds: number[], folderIds?: number[]) => {
    try {
      const response = await batchApi.batchDelete(fileIds)
      if (response.success) {
        files.value = files.value.filter((f) => !fileIds.includes(f.id))
        if (folderIds?.length) {
          folders.value = folders.value.filter((f) => !folderIds.includes(f.id))
        }
        await fetchStorageStats()
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '批量删除失败')
      return null
    }
  }

  const batchMove = async (fileIds: number[], folderIds: number[], targetFolderId: number | null) => {
    try {
      const response = await batchApi.batchMove({ fileIds, folderIds, targetFolderId })
      if (response.success) {
        files.value = files.value.filter((f) => !fileIds.includes(f.id))
        folders.value = folders.value.filter((f) => !folderIds.includes(f.id))
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '批量移动失败')
      return null
    }
  }

  const batchStar = async (fileIds: number[], folderIds: number[], starred: boolean) => {
    try {
      const response = await batchApi.batchStar({ fileIds, folderIds, starred })
      if (response.success) {
        fileIds.forEach((id) => {
          const file = files.value.find((f) => f.id === id)
          if (file) file.isStarred = starred
        })
        folderIds.forEach((id) => {
          const folder = folders.value.find((f) => f.id === id)
          if (folder) folder.isStarred = starred
        })
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '操作失败')
      return null
    }
  }

  // 搜索
  const searchFiles = async (params: any) => {
    loading.value = true
    try {
      const response = await batchApi.searchFiles(params)
      if (response.success) {
        return response.data
      }
      return null
    } catch (err: any) {
      setError(err.message || '搜索失败')
      return null
    } finally {
      loading.value = false
    }
  }

  // 选择相关
  const toggleSelection = (type: 'file' | 'folder', id: number) => {
    const index = selectedItems.value.findIndex((item) => item.type === type && item.id === id)
    if (index === -1) {
      selectedItems.value.push({ type, id })
    } else {
      selectedItems.value.splice(index, 1)
    }
  }

  const clearSelection = () => {
    selectedItems.value = []
  }

  const isSelected = (type: 'file' | 'folder', id: number) => {
    return selectedItems.value.some((item) => item.type === type && item.id === id)
  }

  const selectAll = () => {
    selectedItems.value = [
      ...folders.value.map((f) => ({ type: 'folder' as const, id: f.id })),
      ...files.value.map((f) => ({ type: 'file' as const, id: f.id })),
    ]
  }

  return {
    files,
    folders,
    currentFolderId,
    folderPath,
    storageStats,
    loading,
    uploadProgress,
    error,
    shares,
    trashItems,
    enableEncryption,
    tags,
    starredItems,
    selectedItems,
    sortBy,
    sortOrder,
    searchKeyword,
    currentFolder,
    allItems,
    fetchFiles,
    fetchFolders,
    fetchFolderContents,
    fetchFolderPath,
    fetchStorageStats,
    navigateToFolder,
    uploadFile,
    createFolder,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    fetchShares,
    createShare,
    cancelShare,
    fetchTrashItems,
    restoreFile,
    restoreFolder,
    permanentDeleteFile,
    permanentDeleteFolder,
    emptyTrash,
    setError,
    fetchTags,
    createTag,
    deleteTag,
    addTagToFile,
    toggleFileStar,
    toggleFolderStar,
    fetchStarredItems,
    batchDelete,
    batchMove,
    batchStar,
    searchFiles,
    toggleSelection,
    clearSelection,
    isSelected,
    selectAll,
  }
})

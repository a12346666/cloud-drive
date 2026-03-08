/**
 * 回收站控制器
 * 处理文件和文件夹的恢复、永久删除等操作
 */

import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import { logOperation, OperationAction, TargetType } from '../utils/logger'
import { formatFileSize, getFileIcon, isPreviewable, deleteFile } from '../utils/fileStorage'

/**
 * 获取回收站内容
 * GET /api/trash
 */
export const getTrashItems = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // 获取已删除的文件
    const [files, fileTotal] = await Promise.all([
      prisma.file.findMany({
        where: {
          userId: req.user.id,
          isDeleted: true,
        },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.file.count({
        where: {
          userId: req.user.id,
          isDeleted: true,
        },
      }),
    ])

    // 获取已删除的文件夹
    const [folders, folderTotal] = await Promise.all([
      prisma.folder.findMany({
        where: {
          userId: req.user.id,
          isDeleted: true,
        },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.folder.count({
        where: {
          userId: req.user.id,
          isDeleted: true,
        },
      }),
    ])

    // 格式化文件数据
    const formattedFiles = files.map((file) => ({
      id: file.id,
      type: 'file' as const,
      name: file.originalName,
      size: Number(file.size),
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      icon: getFileIcon(file.mimeType, file.extension || ''),
      isPreviewable: isPreviewable(file.mimeType),
      deletedAt: file.deletedAt,
    }))

    // 格式化文件夹数据
    const formattedFolders = folders.map((folder) => ({
      id: folder.id,
      type: 'folder' as const,
      name: folder.name,
      deletedAt: folder.deletedAt,
    }))

    // 合并并按删除时间排序
    const allItems = [...formattedFiles, ...formattedFolders].sort(
      (a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
    )

    successResponse(
      res,
      {
        items: allItems.slice(0, limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: fileTotal + folderTotal,
          totalPages: Math.ceil((fileTotal + folderTotal) / limitNum),
        },
      },
      '获取回收站内容成功'
    )
  } catch (error) {
    console.error('获取回收站内容错误:', error)
    errorResponse(res, '获取回收站内容失败', 500)
  }
}

/**
 * 恢复文件
 * POST /api/trash/files/:id/restore
 */
export const restoreFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: true,
      },
    })

    if (!file) {
      errorResponse(res, '文件不存在或不在回收站中', 404)
      return
    }

    // 恢复文件记录
    await prisma.file.update({
      where: { id: parseInt(id) },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.RESTORE,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: { fileName: file.originalName },
      req,
    })

    successResponse(res, null, '文件已恢复')
  } catch (error) {
    console.error('恢复文件错误:', error)
    errorResponse(res, '恢复文件失败', 500)
  }
}

/**
 * 恢复文件夹
 * POST /api/trash/folders/:id/restore
 */
export const restoreFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: true,
      },
    })

    if (!folder) {
      errorResponse(res, '文件夹不存在或不在回收站中', 404)
      return
    }

    // 递归恢复文件夹及其内容
    await restoreFolderRecursive(parseInt(id), req.user.id)

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.RESTORE,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      details: { folderName: folder.name },
      req,
    })

    successResponse(res, null, '文件夹已恢复')
  } catch (error) {
    console.error('恢复文件夹错误:', error)
    errorResponse(res, '恢复文件夹失败', 500)
  }
}

/**
 * 递归恢复文件夹及其内容
 */
const restoreFolderRecursive = async (folderId: number, userId: number): Promise<void> => {
  // 恢复当前文件夹
  await prisma.folder.update({
    where: { id: folderId },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    },
  })

  // 恢复文件夹内的文件
  await prisma.file.updateMany({
    where: {
      folderId,
      userId,
      isDeleted: true,
    },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    },
  })

  // 递归恢复子文件夹
  const subFolders = await prisma.folder.findMany({
    where: {
      parentId: folderId,
      userId,
      isDeleted: true,
    },
  })

  for (const subFolder of subFolders) {
    await restoreFolderRecursive(subFolder.id, userId)
  }
}

/**
 * 永久删除文件
 * DELETE /api/trash/files/:id
 */
export const permanentDeleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: true,
      },
    })

    if (!file) {
      errorResponse(res, '文件不存在或不在回收站中', 404)
      return
    }

    // 删除物理文件
    if (fs.existsSync(file.path)) {
      deleteFile(file.path)
    }

    // 删除数据库记录
    await prisma.file.delete({
      where: { id: parseInt(id) },
    })

    // 更新用户存储空间
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        storageUsed: {
          decrement: file.size,
        },
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.PERMANENT_DELETE,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: { fileName: file.originalName, size: Number(file.size) },
      req,
    })

    successResponse(res, null, '文件已永久删除')
  } catch (error) {
    console.error('永久删除文件错误:', error)
    errorResponse(res, '删除文件失败', 500)
  }
}

/**
 * 永久删除文件夹
 * DELETE /api/trash/folders/:id
 */
export const permanentDeleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const folder = await prisma.folder.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        isDeleted: true,
      },
    })

    if (!folder) {
      errorResponse(res, '文件夹不存在或不在回收站中', 404)
      return
    }

    // 递归删除文件夹及其内容
    const deletedSize = await permanentDeleteFolderRecursive(parseInt(id), req.user.id)

    // 更新用户存储空间
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        storageUsed: {
          decrement: deletedSize,
        },
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.PERMANENT_DELETE,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      details: { folderName: folder.name, deletedSize: Number(deletedSize) },
      req,
    })

    successResponse(res, null, '文件夹已永久删除')
  } catch (error) {
    console.error('永久删除文件夹错误:', error)
    errorResponse(res, '删除文件夹失败', 500)
  }
}

/**
 * 递归永久删除文件夹及其内容
 * 返回删除的总文件大小
 */
const permanentDeleteFolderRecursive = async (
  folderId: number,
  userId: number
): Promise<bigint> => {
  let totalSize = BigInt(0)

  // 获取文件夹内的所有文件并删除
  const files = await prisma.file.findMany({
    where: {
      folderId,
      userId,
      isDeleted: true,
    },
  })

  for (const file of files) {
    // 删除物理文件
    if (fs.existsSync(file.path)) {
      deleteFile(file.path)
    }
    totalSize += file.size

    // 删除数据库记录
    await prisma.file.delete({
      where: { id: file.id },
    })
  }

  // 递归删除子文件夹
  const subFolders = await prisma.folder.findMany({
    where: {
      parentId: folderId,
      userId,
      isDeleted: true,
    },
  })

  for (const subFolder of subFolders) {
    const subSize = await permanentDeleteFolderRecursive(subFolder.id, userId)
    totalSize += subSize
  }

  // 删除当前文件夹
  await prisma.folder.delete({
    where: { id: folderId },
  })

  return totalSize
}

/**
 * 清空回收站
 * DELETE /api/trash/empty
 */
export const emptyTrash = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    // 获取所有已删除的文件
    const files = await prisma.file.findMany({
      where: {
        userId: req.user.id,
        isDeleted: true,
      },
    })

    // 删除物理文件和数据库记录
    let totalSize = BigInt(0)
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        deleteFile(file.path)
      }
      totalSize += file.size
      await prisma.file.delete({
        where: { id: file.id },
      })
    }

    // 递归删除所有已删除的文件夹
    const rootFolders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        isDeleted: true,
        parentId: null,
      },
    })

    for (const folder of rootFolders) {
      const folderSize = await permanentDeleteFolderRecursive(folder.id, req.user.id)
      totalSize += folderSize
    }

    // 更新用户存储空间
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        storageUsed: {
          decrement: totalSize,
        },
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.PERMANENT_DELETE,
      targetType: TargetType.SYSTEM,
      details: { action: 'EMPTY_TRASH', deletedFiles: files.length, deletedSize: Number(totalSize) },
      req,
    })

    successResponse(res, null, '回收站已清空')
  } catch (error) {
    console.error('清空回收站错误:', error)
    errorResponse(res, '清空回收站失败', 500)
  }
}

/**
 * 自动清理回收站(删除超过30天的项目)
 * 定时任务调用
 */
export const autoCleanupTrash = async (): Promise<{ files: number; folders: number }> => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 删除超过30天的文件
  const oldFiles = await prisma.file.findMany({
    where: {
      isDeleted: true,
      deletedAt: {
        lt: thirtyDaysAgo,
      },
    },
  })

  for (const file of oldFiles) {
    if (fs.existsSync(file.path)) {
      deleteFile(file.path)
    }
    await prisma.file.delete({
      where: { id: file.id },
    })

    // 更新用户存储空间
    await prisma.user.update({
      where: { id: file.userId },
      data: {
        storageUsed: {
          decrement: file.size,
        },
      },
    })
  }

  // 删除超过30天的文件夹
  const oldFolders = await prisma.folder.findMany({
    where: {
      isDeleted: true,
      deletedAt: {
        lt: thirtyDaysAgo,
      },
    },
  })

  for (const folder of oldFolders) {
    await permanentDeleteFolderRecursive(folder.id, folder.userId)
  }

  return {
    files: oldFiles.length,
    folders: oldFolders.length,
  }
}

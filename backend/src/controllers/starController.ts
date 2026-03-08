import { Request, Response } from 'express'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import { formatFileSize, getFileIcon, isPreviewable } from '../utils/fileStorage'
import { logOperation, OperationAction, TargetType } from '../utils/logger'

export const toggleFileStar = async (req: Request, res: Response): Promise<void> => {
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
        isDeleted: false,
      },
    })

    if (!file) {
      errorResponse(res, '文件不存在', 404)
      return
    }

    const updatedFile = await prisma.file.update({
      where: { id: parseInt(id) },
      data: {
        isStarred: !file.isStarred,
        starredAt: !file.isStarred ? new Date() : null,
      },
    })

    await logOperation({
      userId: req.user.id,
      action: updatedFile.isStarred ? OperationAction.STAR : OperationAction.UNSTAR,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: { fileName: file.originalName },
      req,
    })

    successResponse(
      res,
      {
        id: updatedFile.id,
        isStarred: updatedFile.isStarred,
        starredAt: updatedFile.starredAt,
      },
      updatedFile.isStarred ? '已添加到收藏' : '已取消收藏'
    )
  } catch (error) {
    console.error('切换文件收藏状态错误:', error)
    errorResponse(res, '操作失败', 500)
  }
}

export const toggleFolderStar = async (req: Request, res: Response): Promise<void> => {
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
        isDeleted: false,
      },
    })

    if (!folder) {
      errorResponse(res, '文件夹不存在', 404)
      return
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: parseInt(id) },
      data: {
        isStarred: !folder.isStarred,
        starredAt: !folder.isStarred ? new Date() : null,
      },
    })

    await logOperation({
      userId: req.user.id,
      action: updatedFolder.isStarred ? OperationAction.STAR : OperationAction.UNSTAR,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      details: { folderName: folder.name },
      req,
    })

    successResponse(
      res,
      {
        id: updatedFolder.id,
        isStarred: updatedFolder.isStarred,
        starredAt: updatedFolder.starredAt,
      },
      updatedFolder.isStarred ? '已添加到收藏' : '已取消收藏'
    )
  } catch (error) {
    console.error('切换文件夹收藏状态错误:', error)
    errorResponse(res, '操作失败', 500)
  }
}

export const getStarredItems = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [files, folders, totalFiles, totalFolders] = await Promise.all([
      prisma.file.findMany({
        where: {
          userId: req.user.id,
          isDeleted: false,
          isStarred: true,
        },
        orderBy: { starredAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
      prisma.folder.findMany({
        where: {
          userId: req.user.id,
          isDeleted: false,
          isStarred: true,
        },
        orderBy: { starredAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          _count: {
            select: {
              files: { where: { isDeleted: false } },
              children: { where: { isDeleted: false } },
            },
          },
        },
      }),
      prisma.file.count({
        where: {
          userId: req.user.id,
          isDeleted: false,
          isStarred: true,
        },
      }),
      prisma.folder.count({
        where: {
          userId: req.user.id,
          isDeleted: false,
          isStarred: true,
        },
      }),
    ])

    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.originalName,
      type: 'file' as const,
      size: Number(file.size),
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      icon: getFileIcon(file.mimeType, file.extension || ''),
      isPreviewable: isPreviewable(file.mimeType) && !file.isEncrypted,
      isEncrypted: file.isEncrypted,
      isStarred: file.isStarred,
      starredAt: file.starredAt,
      tags: file.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      folderId: file.folderId,
      createdAt: file.createdAt,
    }))

    const formattedFolders = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: 'folder' as const,
      fileCount: folder._count.files,
      folderCount: folder._count.children,
      isStarred: folder.isStarred,
      starredAt: folder.starredAt,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
    }))

    const allItems = [...formattedFolders, ...formattedFiles].sort(
      (a, b) => new Date(b.starredAt!).getTime() - new Date(a.starredAt!).getTime()
    )

    successResponse(
      res,
      {
        items: allItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalFiles + totalFolders,
          totalPages: Math.ceil((totalFiles + totalFolders) / limitNum),
        },
        stats: {
          files: totalFiles,
          folders: totalFolders,
        },
      },
      '获取收藏列表成功'
    )
  } catch (error) {
    console.error('获取收藏列表错误:', error)
    errorResponse(res, '获取收藏列表失败', 500)
  }
}

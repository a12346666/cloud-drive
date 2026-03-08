import { Request, Response } from 'express'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import { formatFileSize, getFileIcon, isPreviewable } from '../utils/fileStorage'
import { logOperation, OperationAction, TargetType } from '../utils/logger'
import { deleteFileWithDeduplication } from '../services/deduplicationService'
import archiver from 'archiver'
import path from 'path'
import fs from 'fs'

export const batchDeleteFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileIds } = req.body

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      errorResponse(res, '请选择要删除的文件', 400)
      return
    }

    const results = {
      success: [] as number[],
      failed: [] as { id: number; reason: string }[],
    }

    for (const fileId of fileIds) {
      try {
        const success = await deleteFileWithDeduplication(fileId, req.user.id, req)
        if (success) {
          results.success.push(fileId)
        } else {
          results.failed.push({ id: fileId, reason: '文件不存在' })
        }
      } catch (error) {
        results.failed.push({ id: fileId, reason: '删除失败' })
      }
    }

    await logOperation({
      userId: req.user.id,
      action: OperationAction.DELETE,
      targetType: TargetType.FILE,
      details: {
        action: 'batch_delete',
        successCount: results.success.length,
        failedCount: results.failed.length,
      },
      req,
    })

    successResponse(res, results, `成功删除 ${results.success.length} 个文件`)
  } catch (error) {
    console.error('批量删除文件错误:', error)
    errorResponse(res, '批量删除失败', 500)
  }
}

export const batchMoveFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileIds, folderIds, targetFolderId } = req.body

    if ((!Array.isArray(fileIds) || fileIds.length === 0) && (!Array.isArray(folderIds) || folderIds.length === 0)) {
      errorResponse(res, '请选择要移动的项目', 400)
      return
    }

    if (targetFolderId) {
      const targetFolder = await prisma.folder.findFirst({
        where: {
          id: targetFolderId,
          userId: req.user.id,
          isDeleted: false,
        },
      })

      if (!targetFolder) {
        errorResponse(res, '目标文件夹不存在', 404)
        return
      }
    }

    const results = {
      files: { success: 0, failed: 0 },
      folders: { success: 0, failed: 0 },
    }

    if (Array.isArray(fileIds)) {
      for (const fileId of fileIds) {
        try {
          await prisma.file.update({
            where: {
              id: fileId,
              userId: req.user.id,
              isDeleted: false,
            },
            data: {
              folderId: targetFolderId || null,
            },
          })
          results.files.success++
        } catch (error) {
          results.files.failed++
        }
      }
    }

    if (Array.isArray(folderIds)) {
      for (const folderId of folderIds) {
        try {
          if (targetFolderId === folderId) {
            results.folders.failed++
            continue
          }

          await prisma.folder.update({
            where: {
              id: folderId,
              userId: req.user.id,
              isDeleted: false,
            },
            data: {
              parentId: targetFolderId || null,
            },
          })
          results.folders.success++
        } catch (error) {
          results.folders.failed++
        }
      }
    }

    await logOperation({
      userId: req.user.id,
      action: OperationAction.MOVE,
      targetType: TargetType.FILE,
      details: {
        action: 'batch_move',
        targetFolderId,
        filesSuccess: results.files.success,
        foldersSuccess: results.folders.success,
      },
      req,
    })

    successResponse(res, results, '批量移动完成')
  } catch (error) {
    console.error('批量移动错误:', error)
    errorResponse(res, '批量移动失败', 500)
  }
}

export const batchDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileIds, folderIds } = req.body

    if ((!Array.isArray(fileIds) || fileIds.length === 0) && (!Array.isArray(folderIds) || folderIds.length === 0)) {
      errorResponse(res, '请选择要下载的项目', 400)
      return
    }

    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds || [] },
        userId: req.user.id,
        isDeleted: false,
      },
    })

    const folders = await prisma.folder.findMany({
      where: {
        id: { in: folderIds || [] },
        userId: req.user.id,
        isDeleted: false,
      },
    })

    const allFiles: { path: string; name: string; size: number }[] = []

    for (const file of files) {
      if (fs.existsSync(file.path)) {
        allFiles.push({
          path: file.path,
          name: file.originalName,
          size: Number(file.size),
        })
      }
    }

    const collectFolderFiles = async (folderId: number, basePath: string) => {
      const folderFiles = await prisma.file.findMany({
        where: {
          folderId,
          userId: req.user!.id,
          isDeleted: false,
        },
      })

      for (const file of folderFiles) {
        if (fs.existsSync(file.path)) {
          allFiles.push({
            path: file.path,
            name: path.join(basePath, file.originalName),
            size: Number(file.size),
          })
        }
      }

      const subFolders = await prisma.folder.findMany({
        where: {
          parentId: folderId,
          userId: req.user!.id,
          isDeleted: false,
        },
      })

      for (const subFolder of subFolders) {
        await collectFolderFiles(subFolder.id, path.join(basePath, subFolder.name))
      }
    }

    for (const folder of folders) {
      await collectFolderFiles(folder.id, folder.name)
    }

    if (allFiles.length === 0) {
      errorResponse(res, '没有可下载的文件', 400)
      return
    }

    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0)

    await logOperation({
      userId: req.user.id,
      action: OperationAction.DOWNLOAD,
      targetType: TargetType.FILE,
      details: {
        action: 'batch_download',
        fileCount: allFiles.length,
        totalSize,
      },
      req,
    })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="download_${Date.now()}.zip"`)

    const archive = archiver('zip', {
      zlib: { level: 6 },
    })

    archive.pipe(res)

    for (const file of allFiles) {
      archive.file(file.path, { name: file.name })
    }

    archive.finalize()
  } catch (error) {
    console.error('批量下载错误:', error)
    errorResponse(res, '批量下载失败', 500)
  }
}

export const batchStar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileIds, folderIds, starred } = req.body

    if ((!Array.isArray(fileIds) || fileIds.length === 0) && (!Array.isArray(folderIds) || folderIds.length === 0)) {
      errorResponse(res, '请选择要操作的项目', 400)
      return
    }

    const results = {
      files: { success: 0, failed: 0 },
      folders: { success: 0, failed: 0 },
    }

    const starData = {
      isStarred: starred,
      starredAt: starred ? new Date() : null,
    }

    if (Array.isArray(fileIds) && fileIds.length > 0) {
      const result = await prisma.file.updateMany({
        where: {
          id: { in: fileIds },
          userId: req.user.id,
          isDeleted: false,
        },
        data: starData,
      })
      results.files.success = result.count
      results.files.failed = fileIds.length - result.count
    }

    if (Array.isArray(folderIds) && folderIds.length > 0) {
      const result = await prisma.folder.updateMany({
        where: {
          id: { in: folderIds },
          userId: req.user.id,
          isDeleted: false,
        },
        data: starData,
      })
      results.folders.success = result.count
      results.folders.failed = folderIds.length - result.count
    }

    await logOperation({
      userId: req.user.id,
      action: starred ? OperationAction.STAR : OperationAction.UNSTAR,
      targetType: TargetType.FILE,
      details: {
        action: 'batch_star',
        starred,
        filesSuccess: results.files.success,
        foldersSuccess: results.folders.success,
      },
      req,
    })

    successResponse(res, results, starred ? '已添加到收藏' : '已取消收藏')
  } catch (error) {
    console.error('批量收藏错误:', error)
    errorResponse(res, '操作失败', 500)
  }
}

export const batchAddTags = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileIds, tagIds } = req.body

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      errorResponse(res, '请选择要操作的文件', 400)
      return
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      errorResponse(res, '请选择标签', 400)
      return
    }

    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: req.user.id,
        isDeleted: false,
      },
      select: { id: true },
    })

    const validFileIds = files.map((f) => f.id)

    const tags = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        userId: req.user.id,
      },
      select: { id: true },
    })

    const validTagIds = tags.map((t) => t.id)

    let addedCount = 0

    for (const fileId of validFileIds) {
      for (const tagId of validTagIds) {
        try {
          await prisma.fileTag.create({
            data: { fileId, tagId },
          })
          addedCount++
        } catch (error) {
          // 忽略重复标签错误
        }
      }
    }

    await logOperation({
      userId: req.user.id,
      action: OperationAction.UPDATE,
      targetType: TargetType.FILE,
      details: {
        action: 'batch_add_tags',
        fileCount: validFileIds.length,
        tagCount: validTagIds.length,
        addedCount,
      },
      req,
    })

    successResponse(res, { addedCount }, '标签添加完成')
  } catch (error) {
    console.error('批量添加标签错误:', error)
    errorResponse(res, '操作失败', 500)
  }
}

export const searchFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const {
      keyword,
      mimeType,
      minSize,
      maxSize,
      startDate,
      endDate,
      isStarred,
      tagId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {
      userId: req.user.id,
      isDeleted: false,
    }

    if (keyword) {
      where.OR = [
        { originalName: { contains: keyword as string, mode: 'insensitive' } },
        { description: { contains: keyword as string, mode: 'insensitive' } },
      ]
    }

    if (mimeType) {
      where.mimeType = { contains: mimeType as string }
    }

    if (minSize || maxSize) {
      where.size = {}
      if (minSize) where.size.gte = BigInt(minSize as string)
      if (maxSize) where.size.lte = BigInt(maxSize as string)
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }

    if (isStarred !== undefined) {
      where.isStarred = isStarred === 'true'
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId: parseInt(tagId as string),
        },
      }
    }

    const orderBy: any = {}
    orderBy[sortBy as string] = sortOrder

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy,
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
      prisma.file.count({ where }),
    ])

    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.originalName,
      size: Number(file.size),
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      icon: getFileIcon(file.mimeType, file.extension || ''),
      isPreviewable: isPreviewable(file.mimeType) && !file.isEncrypted,
      isEncrypted: file.isEncrypted,
      isStarred: file.isStarred,
      description: file.description,
      tags: file.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      folderId: file.folderId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }))

    successResponse(
      res,
      {
        files: formattedFiles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      '搜索完成'
    )
  } catch (error) {
    console.error('搜索文件错误:', error)
    errorResponse(res, '搜索失败', 500)
  }
}

/**
 * 文件控制器
 * 处理文件上传、下载、删除、文件夹管理等操作
 */

import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import {
  getUserStorageDir,
  formatFileSize,
  getFileIcon,
  isPreviewable,
  deleteFile,
  ensureDir,
} from '../utils/fileStorage'
import { encryptFile, decryptFile } from '../utils/encryption'
import { calculateFileHash } from '../utils/streamFile'
import { logOperation, OperationAction, TargetType } from '../utils/logger'
import { createDeduplicatedFile, deleteFileWithDeduplication } from '../services/deduplicationService'
import { fileListCache, storageCache } from '../utils/cache'

/**
 * 上传文件
 * POST /api/files/upload
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    if (!req.file) {
      errorResponse(res, '未选择文件', 400)
      return
    }

    const { folderId, encrypt } = req.body
    const file = req.file
    const shouldEncrypt = encrypt === 'true' || encrypt === true

    // 检查用户存储空间
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    // 检查是否超出存储限制 (将 bigint 转换为 number 进行比较)
    const storageUsed = Number(user.storageUsed)
    const storageLimit = Number(user.storageLimit)
    if (storageUsed + file.size > storageLimit) {
      errorResponse(res, '存储空间不足', 400)
      return
    }

    // 如果指定了文件夹，验证文件夹是否存在且属于当前用户
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: parseInt(folderId),
          userId: req.user.id,
          isDeleted: false,
        },
      })
      if (!folder) {
        errorResponse(res, '文件夹不存在', 404)
        return
      }
    }

    let filePath = file.path
    let fileSize = file.size
    let iv: string | null = null
    let authTag: string | null = null

    // 计算文件哈希（用于去重）
    const contentHash = await calculateFileHash(file.path)

    // 如果启用加密
    if (shouldEncrypt) {
      const encryptedPath = `${file.path}.encrypted`
      const encryptionResult = await encryptFile(file.path, encryptedPath)
      iv = encryptionResult.iv
      authTag = encryptionResult.authTag

      // 获取加密后的文件大小
      const encryptedStats = fs.statSync(encryptedPath)
      fileSize = encryptedStats.size

      // 删除原始文件
      fs.unlinkSync(file.path)
      filePath = encryptedPath
    }

    // 使用去重服务创建文件记录
    const result = await createDeduplicatedFile({
      name: path.basename(filePath),
      originalName: file.originalname,
      path: filePath,
      size: BigInt(fileSize),
      mimeType: file.mimetype,
      extension: path.extname(file.originalname).slice(1).toLowerCase(),
      userId: req.user.id,
      folderId: folderId ? parseInt(folderId) : null,
      contentHash,
      isEncrypted: shouldEncrypt,
      encryptionKey: shouldEncrypt ? authTag : null,
      iv: iv,
      req,
    })

    if (!result.isDuplicate) {
      console.log(`[上传] 更新用户 ${req.user.id} 的存储空间，增加: ${fileSize} 字节`)
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          storageUsed: {
            increment: BigInt(fileSize),
          },
        },
      })
      fileListCache.del(req.user.id)
      storageCache.del(req.user.id)
    } else {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      console.log(`[上传] 文件去重成功，节省空间: ${result.savedSpace} 字节`)
    }

    const fileRecord = result.file

    successResponse(
      res,
      {
        id: fileRecord.id,
        name: fileRecord.originalName,
        size: Number(fileRecord.size),
        sizeFormatted: formatFileSize(fileRecord.size),
        mimeType: fileRecord.mimeType,
        extension: fileRecord.extension,
        icon: getFileIcon(fileRecord.mimeType, fileRecord.extension || ''),
        isPreviewable: isPreviewable(fileRecord.mimeType) && !shouldEncrypt && !result.isDuplicate,
        isEncrypted: shouldEncrypt && !result.isDuplicate,
        isDuplicate: result.isDuplicate,
        savedSpace: result.savedSpace,
        folderId: fileRecord.folderId,
        createdAt: fileRecord.createdAt,
      },
      result.isDuplicate ? '文件秒传成功' : '文件上传成功',
      result.isDuplicate ? 200 : 201
    )
  } catch (error) {
    console.error('上传文件错误:', error)
    errorResponse(res, '文件上传失败', 500)
  }
}

/**
 * 批量上传文件
 * POST /api/files/upload-multiple
 */
export const uploadMultipleFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      errorResponse(res, '未选择文件', 400)
      return
    }

    const { folderId, encrypt } = req.body
    const files = req.files as Express.Multer.File[]
    const shouldEncrypt = encrypt === 'true' || encrypt === true

    // 检查用户存储空间
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    // 计算总文件大小(估算加密后大小)
    const estimatedTotalSize = files.reduce((sum, file) => sum + file.size * 1.1, 0)

    // 检查是否超出存储限制 (将 bigint 转换为 number 进行比较)
    const storageUsed = Number(user.storageUsed)
    const storageLimit = Number(user.storageLimit)
    if (storageUsed + estimatedTotalSize > storageLimit) {
      errorResponse(res, '存储空间不足', 400)
      return
    }

    // 如果指定了文件夹，验证文件夹是否存在
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: parseInt(folderId),
          userId: req.user.id,
          isDeleted: false,
        },
      })
      if (!folder) {
        errorResponse(res, '文件夹不存在', 404)
        return
      }
    }

    // 批量处理文件
    const fileRecords = await Promise.all(
      files.map(async (file) => {
        let filePath = file.path
        let fileSize = file.size
        let iv: string | null = null
        let authTag: string | null = null

        // 如果启用加密
        if (shouldEncrypt) {
          const encryptedPath = `${file.path}.encrypted`
          const encryptionResult = await encryptFile(file.path, encryptedPath)
          iv = encryptionResult.iv
          authTag = encryptionResult.authTag

          // 获取加密后的文件大小
          const encryptedStats = fs.statSync(encryptedPath)
          fileSize = encryptedStats.size

          // 删除原始文件
          fs.unlinkSync(file.path)
          filePath = encryptedPath
        }

        return prisma.file.create({
          data: {
            name: path.basename(filePath),
            originalName: file.originalname,
            path: filePath,
            size: BigInt(fileSize),
            mimeType: file.mimetype,
            extension: path.extname(file.originalname).slice(1).toLowerCase(),
            userId: req.user!.id,
            folderId: folderId ? parseInt(folderId) : null,
            isEncrypted: shouldEncrypt,
            encryptionKey: shouldEncrypt ? authTag : null,
            iv: iv,
          },
        })
      })
    )

    // 计算实际总大小
    const totalSize = fileRecords.reduce((sum, file) => sum + Number(file.size), 0)

    // 更新用户已用存储空间
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        storageUsed: {
          increment: BigInt(totalSize),
        },
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.UPLOAD,
      targetType: TargetType.FILE,
      details: {
        fileCount: files.length,
        totalSize,
        isEncrypted: shouldEncrypt,
      },
      req,
    })

    const responseFiles = fileRecords.map((file) => ({
      id: file.id,
      name: file.originalName,
      size: Number(file.size),
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      icon: getFileIcon(file.mimeType, file.extension || ''),
      isPreviewable: isPreviewable(file.mimeType) && !shouldEncrypt,
      isEncrypted: shouldEncrypt,
      folderId: file.folderId,
      createdAt: file.createdAt,
    }))

    successResponse(res, responseFiles, '文件上传成功', 201)
  } catch (error) {
    console.error('批量上传文件错误:', error)
    errorResponse(res, '文件上传失败', 500)
  }
}

/**
 * 获取文件列表
 * GET /api/files
 */
export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { folderId, search, page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    if (!search) {
      const cached = fileListCache.get(req.user.id, folderId ? parseInt(folderId as string) : null, pageNum)
      if (cached) {
        successResponse(res, cached, '获取文件列表成功(缓存)')
        return
      }
    }

    const where: any = {
      userId: req.user.id,
      isDeleted: false,
    }

    if (folderId) {
      where.folderId = parseInt(folderId as string)
    } else {
      where.folderId = null
    }

    if (search) {
      where.originalName = {
        contains: search as string,
        mode: 'insensitive',
      }
    }

    const total = await prisma.file.count({ where })

    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    })

    const responseFiles = files.map((file) => ({
      id: file.id,
      name: file.originalName,
      size: Number(file.size),
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      icon: getFileIcon(file.mimeType, file.extension || ''),
      isPreviewable: isPreviewable(file.mimeType) && !file.isEncrypted,
      isEncrypted: file.isEncrypted,
      folderId: file.folderId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }))

    const responseData = {
      files: responseFiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }

    if (!search) {
      fileListCache.set(req.user.id, folderId ? parseInt(folderId as string) : null, pageNum, responseData)
    }

    successResponse(res, responseData, '获取文件列表成功')
  } catch (error) {
    console.error('获取文件列表错误:', error)
    errorResponse(res, '获取文件列表失败', 500)
  }
}

/**
 * 下载文件
 * GET /api/files/:id/download
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
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

    // 检查文件是否存在
    if (!fs.existsSync(file.path)) {
      errorResponse(res, '文件不存在或已被删除', 404)
      return
    }

    // 记录下载日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.DOWNLOAD,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: {
        fileName: file.originalName,
        isEncrypted: file.isEncrypted,
      },
      req,
    })

    // 如果文件已加密，需要解密后发送
    if (file.isEncrypted && file.iv && file.encryptionKey) {
      // 创建临时解密文件
      const tempDir = os.tmpdir()
      const tempFileName = `decrypted_${Date.now()}_${file.originalName}`
      const tempPath = path.join(tempDir, tempFileName)

      try {
        // 从数据库获取authTag（存储在encryptionKey字段中）
        const authTag = file.encryptionKey

        await decryptFile(file.path, tempPath, file.iv, authTag)

        // 设置下载头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`)
        res.setHeader('Content-Type', file.mimeType)

        // 发送解密后的文件
        res.sendFile(path.resolve(tempPath), (err) => {
          // 删除临时文件
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath)
          }
        })
        return
      } catch (decryptError) {
        console.error('文件解密错误:', decryptError)
        errorResponse(res, '文件解密失败', 500)
        return
      }
    }

    // 设置下载头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`)
    res.setHeader('Content-Type', file.mimeType)

    // 发送文件
    res.sendFile(path.resolve(file.path))
  } catch (error) {
    console.error('下载文件错误:', error)
    errorResponse(res, '下载文件失败', 500)
  }
}

/**
 * 预览文件
 * GET /api/files/:id/preview
 */
export const previewFile = async (req: Request, res: Response): Promise<void> => {
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

    // 检查文件是否存在
    if (!fs.existsSync(file.path)) {
      errorResponse(res, '文件不存在或已被删除', 404)
      return
    }

    // 加密文件不支持预览
    if (file.isEncrypted) {
      errorResponse(res, '加密文件不支持预览，请先下载', 400)
      return
    }

    // 检查文件是否可预览
    if (!isPreviewable(file.mimeType)) {
      errorResponse(res, '该文件类型不支持预览', 400)
      return
    }

    // 记录预览日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.PREVIEW,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: { fileName: file.originalName },
      req,
    })

    // 设置预览头
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Content-Disposition', 'inline')

    // 发送文件
    res.sendFile(path.resolve(file.path))
  } catch (error) {
    console.error('预览文件错误:', error)
    errorResponse(res, '预览文件失败', 500)
  }
}

/**
 * 删除文件
 * DELETE /api/files/:id
 */
export const deleteFileById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const success = await deleteFileWithDeduplication(parseInt(id), req.user.id, req)

    if (!success) {
      errorResponse(res, '文件不存在', 404)
      return
    }

    fileListCache.del(req.user.id)
    storageCache.del(req.user.id)

    successResponse(res, null, '文件已移至回收站')
  } catch (error) {
    console.error('删除文件错误:', error)
    errorResponse(res, '删除文件失败', 500)
  }
}

/**
 * 重命名文件
 * PUT /api/files/:id/rename
 */
export const renameFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params
    const { name } = req.body

    if (!name || name.trim() === '') {
      errorResponse(res, '文件名不能为空', 400)
      return
    }

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

    // 更新文件名
    const updatedFile = await prisma.file.update({
      where: { id: parseInt(id) },
      data: {
        originalName: name.trim(),
      },
    })

    // 记录重命名日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.RENAME,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: { oldName: file.originalName, newName: name.trim() },
      req,
    })

    successResponse(
      res,
      {
        id: updatedFile.id,
        name: updatedFile.originalName,
      },
      '文件重命名成功'
    )
  } catch (error) {
    console.error('重命名文件错误:', error)
    errorResponse(res, '重命名文件失败', 500)
  }
}

/**
 * 移动文件
 * PUT /api/files/:id/move
 */
export const moveFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params
    const { folderId } = req.body

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

    // 如果指定了目标文件夹，验证文件夹是否存在
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: parseInt(folderId),
          userId: req.user.id,
          isDeleted: false,
        },
      })
      if (!folder) {
        errorResponse(res, '目标文件夹不存在', 404)
        return
      }
    }

    // 更新文件所属文件夹
    const updatedFile = await prisma.file.update({
      where: { id: parseInt(id) },
      data: {
        folderId: folderId ? parseInt(folderId) : null,
      },
    })

    // 记录移动日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.MOVE,
      targetType: TargetType.FILE,
      targetId: file.id,
      details: { fileName: file.originalName, newFolderId: folderId },
      req,
    })

    successResponse(
      res,
      {
        id: updatedFile.id,
        folderId: updatedFile.folderId,
      },
      '文件移动成功'
    )
  } catch (error) {
    console.error('移动文件错误:', error)
    errorResponse(res, '移动文件失败', 500)
  }
}

/**
 * 获取存储统计
 * GET /api/files/stats
 */
export const getStorageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const cached = storageCache.get(req.user.id)
    if (cached) {
      successResponse(res, cached, '获取存储统计成功(缓存)')
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        storageUsed: true,
        storageLimit: true,
      },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    const fileStats = await prisma.file.groupBy({
      by: ['mimeType'],
      where: {
        userId: req.user.id,
        isDeleted: false,
      },
      _count: {
        id: true,
      },
      _sum: {
        size: true,
      },
    })

    const storageUsed = Number(user.storageUsed) || 0
    const storageLimit = Number(user.storageLimit) || 10737418240

    const typeStats = fileStats.map((stat) => ({
      mimeType: stat.mimeType,
      count: stat._count.id,
      size: Number(stat._sum.size || 0),
      sizeFormatted: formatFileSize(stat._sum.size || 0),
    }))

    const percentage = storageLimit > 0 
      ? Math.max(0, Math.round((storageUsed / storageLimit) * 100))
      : 0

    const responseData = {
      used: storageUsed,
      usedFormatted: formatFileSize(user.storageUsed),
      limit: storageLimit,
      limitFormatted: formatFileSize(user.storageLimit),
      percentage: percentage,
      remaining: Math.max(0, storageLimit - storageUsed),
      remainingFormatted: formatFileSize(BigInt(Math.max(0, storageLimit - storageUsed))),
      typeStats,
    }

    storageCache.set(req.user.id, responseData)

    successResponse(res, responseData, '获取存储统计成功')
  } catch (error) {
    console.error('获取存储统计错误:', error)
    errorResponse(res, '获取存储统计失败', 500)
  }
}

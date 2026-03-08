/**
 * 分享控制器
 * 处理文件分享相关操作
 */

import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../utils/db'
import { successResponse, errorResponse } from '../utils/response'
import { logOperation, OperationAction, TargetType } from '../utils/logger'
import { formatFileSize, getFileIcon, isPreviewable } from '../utils/fileStorage'
import { decryptFile } from '../utils/encryption'
import os from 'os'
import path from 'path'
import fs from 'fs'

/**
 * 创建分享
 * POST /api/shares
 */
export const createShare = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileId, password, expireDays, maxDownloads } = req.body

    if (!fileId) {
      errorResponse(res, '请选择要分享的文件', 400)
      return
    }

    // 验证文件是否存在且属于当前用户
    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(fileId),
        userId: req.user.id,
        isDeleted: false,
      },
    })

    if (!file) {
      errorResponse(res, '文件不存在', 404)
      return
    }

    // 计算过期时间
    let expireAt = null
    if (expireDays && expireDays > 0) {
      expireAt = new Date()
      expireAt.setDate(expireAt.getDate() + parseInt(expireDays))
    }

    // 处理密码
    let hashedPassword = null
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password.trim(), 10)
    }

    // 创建分享记录
    const share = await prisma.share.create({
      data: {
        fileId: parseInt(fileId),
        userId: req.user.id,
        password: hashedPassword,
        expireAt,
        maxDownloads: maxDownloads ? parseInt(maxDownloads) : null,
      },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.SHARE,
      targetType: TargetType.SHARE,
      targetId: share.id,
      details: { fileId, expireDays, maxDownloads },
      req,
    })

    successResponse(
      res,
      {
        id: share.id,
        url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${share.id}`,
        hasPassword: !!hashedPassword,
        expireAt: share.expireAt,
        maxDownloads: share.maxDownloads,
        createdAt: share.createdAt,
      },
      '分享创建成功',
      201
    )
  } catch (error) {
    console.error('创建分享错误:', error)
    errorResponse(res, '创建分享失败', 500)
  }
}

/**
 * 获取用户的分享列表
 * GET /api/shares
 */
export const getUserShares = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { page = '1', limit = '20' } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [shares, total] = await Promise.all([
      prisma.share.findMany({
        where: {
          userId: req.user.id,
          isActive: true,
        },
        include: {
          file: {
            select: {
              id: true,
              originalName: true,
              size: true,
              mimeType: true,
              extension: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.share.count({
        where: {
          userId: req.user.id,
          isActive: true,
        },
      }),
    ])

    // 检查分享是否过期
    const now = new Date()
    const formattedShares = shares.map((share) => ({
      id: share.id,
      file: {
        ...share.file,
        size: Number(share.file.size),
        sizeFormatted: formatFileSize(share.file.size),
        icon: getFileIcon(share.file.mimeType, share.file.extension || ''),
        isPreviewable: isPreviewable(share.file.mimeType),
      },
      hasPassword: !!share.password,
      isExpired: share.expireAt ? share.expireAt < now : false,
      expireAt: share.expireAt,
      maxDownloads: share.maxDownloads,
      downloadCount: share.downloadCount,
      isActive: share.isActive,
      createdAt: share.createdAt,
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${share.id}`,
    }))

    successResponse(
      res,
      {
        shares: formattedShares,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      '获取分享列表成功'
    )
  } catch (error) {
    console.error('获取分享列表错误:', error)
    errorResponse(res, '获取分享列表失败', 500)
  }
}

/**
 * 取消分享
 * DELETE /api/shares/:id
 */
export const cancelShare = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { id } = req.params

    const share = await prisma.share.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    })

    if (!share) {
      errorResponse(res, '分享不存在', 404)
      return
    }

    await prisma.share.update({
      where: { id },
      data: { isActive: false },
    })

    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      action: OperationAction.CANCEL_SHARE,
      targetType: TargetType.SHARE,
      targetId: share.id,
      req,
    })

    successResponse(res, null, '分享已取消')
  } catch (error) {
    console.error('取消分享错误:', error)
    errorResponse(res, '取消分享失败', 500)
  }
}

/**
 * 验证分享密码
 * POST /api/shares/:id/verify
 */
export const verifySharePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { password } = req.body

    const share = await prisma.share.findUnique({
      where: { id },
      include: {
        file: true,
      },
    })

    if (!share || !share.isActive) {
      errorResponse(res, '分享不存在或已失效', 404)
      return
    }

    // 检查是否过期
    if (share.expireAt && share.expireAt < new Date()) {
      errorResponse(res, '分享已过期', 410)
      return
    }

    // 检查下载次数
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      errorResponse(res, '下载次数已达上限', 410)
      return
    }
    
    // 验证密码
    if (share.password) {
      if (!password) {
        errorResponse(res, '需要访问密码', 403)
        return
      }
      const isValid = await bcrypt.compare(password, share.password)
      if (!isValid) {
        errorResponse(res, '密码错误', 403)
        return
      }
    }

    successResponse(
      res,
      {
        file: {
          id: share.file.id,
          name: share.file.originalName,
          size: Number(share.file.size),
          sizeFormatted: formatFileSize(share.file.size),
          mimeType: share.file.mimeType,
          extension: share.file.extension,
          icon: getFileIcon(share.file.mimeType, share.file.extension || ''),
          isPreviewable: isPreviewable(share.file.mimeType),
        },
        shareId: share.id,
      },
      '验证成功'
    )
  } catch (error) {
    console.error('验证分享密码错误:', error)
    errorResponse(res, '验证失败', 500)
  }
}

/**
 * 获取分享信息(公开访问)
 * GET /api/shares/:id
 */
export const getShareInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const share = await prisma.share.findUnique({
      where: { id },
      include: {
        file: {
          select: {
            id: true,
            originalName: true,
            size: true,
            mimeType: true,
            extension: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!share || !share.isActive) {
      errorResponse(res, '分享不存在或已失效', 404)
      return
    }

    // 检查是否过期
    if (share.expireAt && share.expireAt < new Date()) {
      errorResponse(res, '分享已过期', 410)
      return
    }

    // 检查下载次数
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      errorResponse(res, '下载次数已达上限', 410)
      return
    }

    successResponse(
      res,
      {
        id: share.id,
        file: {
          ...share.file,
          size: Number(share.file.size),
          sizeFormatted: formatFileSize(share.file.size),
          icon: getFileIcon(share.file.mimeType, share.file.extension || ''),
          isPreviewable: isPreviewable(share.file.mimeType),
        },
        sharedBy: share.user.username,
        hasPassword: !!share.password,
        expireAt: share.expireAt,
        maxDownloads: share.maxDownloads,
        downloadCount: share.downloadCount,
        createdAt: share.createdAt,
      },
      '获取分享信息成功'
    )
  } catch (error) {
    console.error('获取分享信息错误:', error)
    errorResponse(res, '获取分享信息失败', 500)
  }
}

/**
 * 下载分享的文件(公开访问)
 * GET /api/shares/:id/download
 */
export const downloadSharedFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { token } = req.query // 验证令牌

    const share = await prisma.share.findUnique({
      where: { id },
      include: {
        file: true,
      },
    })

    if (!share || !share.isActive) {
      errorResponse(res, '分享不存在或已失效', 404)
      return
    }

    // 检查是否过期
    if (share.expireAt && share.expireAt < new Date()) {
      errorResponse(res, '分享已过期', 410)
      return
    }

    // 检查下载次数
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      errorResponse(res, '下载次数已达上限', 410)
      return
    }

    // 检查文件是否存在
    if (!fs.existsSync(share.file.path)) {
      errorResponse(res, '文件不存在或已被删除', 404)
      return
    }

    // 更新下载次数
    await prisma.share.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    })

    // 如果文件已加密，需要解密后发送
    if (share.file.isEncrypted && share.file.iv && share.file.encryptionKey) {
      // 创建临时解密文件
      const tempDir = os.tmpdir()
      const tempFileName = `decrypted_share_${Date.now()}_${share.file.originalName}`
      const tempPath = path.join(tempDir, tempFileName)

      try {
        // 从数据库获取authTag（存储在encryptionKey字段中）
        const authTag = share.file.encryptionKey

        await decryptFile(share.file.path, tempPath, share.file.iv, authTag)

        // 设置下载头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.file.originalName)}"`)
        res.setHeader('Content-Type', share.file.mimeType)

        // 发送解密后的文件
        res.sendFile(path.resolve(tempPath), (err) => {
          // 删除临时文件
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath)
          }
        })
        return
      } catch (decryptError) {
        console.error('分享文件解密错误:', decryptError)
        errorResponse(res, '文件解密失败', 500)
        return
      }
    }

    // 设置下载头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.file.originalName)}"`)
    res.setHeader('Content-Type', share.file.mimeType)

    // 发送文件
    res.sendFile(path.resolve(share.file.path))
  } catch (error) {
    console.error('下载分享文件错误:', error)
    errorResponse(res, '下载失败', 500)
  }
}

/**
 * 预览分享的文件(公开访问)
 * GET /api/shares/:id/preview
 */
export const previewSharedFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const share = await prisma.share.findUnique({
      where: { id },
      include: {
        file: true,
      },
    })

    if (!share || !share.isActive) {
      errorResponse(res, '分享不存在或已失效', 404)
      return
    }

    // 检查是否过期
    if (share.expireAt && share.expireAt < new Date()) {
      errorResponse(res, '分享已过期', 410)
      return
    }

    // 加密文件不支持预览
    if (share.file.isEncrypted) {
      errorResponse(res, '加密文件不支持预览，请先下载', 400)
      return
    }

    // 检查文件是否可预览
    if (!isPreviewable(share.file.mimeType)) {
      errorResponse(res, '该文件类型不支持预览', 400)
      return
    }

    // 检查文件是否存在
    if (!fs.existsSync(share.file.path)) {
      errorResponse(res, '文件不存在或已被删除', 404)
      return
    }

    // 设置预览头
    res.setHeader('Content-Type', share.file.mimeType)
    res.setHeader('Content-Disposition', 'inline')

    // 发送文件
    res.sendFile(path.resolve(share.file.path))
  } catch (error) {
    console.error('预览分享文件错误:', error)
    errorResponse(res, '预览失败', 500)
  }
}

/**
 * 清理过期分享(定时任务调用)
 */
export const cleanupExpiredShares = async (): Promise<number> => {
  const now = new Date()

  const result = await prisma.share.updateMany({
    where: {
      isActive: true,
      OR: [
        {
          expireAt: {
            lt: now,
          },
        },
        {
          maxDownloads: {
            not: null,
          },
          downloadCount: {
            gte: prisma.share.fields.maxDownloads,
          },
        },
      ],
    },
    data: {
      isActive: false,
    },
  })

  return result.count
}

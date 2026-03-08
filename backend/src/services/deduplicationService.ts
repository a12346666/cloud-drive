/**
 * 文件去重服务
 * 使用内容哈希检测重复文件，通过引用计数管理存储
 * 每个用户有自己的文件记录，但物理文件共享存储
 */

import { prisma } from '../utils/db'
import { calculateFileHash } from '../utils/streamFile'
import { logOperation, OperationAction, TargetType } from '../utils/logger'
import { getSharedStorageDir, ensureDir } from '../utils/fileStorage'
import path from 'path'
import fs from 'fs'
import type { Request } from 'express'

/**
 * 查找已存在的物理文件记录（基于内容哈希）
 * @param contentHash 文件内容MD5哈希
 * @returns 已存在的文件记录或null
 */
export const findExistingFileByHash = async (contentHash: string) => {
  if (!contentHash) return null

  const existingFile = await prisma.file.findFirst({
    where: {
      contentHash,
      isDeleted: false,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return existingFile
}

/**
 * 创建文件去重记录
 * 每个用户有自己的数据库记录，但物理文件共享存储
 * @param params 文件参数
 * @returns 创建的文件记录
 */
export const createDeduplicatedFile = async (params: {
  name: string
  originalName: string
  path: string
  size: bigint
  mimeType: string
  extension: string | null
  userId: number
  folderId: number | null
  contentHash: string | null
  isEncrypted: boolean
  encryptionKey: string | null
  iv: string | null
  isChunked?: boolean
  totalChunks?: number
  req?: Request
}) => {
  const {
    contentHash,
    userId,
    req,
    ...fileData
  } = params

  // 如果有内容哈希，检查是否存在重复文件
  if (contentHash) {
    const existingFile = await findExistingFileByHash(contentHash)

    if (existingFile) {
      // 检查物理文件是否存在
      if (!fs.existsSync(existingFile.path)) {
        // 如果物理文件不存在，说明是脏数据，继续创建新文件
        console.warn(`[去重] 物理文件不存在: ${existingFile.path}，将创建新文件`)
      } else {
        // 物理文件存在，创建新的用户记录但引用相同的物理文件
        const newFileRecord = await prisma.file.create({
          data: {
            ...fileData,
            path: existingFile.path, // 使用相同的物理路径
            userId,
            contentHash,
            refCount: 0, // 用户记录的引用计数为0，物理文件的引用计数在原始记录中管理
          },
        })

        // 增加原始文件的引用计数
        await prisma.file.update({
          where: { id: existingFile.id },
          data: {
            refCount: {
              increment: 1,
            },
          },
        })

        // 记录去重日志
        if (req) {
          await logOperation({
            userId,
            action: OperationAction.UPLOAD,
            targetType: TargetType.FILE,
            targetId: newFileRecord.id,
            details: {
              fileName: fileData.originalName,
              size: Number(fileData.size),
              isDuplicate: true,
              originalFileId: existingFile.id,
              savedSpace: Number(fileData.size),
            },
            req,
          })
        }

        // 删除用户上传的临时文件（因为使用了已存在的物理文件）
        if (fs.existsSync(fileData.path) && fileData.path !== existingFile.path) {
          fs.unlinkSync(fileData.path)
        }

        return {
          file: newFileRecord,
          isDuplicate: true,
          savedSpace: Number(fileData.size),
        }
      }
    }
  }

  // 是新文件，需要移动到共享存储目录
  const sharedDir = getSharedStorageDir()
  ensureDir(sharedDir)

  // 生成共享存储路径（使用内容哈希作为文件名，确保唯一性）
  const ext = path.extname(fileData.originalName)
  const sharedFileName = contentHash
    ? `${contentHash}${ext}`
    : `${Date.now()}_${path.basename(fileData.name)}`
  const sharedPath = path.join(sharedDir, sharedFileName)

  // 移动文件到共享目录
  if (fs.existsSync(fileData.path)) {
    fs.renameSync(fileData.path, sharedPath)
  }

  // 创建新文件记录
  const newFile = await prisma.file.create({
    data: {
      ...fileData,
      path: sharedPath,
      userId,
      contentHash,
      refCount: 1,
    },
  })

  // 记录上传日志
  if (req) {
    await logOperation({
      userId,
      action: OperationAction.UPLOAD,
      targetType: TargetType.FILE,
      targetId: newFile.id,
      details: {
        fileName: fileData.originalName,
        size: Number(fileData.size),
        isDuplicate: false,
        contentHash,
      },
      req,
    })
  }

  return {
    file: newFile,
    isDuplicate: false,
    savedSpace: 0,
  }
}

/**
 * 删除文件（带引用计数处理）
 * 每个用户删除自己的记录，只有当所有用户都删除后才删除物理文件
 * @param fileId 文件ID
 * @param userId 用户ID
 * @param req Express请求对象
 * @returns 是否成功删除
 */
export const deleteFileWithDeduplication = async (
  fileId: number,
  userId: number,
  req?: Request
): Promise<boolean> => {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      userId,
      isDeleted: false,
    },
  })

  if (!file) {
    return false
  }

  // 使用事务处理删除和引用计数更新
  await prisma.$transaction(async (tx) => {
    // 软删除当前用户的文件记录
    await tx.file.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    // 如果文件有内容哈希，找到原始文件并减少其引用计数
    if (file.contentHash) {
      const originalFile = await tx.file.findFirst({
        where: {
          contentHash: file.contentHash,
          isDeleted: false,
          id: { not: fileId },
          refCount: { gt: 0 },
        },
        orderBy: { createdAt: 'asc' },
      })

      if (originalFile) {
        // 减少原始文件的引用计数
        const newRefCount = Math.max(0, originalFile.refCount - 1)
        await tx.file.update({
          where: { id: originalFile.id },
          data: {
            refCount: newRefCount,
          },
        })

        // 如果引用计数变为0，标记原始文件为待删除
        if (newRefCount === 0) {
          await tx.file.update({
            where: { id: originalFile.id },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          })
        }
      }
    }

    // 更新用户存储空间
    await tx.user.update({
      where: { id: userId },
      data: {
        storageUsed: {
          decrement: file.size,
        },
      },
    })
  })

  // 记录删除日志
  if (req) {
    await logOperation({
      userId,
      action: OperationAction.DELETE,
      targetType: TargetType.FILE,
      targetId: fileId,
      details: {
        fileName: file.originalName,
        size: Number(file.size),
        contentHash: file.contentHash,
      },
      req,
    })
  }

  return true
}

/**
 * 获取去重统计信息
 * @returns 去重统计
 */
export const getDeduplicationStats = async () => {
  const stats = await prisma.file.groupBy({
    by: ['contentHash'],
    where: {
      contentHash: { not: null },
      isDeleted: false,
    },
    _count: {
      id: true,
    },
    _sum: {
      size: true,
    },
    having: {
      id: {
        _count: {
          gt: 1,
        },
      },
    },
  })

  let totalDuplicates = 0
  let totalSavedSpace = 0

  for (const stat of stats) {
    const duplicateCount = stat._count.id - 1
    const fileSize = Number(stat._sum.size || 0)
    totalDuplicates += duplicateCount
    totalSavedSpace += duplicateCount * fileSize
  }

  return {
    duplicateGroups: stats.length,
    totalDuplicates,
    totalSavedSpace,
  }
}

/**
 * 清理无引用的物理文件
 * 定期运行此函数删除refCount为0的物理文件
 */
export const cleanupUnreferencedFiles = async (): Promise<number> => {
  const unreferencedFiles = await prisma.file.findMany({
    where: {
      refCount: 0,
      isDeleted: true,
    },
    select: {
      id: true,
      path: true,
    },
  })

  let deletedCount = 0
  for (const file of unreferencedFiles) {
    try {
      // 删除物理文件
      const fs = await import('fs')
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }

      // 硬删除数据库记录
      await prisma.file.delete({
        where: { id: file.id },
      })

      deletedCount++
    } catch (error) {
      console.error(`清理无引用文件失败 (ID: ${file.id}):`, error)
    }
  }

  return deletedCount
}

/**
 * 计算并保存文件哈希
 * @param fileId 文件ID
 * @param filePath 文件路径
 */
export const calculateAndSaveFileHash = async (
  fileId: number,
  filePath: string
): Promise<string | null> => {
  try {
    const hash = await calculateFileHash(filePath)

    await prisma.file.update({
      where: { id: fileId },
      data: { contentHash: hash },
    })

    return hash
  } catch (error) {
    console.error('计算文件哈希失败:', error)
    return null
  }
}

/**
 * 文件版本历史服务
 * 支持文件版本管理和回滚
 */

import { prisma } from '../utils/db'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface FileVersion {
  id: number
  fileId: number
  version: number
  name: string
  path: string
  size: bigint
  contentHash: string
  createdAt: Date
}

export const createFileVersion = async (
  fileId: number,
  userId: number,
  filePath: string,
  originalName: string
): Promise<FileVersion | null> => {
  try {
    const existingVersions = await prisma.fileVersion.count({
      where: { fileId },
    })

    const fileBuffer = fs.readFileSync(filePath)
    const contentHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex')

    const stats = fs.statSync(filePath)

    const versionDir = path.join(path.dirname(filePath), 'versions')
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true })
    }

    const versionPath = path.join(versionDir, `v${existingVersions + 1}_${originalName}`)
    fs.copyFileSync(filePath, versionPath)

    const version = await prisma.fileVersion.create({
      data: {
        fileId,
        version: existingVersions + 1,
        name: originalName,
        path: versionPath,
        size: BigInt(stats.size),
        contentHash,
      },
    })

    return version
  } catch (error) {
    console.error('[版本历史] 创建版本失败:', error)
    return null
  }
}

export const getFileVersions = async (
  fileId: number,
  userId: number
): Promise<FileVersion[]> => {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, isDeleted: false },
  })

  if (!file) {
    return []
  }

  const versions = await prisma.fileVersion.findMany({
    where: { fileId },
    orderBy: { version: 'desc' },
  })

  return versions
}

export const restoreFileVersion = async (
  fileId: number,
  versionId: number,
  userId: number
): Promise<boolean> => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId, isDeleted: false },
    })

    if (!file) {
      return false
    }

    const version = await prisma.fileVersion.findFirst({
      where: { id: versionId, fileId },
    })

    if (!version || !fs.existsSync(version.path)) {
      return false
    }

    await createFileVersion(fileId, userId, file.path, file.originalName)

    fs.copyFileSync(version.path, file.path)

    await prisma.file.update({
      where: { id: fileId },
      data: {
        size: version.size,
        updatedAt: new Date(),
      },
    })

    return true
  } catch (error) {
    console.error('[版本历史] 恢复版本失败:', error)
    return false
  }
}

export const deleteFileVersion = async (
  fileId: number,
  versionId: number,
  userId: number
): Promise<boolean> => {
  try {
    const version = await prisma.fileVersion.findFirst({
      where: { id: versionId, fileId },
      include: { file: true },
    })

    if (!version || version.file.userId !== userId) {
      return false
    }

    if (fs.existsSync(version.path)) {
      fs.unlinkSync(version.path)
    }

    await prisma.fileVersion.delete({
      where: { id: versionId },
    })

    return true
  } catch (error) {
    console.error('[版本历史] 删除版本失败:', error)
    return false
  }
}

export const cleanupOldVersions = async (
  fileId: number,
  keepVersions: number = 10
): Promise<number> => {
  try {
    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { version: 'desc' },
    })

    if (versions.length <= keepVersions) {
      return 0
    }

    const toDelete = versions.slice(keepVersions)
    let deleted = 0

    for (const version of toDelete) {
      if (fs.existsSync(version.path)) {
        fs.unlinkSync(version.path)
      }
      await prisma.fileVersion.delete({
        where: { id: version.id },
      })
      deleted++
    }

    return deleted
  } catch (error) {
    console.error('[版本历史] 清理旧版本失败:', error)
    return 0
  }
}

export default {
  createFileVersion,
  getFileVersions,
  restoreFileVersion,
  deleteFileVersion,
  cleanupOldVersions,
}

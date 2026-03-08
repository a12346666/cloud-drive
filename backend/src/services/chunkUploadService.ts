/**
 * 分片上传服务
 * 支持断点续传、分片合并、秒传功能
 */

import { prisma } from '../utils/db'
import {
  calculateChunkHash,
  calculateFileHash,
  mergeFileChunksStream,
  getChunkStorageDir,
  ensureDir,
  cleanupChunks,
  CHUNK_SIZE,
  createUploadSessionId,
  fileExists,
  getFileSize,
  encryptFileStream,
} from '../utils/streamFile'
import { createDeduplicatedFile, findExistingFileByHash } from './deduplicationService'
import path from 'path'
import fs from 'fs'
import type { Request } from 'express'

/**
 * 初始化分片上传
 * @param params 初始化参数
 * @returns 上传会话信息
 */
export const initChunkUpload = async (params: {
  fileName: string
  fileSize: number
  fileHash: string
  totalChunks: number
  mimeType: string
  userId: number
  folderId: number | null
  encrypt: boolean
}) => {
  const { fileName, fileSize, fileHash, totalChunks, mimeType, userId, folderId, encrypt } = params

  // 检查文件是否已存在（秒传）
  const existingFile = await findExistingFileByHash(fileHash)
  if (existingFile) {
    return {
      uploadId: null,
      isDuplicate: true,
      fileId: existingFile.id,
      message: '文件已存在，秒传成功',
    }
  }

  // 检查已上传的分片
  const existingChunks = await prisma.fileChunk.findMany({
    where: {
      uploadId: fileHash, // 使用文件哈希作为上传ID，支持断点续传
      userId,
    },
    orderBy: {
      chunkIndex: 'asc',
    },
  })

  const uploadedChunks = existingChunks.map((chunk) => chunk.chunkIndex)
  const uploadId = fileHash // 使用文件哈希作为上传会话ID

  // 如果分片已全部上传，直接合并
  if (uploadedChunks.length === totalChunks) {
    return {
      uploadId,
      isComplete: true,
      uploadedChunks,
      message: '所有分片已上传，准备合并',
    }
  }

  return {
    uploadId,
    isDuplicate: false,
    isComplete: false,
    uploadedChunks,
    chunkSize: CHUNK_SIZE,
    totalChunks,
    message: '初始化成功',
  }
}

/**
 * 上传单个分片
 * @param params 分片参数
 * @returns 上传结果
 */
export const uploadChunk = async (params: {
  uploadId: string
  chunkIndex: number
  chunkHash: string
  chunkPath: string
  userId: number
}): Promise<{ success: boolean; message: string }> => {
  const { uploadId, chunkIndex, chunkHash, chunkPath, userId } = params

  try {
    // 验证分片哈希
    const actualHash = await calculateChunkHash(chunkPath)
    if (actualHash !== chunkHash) {
      // 删除损坏的分片
      fs.unlinkSync(chunkPath)
      return {
        success: false,
        message: '分片校验失败，请重新上传',
      }
    }

    // 保存分片记录
    await prisma.fileChunk.create({
      data: {
        uploadId,
        chunkIndex,
        chunkHash,
        chunkSize: getFileSize(chunkPath),
        path: chunkPath,
        userId,
      },
    })

    return {
      success: true,
      message: '分片上传成功',
    }
  } catch (error) {
    console.error('上传分片失败:', error)
    // 清理失败的分片文件
    if (fs.existsSync(chunkPath)) {
      fs.unlinkSync(chunkPath)
    }
    return {
      success: false,
      message: '分片上传失败',
    }
  }
}

/**
 * 合并分片并完成上传
 * @param params 合并参数
 * @returns 合并结果
 */
export const mergeChunks = async (params: {
  uploadId: string
  fileName: string
  fileHash: string
  fileSize: number
  mimeType: string
  extension: string
  totalChunks: number
  userId: number
  folderId: number | null
  encrypt: boolean
  req?: Request
}): Promise<{
  success: boolean
  file?: any
  isDuplicate?: boolean
  savedSpace?: number
  message: string
}> => {
  const {
    uploadId,
    fileName,
    fileHash,
    fileSize,
    mimeType,
    extension,
    totalChunks,
    userId,
    folderId,
    encrypt,
    req,
  } = params

  try {
    // 获取所有分片
    const chunks = await prisma.fileChunk.findMany({
      where: { uploadId },
      orderBy: { chunkIndex: 'asc' },
    })

    // 检查分片完整性
    if (chunks.length !== totalChunks) {
      return {
        success: false,
        message: `分片不完整，已上传 ${chunks.length}/${totalChunks}`,
      }
    }

    // 检查分片顺序
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].chunkIndex !== i) {
        return {
          success: false,
          message: `分片顺序错误，缺少分片 ${i}`,
        }
      }
    }

    // 创建临时合并文件路径
    const chunkDir = getChunkStorageDir(uploadId)
    const mergedFilePath = path.join(chunkDir, 'merged_' + fileName)

    // 合并分片
    const chunkPaths = chunks.map((chunk) => chunk.path)
    await mergeFileChunksStream(chunkPaths, mergedFilePath)

    // 验证合并后的文件哈希
    const mergedFileHash = await calculateFileHash(mergedFilePath)
    if (mergedFileHash !== fileHash) {
      // 删除合并失败的文件
      fs.unlinkSync(mergedFilePath)
      return {
        success: false,
        message: '文件合并后校验失败，请重新上传',
      }
    }

    // 创建临时文件路径（最终会被 createDeduplicatedFile 移动到共享目录）
    const tempDir = path.join(process.env.UPLOAD_DIR || './uploads', 'temp')
    ensureDir(tempDir)

    let finalFilePath = path.join(tempDir, `${Date.now()}_${fileName}`)
    let isEncrypted = false
    let encryptionKey = null
    let iv = null

    // 如果启用加密
    if (encrypt) {
      const encryptedPath = `${finalFilePath}.encrypted`
      const encryptResult = await encryptFileStream(mergedFilePath, encryptedPath)
      iv = encryptResult.iv
      encryptionKey = encryptResult.authTag
      isEncrypted = true

      // 删除未加密的合并文件
      fs.unlinkSync(mergedFilePath)
      finalFilePath = encryptedPath
    } else {
      // 移动合并后的文件到临时位置（createDeduplicatedFile 会移动到共享目录）
      fs.renameSync(mergedFilePath, finalFilePath)
    }

    // 创建文件记录（带去重）
    const result = await createDeduplicatedFile({
      name: path.basename(finalFilePath),
      originalName: fileName,
      path: finalFilePath,
      size: BigInt(fileExists(finalFilePath) ? getFileSize(finalFilePath) : fileSize),
      mimeType,
      extension,
      userId,
      folderId,
      contentHash: fileHash,
      isEncrypted,
      encryptionKey,
      iv,
      isChunked: true,
      totalChunks,
      req,
    })

    // 更新分片关联的文件ID
    await prisma.fileChunk.updateMany({
      where: { uploadId },
      data: { fileId: result.file.id },
    })

    // 清理分片文件
    cleanupChunks(uploadId)

    // 删除分片记录
    await prisma.fileChunk.deleteMany({
      where: { uploadId },
    })

    return {
      success: true,
      file: result.file,
      isDuplicate: result.isDuplicate,
      savedSpace: result.savedSpace,
      message: result.isDuplicate ? '文件秒传成功' : '文件上传成功',
    }
  } catch (error) {
    console.error('合并分片失败:', error)
    return {
      success: false,
      message: '文件合并失败',
    }
  }
}

/**
 * 检查上传进度
 * @param uploadId 上传会话ID
 * @returns 已上传的分片索引列表
 */
export const checkUploadProgress = async (uploadId: string): Promise<number[]> => {
  const chunks = await prisma.fileChunk.findMany({
    where: { uploadId },
    select: { chunkIndex: true },
  })

  return chunks.map((chunk) => chunk.chunkIndex)
}

/**
 * 取消上传并清理分片
 * @param uploadId 上传会话ID
 * @param userId 用户ID
 */
export const cancelUpload = async (uploadId: string, userId: number): Promise<boolean> => {
  try {
    // 删除分片记录
    await prisma.fileChunk.deleteMany({
      where: { uploadId, userId },
    })

    // 清理分片文件
    cleanupChunks(uploadId)

    return true
  } catch (error) {
    console.error('取消上传失败:', error)
    return false
  }
}

/**
 * 清理过期的分片上传
 * @param maxAgeHours 最大保留时间（小时）
 * @returns 清理的分片数量
 */
export const cleanupExpiredChunks = async (maxAgeHours: number = 24): Promise<number> => {
  const expireTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

  const expiredChunks = await prisma.fileChunk.findMany({
    where: {
      createdAt: {
        lt: expireTime,
      },
      fileId: null, // 只清理未关联到文件的分片
    },
  })

  let deletedCount = 0
  for (const chunk of expiredChunks) {
    try {
      // 删除物理文件
      if (fs.existsSync(chunk.path)) {
        fs.unlinkSync(chunk.path)
      }

      // 删除数据库记录
      await prisma.fileChunk.delete({
        where: { id: chunk.id },
      })

      deletedCount++
    } catch (error) {
      console.error(`清理过期分片失败 (ID: ${chunk.id}):`, error)
    }
  }

  // 清理空的分片目录
  const chunksBaseDir = path.join(process.env.UPLOAD_DIR || './uploads', 'chunks')
  if (fs.existsSync(chunksBaseDir)) {
    const dirs = fs.readdirSync(chunksBaseDir)
    for (const dir of dirs) {
      const dirPath = path.join(chunksBaseDir, dir)
      try {
        const files = fs.readdirSync(dirPath)
        if (files.length === 0) {
          fs.rmdirSync(dirPath)
        }
      } catch (error) {
        // 忽略目录访问错误
      }
    }
  }

  return deletedCount
}

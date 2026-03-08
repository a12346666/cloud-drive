/**
 * 分片上传控制器
 * 处理分片上传的API请求
 */

import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { successResponse, errorResponse } from '../utils/response'
import {
  initChunkUpload,
  uploadChunk,
  mergeChunks,
  checkUploadProgress,
  cancelUpload,
} from '../services/chunkUploadService'
import { getChunkStorageDir, ensureDir, CHUNK_SIZE } from '../utils/streamFile'
import { prisma } from '../utils/db'

/**
 * 初始化分片上传
 * POST /api/files/chunk/init
 */
export const initUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileName, fileSize, fileHash, mimeType, folderId, encrypt } = req.body

    if (!fileName || !fileSize || !fileHash || !mimeType) {
      errorResponse(res, '缺少必要参数', 400)
      return
    }

    // 计算总分片数
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

    // 检查用户存储空间
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    const storageUsed = Number(user.storageUsed)
    const storageLimit = Number(user.storageLimit)

    if (storageUsed + fileSize > storageLimit) {
      errorResponse(res, '存储空间不足', 400)
      return
    }

    // 初始化上传
    const result = await initChunkUpload({
      fileName,
      fileSize,
      fileHash,
      totalChunks,
      mimeType,
      userId: req.user.id,
      folderId: folderId || null,
      encrypt: encrypt === true || encrypt === 'true',
    })

    if (result.isDuplicate) {
      // 秒传成功
      successResponse(
        res,
        {
          isDuplicate: true,
          fileId: result.fileId,
          message: result.message,
        },
        result.message,
        200
      )
      return
    }

    successResponse(
      res,
      {
        uploadId: result.uploadId,
        isComplete: result.isComplete,
        uploadedChunks: result.uploadedChunks,
        chunkSize: CHUNK_SIZE,
        totalChunks,
        message: result.message,
      },
      '初始化成功'
    )
  } catch (error) {
    console.error('初始化分片上传错误:', error)
    errorResponse(res, '初始化上传失败', 500)
  }
}

/**
 * 上传分片
 * POST /api/files/chunk/upload
 */
export const uploadFileChunk = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    if (!req.file) {
      errorResponse(res, '未选择文件分片', 400)
      return
    }

    const { uploadId, chunkIndex, chunkHash } = req.body

    if (!uploadId || chunkIndex === undefined || !chunkHash) {
      // 删除临时文件
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      errorResponse(res, '缺少必要参数', 400)
      return
    }

    const chunkIdx = parseInt(chunkIndex)
    if (isNaN(chunkIdx) || chunkIdx < 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      errorResponse(res, '无效的分片索引', 400)
      return
    }

    // 移动分片到存储目录
    const chunkDir = getChunkStorageDir(uploadId)
    ensureDir(chunkDir)

    const chunkFileName = `chunk_${chunkIdx}`
    const chunkPath = path.join(chunkDir, chunkFileName)

    // 如果分片已存在，先删除
    if (fs.existsSync(chunkPath)) {
      fs.unlinkSync(chunkPath)
    }

    // 移动文件
    fs.renameSync(req.file.path, chunkPath)

    // 保存分片记录
    const result = await uploadChunk({
      uploadId,
      chunkIndex: chunkIdx,
      chunkHash,
      chunkPath,
      userId: req.user.id,
    })

    if (!result.success) {
      errorResponse(res, result.message, 400)
      return
    }

    successResponse(
      res,
      {
        chunkIndex: chunkIdx,
        uploadId,
      },
      result.message
    )
  } catch (error) {
    console.error('上传分片错误:', error)
    errorResponse(res, '上传分片失败', 500)
  }
}

/**
 * 合并分片
 * POST /api/files/chunk/merge
 */
export const mergeFileChunks = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const {
      uploadId,
      fileName,
      fileHash,
      fileSize,
      mimeType,
      totalChunks,
      folderId,
      encrypt,
    } = req.body

    if (!uploadId || !fileName || !fileHash || !fileSize || !mimeType || !totalChunks) {
      errorResponse(res, '缺少必要参数', 400)
      return
    }

    const extension = path.extname(fileName).slice(1).toLowerCase()

    // 合并分片
    const result = await mergeChunks({
      uploadId,
      fileName,
      fileHash,
      fileSize,
      mimeType,
      extension,
      totalChunks: parseInt(totalChunks),
      userId: req.user.id,
      folderId: folderId || null,
      encrypt: encrypt === true || encrypt === 'true',
      req,
    })

    if (!result.success) {
      errorResponse(res, result.message, 400)
      return
    }

    successResponse(
      res,
      {
        file: result.file,
        isDuplicate: result.isDuplicate,
        savedSpace: result.savedSpace,
      },
      result.message,
      result.isDuplicate ? 200 : 201
    )
  } catch (error) {
    console.error('合并分片错误:', error)
    errorResponse(res, '合并分片失败', 500)
  }
}

/**
 * 检查上传进度
 * GET /api/files/chunk/progress/:uploadId
 */
export const getUploadProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { uploadId } = req.params

    if (!uploadId) {
      errorResponse(res, '缺少上传ID', 400)
      return
    }

    const uploadedChunks = await checkUploadProgress(uploadId)

    successResponse(
      res,
      {
        uploadId,
        uploadedChunks,
        uploadedCount: uploadedChunks.length,
      },
      '获取上传进度成功'
    )
  } catch (error) {
    console.error('获取上传进度错误:', error)
    errorResponse(res, '获取上传进度失败', 500)
  }
}

/**
 * 取消上传
 * DELETE /api/files/chunk/cancel/:uploadId
 */
export const cancelChunkUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { uploadId } = req.params

    if (!uploadId) {
      errorResponse(res, '缺少上传ID', 400)
      return
    }

    const success = await cancelUpload(uploadId, req.user.id)

    if (!success) {
      errorResponse(res, '取消上传失败', 500)
      return
    }

    successResponse(res, null, '上传已取消')
  } catch (error) {
    console.error('取消上传错误:', error)
    errorResponse(res, '取消上传失败', 500)
  }
}

/**
 * 秒传检查
 * POST /api/files/chunk/check
 */
export const checkFileExists = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '未认证', 401)
      return
    }

    const { fileHash, fileSize } = req.body

    if (!fileHash) {
      errorResponse(res, '缺少文件哈希', 400)
      return
    }

    // 检查用户存储空间
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      errorResponse(res, '用户不存在', 404)
      return
    }

    const storageUsed = Number(user.storageUsed)
    const storageLimit = Number(user.storageLimit)

    if (storageUsed + (fileSize || 0) > storageLimit) {
      errorResponse(res, '存储空间不足', 400)
      return
    }

    // 检查文件是否已存在
    const existingFile = await prisma.file.findFirst({
      where: {
        contentHash: fileHash,
        isDeleted: false,
      },
    })

    if (existingFile) {
      // 文件已存在，创建引用记录
      const { createDeduplicatedFile } = await import('../services/deduplicationService')
      const result = await createDeduplicatedFile({
        name: existingFile.name,
        originalName: existingFile.originalName,
        path: existingFile.path,
        size: existingFile.size,
        mimeType: existingFile.mimeType,
        extension: existingFile.extension,
        userId: req.user.id,
        folderId: null,
        contentHash: fileHash,
        isEncrypted: existingFile.isEncrypted,
        encryptionKey: existingFile.encryptionKey,
        iv: existingFile.iv,
        req,
      })

      successResponse(
        res,
        {
          exists: true,
          isDuplicate: true,
          file: result.file,
          savedSpace: result.savedSpace,
        },
        '文件秒传成功'
      )
      return
    }

    successResponse(
      res,
      {
        exists: false,
      },
      '文件不存在，需要上传'
    )
  } catch (error) {
    console.error('检查文件存在错误:', error)
    errorResponse(res, '检查文件失败', 500)
  }
}

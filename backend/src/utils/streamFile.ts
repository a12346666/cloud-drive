/**
 * 流式文件处理工具
 * 支持大文件的流式加密、解密和哈希计算
 */

import crypto from 'crypto'
import fs from 'fs'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import path from 'path'

// 加密配置
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// 分片大小配置 (5MB)
export const CHUNK_SIZE = 5 * 1024 * 1024

/**
 * 获取加密密钥Buffer
 */
export const getKeyBuffer = (): Buffer => {
  return Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')
}

/**
 * 生成随机初始化向量
 */
export const generateIV = (): Buffer => {
  return crypto.randomBytes(IV_LENGTH)
}

/**
 * 流式加密文件
 * 文件格式: [IV(16字节)][加密数据][AuthTag(16字节)]
 * @param inputPath 输入文件路径
 * @param outputPath 输出文件路径
 * @returns 返回IV和认证标签
 */
export const encryptFileStream = async (
  inputPath: string,
  outputPath: string
): Promise<{ iv: string; authTag: string }> => {
  const iv = generateIV()
  const key = getKeyBuffer()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const input = createReadStream(inputPath)
  const output = createWriteStream(outputPath)

  // 先写入IV
  output.write(iv)

  // 管道传输加密数据
  await pipeline(input, cipher, output)

  // 获取认证标签
  const authTag = cipher.getAuthTag()

  // 将认证标签追加到文件末尾
  fs.appendFileSync(outputPath, authTag)

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

/**
 * 流式解密文件
 * 文件格式: [IV(16字节)][加密数据][AuthTag(16字节)]
 * @param inputPath 加密文件路径
 * @param outputPath 输出文件路径
 * @param ivHex 初始化向量(十六进制)
 * @param authTagHex 认证标签(十六进制)
 */
export const decryptFileStream = async (
  inputPath: string,
  outputPath: string,
  ivHex: string,
  authTagHex: string
): Promise<void> => {
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = getKeyBuffer()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  // 获取文件大小
  const stats = fs.statSync(inputPath)
  const fileSize = stats.size

  // 读取加密数据部分（跳过IV，排除末尾的authTag）
  const encryptedDataStart = IV_LENGTH
  const encryptedDataEnd = fileSize - AUTH_TAG_LENGTH

  const input = createReadStream(inputPath, {
    start: encryptedDataStart,
    end: encryptedDataEnd - 1, // end是包含的，所以减1
  })
  const output = createWriteStream(outputPath)

  await pipeline(input, decipher, output)
}

/**
 * 计算文件MD5哈希 (流式)
 * @param filePath 文件路径
 * @returns MD5哈希值
 */
export const calculateFileHash = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = createReadStream(filePath)

    stream.on('data', (chunk) => {
      hash.update(chunk)
    })

    stream.on('end', () => {
      resolve(hash.digest('hex'))
    })

    stream.on('error', reject)
  })
}

/**
 * 计算分片MD5哈希
 * @param chunkPath 分片文件路径
 * @returns MD5哈希值
 */
export const calculateChunkHash = async (chunkPath: string): Promise<string> => {
  return calculateFileHash(chunkPath)
}

/**
 * 合并文件分片
 * @param chunkPaths 分片路径数组
 * @param outputPath 输出文件路径
 */
export const mergeFileChunks = async (
  chunkPaths: string[],
  outputPath: string
): Promise<void> => {
  const output = createWriteStream(outputPath)

  for (const chunkPath of chunkPaths) {
    const chunkData = fs.readFileSync(chunkPath)
    output.write(chunkData)
  }

  output.end()
  
  return new Promise((resolve, reject) => {
    output.on('finish', resolve)
    output.on('error', reject)
  })
}

/**
 * 流式合并分片 (更节省内存)
 * @param chunkPaths 分片路径数组
 * @param outputPath 输出文件路径
 */
export const mergeFileChunksStream = async (
  chunkPaths: string[],
  outputPath: string
): Promise<void> => {
  const output = createWriteStream(outputPath)

  for (const chunkPath of chunkPaths) {
    const input = createReadStream(chunkPath)
    await pipeline(input, output, { end: false })
  }

  output.end()
  
  return new Promise((resolve, reject) => {
    output.on('finish', resolve)
    output.on('error', reject)
  })
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath)
}

/**
 * 获取文件大小
 * @param filePath 文件路径
 * @returns 文件大小(字节)
 */
export const getFileSize = (filePath: string): number => {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  } catch {
    return 0
  }
}

/**
 * 删除文件
 * @param filePath 文件路径
 */
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  } catch (error) {
    console.error('删除文件失败:', error)
    return false
  }
}

/**
 * 创建分片上传会话ID
 */
export const createUploadSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * 获取分片存储目录
 * @param uploadId 上传会话ID
 * @returns 分片存储目录路径
 */
export const getChunkStorageDir = (uploadId: string): string => {
  const baseDir = process.env.UPLOAD_DIR || './uploads'
  return path.join(baseDir, 'chunks', uploadId)
}

/**
 * 确保目录存在
 * @param dirPath 目录路径
 */
export const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 清理分片文件
 * @param uploadId 上传会话ID
 */
export const cleanupChunks = (uploadId: string): void => {
  const chunkDir = getChunkStorageDir(uploadId)
  if (fs.existsSync(chunkDir)) {
    fs.rmSync(chunkDir, { recursive: true, force: true })
  }
}

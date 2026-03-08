/**
 * 文件加密工具
 * 使用AES-256-GCM算法进行文件加密/解密 - 流式处理版本
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

// 从环境变量获取加密密钥，如果没有则生成一个随机密钥
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * 生成随机初始化向量
 */
export const generateIV = (): Buffer => {
  return crypto.randomBytes(IV_LENGTH)
}

/**
 * 从密钥字符串获取Buffer
 */
export const getKeyBuffer = (): Buffer => {
  return Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')
}

/**
 * 加密文件 - 流式处理（适合大文件）
 * 文件格式: [IV(16字节)][加密数据][AuthTag(16字节)]
 * @param inputPath 输入文件路径
 * @param outputPath 输出文件路径
 * @returns 返回IV和认证标签
 */
export const encryptFile = async (
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
 * 解密文件 - 流式处理（适合大文件）
 * 文件格式: [IV(16字节)][加密数据][AuthTag(16字节)]
 * @param inputPath 加密文件路径
 * @param outputPath 输出文件路径
 * @param ivHex 初始化向量(十六进制)
 * @param authTagHex 认证标签(十六进制)
 */
export const decryptFile = async (
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
 * 生成加密文件路径
 */
export const getEncryptedPath = (originalPath: string): string => {
  const dir = path.dirname(originalPath)
  const ext = path.extname(originalPath)
  const base = path.basename(originalPath, ext)
  return path.join(dir, `${base}.encrypted${ext}`)
}

/**
 * 检查文件是否加密
 */
export const isEncryptedFile = (filePath: string): boolean => {
  return filePath.includes('.encrypted')
}

/**
 * 生成加密密钥哈希(用于数据库存储)
 * 使用固定的密钥哈希，确保可以解密
 */
export const hashEncryptionKey = (): string => {
  // 使用固定的密钥标识，而不是随机值
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('hex').slice(0, 16)
}

/**
 * 从加密文件中读取认证标签
 * @param encryptedFilePath 加密文件路径
 * @returns 认证标签(十六进制)
 */
export const readAuthTagFromFile = (encryptedFilePath: string): string => {
  try {
    const fileBuffer = fs.readFileSync(encryptedFilePath)
    // 认证标签存储在文件开头，IV之后
    const authTag = fileBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    return authTag.toString('hex')
  } catch (error) {
    console.error('读取认证标签失败:', error)
    return ''
  }
}

/**
 * 流式解密并直接发送响应（用于下载）
 * 文件格式: [IV(16字节)][加密数据][AuthTag(16字节)]
 * @param encryptedFilePath 加密文件路径
 * @param ivHex 初始化向量
 * @param authTagHex 认证标签
 * @param outputStream 输出流
 */
export const streamDecryptToResponse = async (
  encryptedFilePath: string,
  ivHex: string,
  authTagHex: string,
  outputStream: NodeJS.WritableStream
): Promise<void> => {
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = getKeyBuffer()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  // 获取文件大小
  const stats = fs.statSync(encryptedFilePath)
  const fileSize = stats.size

  // 读取加密数据部分（跳过IV，排除末尾的authTag）
  const encryptedDataStart = IV_LENGTH
  const encryptedDataEnd = fileSize - AUTH_TAG_LENGTH

  const input = createReadStream(encryptedFilePath, {
    start: encryptedDataStart,
    end: encryptedDataEnd - 1, // end是包含的，所以减1
  })

  await pipeline(input, decipher, outputStream)
}

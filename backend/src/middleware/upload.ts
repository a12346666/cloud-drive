/**
 * 文件上传中间件配置 - 安全增强版
 * 使用Multer处理文件上传，增加多重安全验证
 */

import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { generateUniqueFileName, getUserStorageDir, ensureDir } from '../utils/fileStorage'
import { JwtPayload } from '../utils/jwt'
import { errorResponse } from '../utils/response'
import { securityConfig } from '../config/security'

type RequestWithUser = Request & { user?: JwtPayload & { id: number } }

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '524288000')

const dangerousExtensions = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.vbe', '.js', '.jse',
  '.jar', '.msi', '.msp', '.cpl', '.dll', '.ocx', '.sys', '.drv', '.sh', '.bash',
  '.zsh', '.ksh', '.ps1', '.ps2', '.psm1', '.psd1', '.app', '.dmg', '.pkg',
  '.deb', '.rpm', '.hta', '.wsf', '.wsh', '.sct', '.wsc', '.wsf', '.inf',
  '.reg', '.scf', '.lnk', '.url', '.pif', '.vb', '.vbscript', '.class',
]

const magicNumbers: { [key: string]: { bytes: number[]; offset?: number } } = {
  'image/jpeg': { bytes: [0xFF, 0xD8, 0xFF] },
  'image/png': { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  'image/gif': { bytes: [0x47, 0x49, 0x46, 0x38] },
  'image/webp': { bytes: [0x52, 0x49, 0x46, 0x46] },
  'application/pdf': { bytes: [0x25, 0x50, 0x44, 0x46] },
  'application/zip': { bytes: [0x50, 0x4B, 0x03, 0x04] },
  'application/x-rar-compressed': { bytes: [0x52, 0x61, 0x72, 0x21] },
  'video/mp4': { bytes: [0x00, 0x00, 0x00] },
  'audio/mpeg': { bytes: [0xFF, 0xFB] },
}

const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') return 'unnamed_file'
  
  return filename
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, '_$1')
    .trim()
    .substring(0, 255) || 'unnamed_file'
}

const verifyMagicNumber = (filePath: string, expectedMime: string): boolean => {
  try {
    const magic = magicNumbers[expectedMime]
    if (!magic) return true

    const buffer = Buffer.alloc(magic.bytes.length + (magic.offset || 0))
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buffer, 0, buffer.length, 0)
    fs.closeSync(fd)

    const offset = magic.offset || 0
    for (let i = 0; i < magic.bytes.length; i++) {
      if (buffer[offset + i] !== magic.bytes[i]) {
        return false
      }
    }
    return true
  } catch {
    return true
  }
}

const detectMimeType = (filePath: string): string | null => {
  try {
    const buffer = Buffer.alloc(8)
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buffer, 0, 8, 0)
    fs.closeSync(fd)

    for (const [mime, magic] of Object.entries(magicNumbers)) {
      const offset = magic.offset || 0
      let match = true
      for (let i = 0; i < magic.bytes.length; i++) {
        if (buffer[offset + i] !== magic.bytes[i]) {
          match = false
          break
        }
      }
      if (match) return mime
    }
    return null
  } catch {
    return null
  }
}

const storage = multer.diskStorage({
  destination: (req: RequestWithUser, file, cb) => {
    try {
      if (!req.user) {
        console.error('[上传] 错误: 未认证')
        return cb(new Error('UNAUTHORIZED'), '')
      }

      const userDir = getUserStorageDir(req.user.id)
      
      try {
        ensureDir(userDir)
      } catch (dirError) {
        console.error(`[上传] 创建目录失败: ${dirError}`)
        return cb(dirError as Error, '')
      }
      
      cb(null, userDir)
    } catch (error) {
      console.error(`[上传] destination 错误: ${error}`)
      cb(error as Error, '')
    }
  },
  filename: (req: RequestWithUser, file, cb) => {
    try {
      const sanitizedName = sanitizeFilename(file.originalname)
      const uniqueName = generateUniqueFileName(sanitizedName)
      cb(null, uniqueName)
    } catch (error) {
      console.error(`[上传] filename 错误: ${error}`)
      cb(error as Error, '')
    }
  },
})

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase()
  
  if (dangerousExtensions.includes(ext)) {
    console.warn(`[上传安全] 阻止危险文件类型: ${ext}, 文件名: ${file.originalname}`)
    return cb(new Error('DANGEROUS_FILE_TYPE'))
  }

  if (file.originalname.includes('\0')) {
    console.warn(`[上传安全] 检测到空字节注入: ${file.originalname}`)
    return cb(new Error('INVALID_FILENAME'))
  }

  if (file.originalname.length > 255) {
    console.warn(`[上传安全] 文件名过长: ${file.originalname.length}`)
    return cb(new Error('FILENAME_TOO_LONG'))
  }

  cb(null, true)
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20,
    fieldSize: 10 * 1024 * 1024,
    parts: 100,
    headerPairs: 2000,
  },
})

export const uploadSingle = upload.single('file')

export const uploadMultiple = upload.array('files', 20)

export const verifyUploadedFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file as Express.Multer.File | undefined
    const files = req.files as Express.Multer.File[] | undefined

    const filesToCheck = files || (file ? [file] : [])

    for (const f of filesToCheck) {
      if (!fs.existsSync(f.path)) {
        return errorResponse(res, '文件上传失败', 500)
      }

      const ext = path.extname(f.originalname).toLowerCase()
      if (dangerousExtensions.includes(ext)) {
        fs.unlinkSync(f.path)
        return errorResponse(res, '禁止上传可执行文件', 415)
      }

      const detectedMime = detectMimeType(f.path)
      if (detectedMime && detectedMime !== f.mimetype) {
        console.warn(`[上传安全] MIME类型不匹配: 声明=${f.mimetype}, 实际=${detectedMime}`)
        if (['image/jpeg', 'image/png', 'image/gif'].includes(detectedMime)) {
          f.mimetype = detectedMime
        }
      }

      const stats = fs.statSync(f.path)
      if (stats.size === 0) {
        fs.unlinkSync(f.path)
        return errorResponse(res, '上传的文件为空', 400)
      }

      if (stats.size > MAX_FILE_SIZE) {
        fs.unlinkSync(f.path)
        return errorResponse(res, `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`, 413)
      }
    }

    next()
  } catch (error) {
    console.error('[上传验证错误]', error)
    return errorResponse(res, '文件验证失败', 500)
  }
}

export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`, 413)
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return errorResponse(res, '文件数量超过限制 (最多20个)', 400)
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return errorResponse(res, '意外的文件字段', 400)
    }
    if (error.code === 'LIMIT_FIELD_KEY') {
      return errorResponse(res, '字段名过长', 400)
    }
    if (error.code === 'LIMIT_FIELD_VALUE') {
      return errorResponse(res, '字段值过长', 400)
    }
    if (error.code === 'LIMIT_FIELD_COUNT') {
      return errorResponse(res, '字段数量超过限制', 400)
    }
    if (error.code === 'LIMIT_PART_COUNT') {
      return errorResponse(res, '表单部分数量超过限制', 400)
    }
    return errorResponse(res, `上传错误: ${error.message}`, 400)
  }
  
  if (error?.message === 'DANGEROUS_FILE_TYPE') {
    return errorResponse(res, '禁止上传可执行文件', 415)
  }
  
  if (error?.message === 'INVALID_FILENAME') {
    return errorResponse(res, '文件名包含非法字符', 400)
  }
  
  if (error?.message === 'FILENAME_TOO_LONG') {
    return errorResponse(res, '文件名过长', 400)
  }
  
  if (error?.message === 'UNAUTHORIZED') {
    return errorResponse(res, '未认证', 401)
  }
  
  if (error) {
    console.error('[上传错误]', error)
    return errorResponse(res, error.message || '文件上传失败', 400)
  }
  
  next()
}

export const generateSecureFilename = (originalName: string): string => {
  const ext = path.extname(originalName)
  const randomBytes = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `${timestamp}-${randomBytes}${ext}`
}

export default {
  upload,
  uploadSingle,
  uploadMultiple,
  verifyUploadedFile,
  handleUploadError,
  generateSecureFilename,
}

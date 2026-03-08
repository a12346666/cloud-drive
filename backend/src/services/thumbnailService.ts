/**
 * 缩略图服务
 * 生成图片和视频的缩略图
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { ensureDir } from '../utils/fileStorage'

const THUMBNAIL_DIR = path.join(process.cwd(), 'uploads', 'thumbnails')
const THUMBNAIL_SIZE = 200
const THUMBNAIL_QUALITY = 80

ensureDir(THUMBNAIL_DIR)

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
]

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]

export const generateImageThumbnail = async (
  sourcePath: string,
  fileId: number
): Promise<string | null> => {
  try {
    if (!fs.existsSync(sourcePath)) {
      return null
    }

    const thumbnailFilename = `thumb_${fileId}.webp`
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename)

    await sharp(sourcePath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toFile(thumbnailPath)

    return thumbnailPath
  } catch (error) {
    console.error('[缩略图] 生成图片缩略图失败:', error)
    return null
  }
}

export const generateVideoThumbnail = async (
  sourcePath: string,
  fileId: number
): Promise<string | null> => {
  try {
    if (!fs.existsSync(sourcePath)) {
      return null
    }

    const thumbnailFilename = `thumb_${fileId}.webp`
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename)

    return null
  } catch (error) {
    console.error('[缩略图] 生成视频缩略图失败:', error)
    return null
  }
}

export const getThumbnailPath = (fileId: number): string | null => {
  const thumbnailPath = path.join(THUMBNAIL_DIR, `thumb_${fileId}.webp`)
  return fs.existsSync(thumbnailPath) ? thumbnailPath : null
}

export const deleteThumbnail = (fileId: number): void => {
  const thumbnailPath = path.join(THUMBNAIL_DIR, `thumb_${fileId}.webp`)
  if (fs.existsSync(thumbnailPath)) {
    fs.unlinkSync(thumbnailPath)
  }
}

export const generateThumbnail = async (
  sourcePath: string,
  fileId: number,
  mimeType: string
): Promise<string | null> => {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return generateImageThumbnail(sourcePath, fileId)
  }

  return null
}

export default {
  generateImageThumbnail,
  generateVideoThumbnail,
  getThumbnailPath,
  deleteThumbnail,
  generateThumbnail,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
}

/**
 * 文件路由
 * 处理文件相关的路由
 */

import { Router } from 'express'
import {
  uploadFile,
  uploadMultipleFiles,
  getFiles,
  downloadFile,
  previewFile,
  deleteFileById,
  renameFile,
  moveFile,
  getStorageStats,
} from '../controllers/fileController'
import {
  initUpload,
  uploadFileChunk,
  mergeFileChunks,
  getUploadProgress,
  cancelChunkUpload,
  checkFileExists,
} from '../controllers/chunkUploadController'
import { authenticate } from '../middleware/auth'
import { uploadSingle, uploadMultiple, handleUploadError, verifyUploadedFile } from '../middleware/upload'
import { validateFileId, validateFilename } from '../middleware/securityEnhanced'
import { checkValidation, validateRename, validateMove, validatePagination, validateSearch } from '../middleware/validation'

const router = Router()

router.use(authenticate)

router.post('/upload', uploadSingle, handleUploadError, verifyUploadedFile, uploadFile)
router.post('/upload-multiple', uploadMultiple, handleUploadError, verifyUploadedFile, uploadMultipleFiles)

router.post('/chunk/init', initUpload)
router.post('/chunk/upload', uploadSingle, handleUploadError, verifyUploadedFile, uploadFileChunk)
router.post('/chunk/merge', mergeFileChunks)
router.get('/chunk/progress/:uploadId', getUploadProgress)
router.delete('/chunk/cancel/:uploadId', cancelChunkUpload)
router.post('/chunk/check', checkFileExists)

router.get('/', validatePagination, validateSearch, checkValidation, getFiles)
router.get('/stats', getStorageStats)

router.get('/:id/download', validateFileId, checkValidation, downloadFile)
router.get('/:id/preview', validateFileId, checkValidation, previewFile)
router.delete('/:id', validateFileId, checkValidation, deleteFileById)
router.put('/:id/rename', validateFileId, validateRename, checkValidation, renameFile)
router.put('/:id/move', validateFileId, validateMove, checkValidation, moveFile)

export default router

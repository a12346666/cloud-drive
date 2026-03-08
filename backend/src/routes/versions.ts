/**
 * 文件版本历史路由
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getVersions,
  createVersion,
  restoreVersion,
  deleteVersion,
  cleanupVersions,
} from '../controllers/versionController'
import { validateFileId } from '../middleware/securityEnhanced'
import { checkValidation } from '../middleware/validation'

const router = Router()

router.use(authenticate)

router.get('/:fileId/versions', validateFileId, checkValidation, getVersions)
router.post('/:fileId/versions', validateFileId, checkValidation, createVersion)
router.post('/:fileId/versions/:versionId/restore', restoreVersion)
router.delete('/:fileId/versions/:versionId', deleteVersion)
router.post('/:fileId/versions/cleanup', cleanupVersions)

export default router

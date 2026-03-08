/**
 * 分享路由
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as shareController from '../controllers/shareController'

const router = Router()

// 需要认证的路由
router.post('/', authenticate, shareController.createShare)
router.get('/', authenticate, shareController.getUserShares)
router.delete('/:id', authenticate, shareController.cancelShare)

// 公开访问的路由(分享链接)
router.get('/:id', shareController.getShareInfo)
router.post('/:id/verify', shareController.verifySharePassword)
router.get('/:id/download', shareController.downloadSharedFile)
router.get('/:id/preview', shareController.previewSharedFile)

export default router

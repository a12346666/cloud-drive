/**
 * 回收站路由
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as trashController from '../controllers/trashController'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 获取回收站内容
router.get('/', trashController.getTrashItems)

// 恢复文件/文件夹
router.post('/files/:id/restore', trashController.restoreFile)
router.post('/folders/:id/restore', trashController.restoreFolder)

// 永久删除文件/文件夹
router.delete('/files/:id', trashController.permanentDeleteFile)
router.delete('/folders/:id', trashController.permanentDeleteFolder)

// 清空回收站
router.delete('/empty', trashController.emptyTrash)

export default router

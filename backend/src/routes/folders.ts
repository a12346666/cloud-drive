/**
 * 文件夹路由
 * 处理文件夹相关的路由
 */

import { Router } from 'express'
import {
  createFolder,
  getFolders,
  getFolderTree,
  getFolderPath,
  renameFolder,
  moveFolder,
  deleteFolder,
  getFolderContents,
} from '../controllers/folderController'
import { authenticate } from '../middleware/auth'

const router = Router()

// 所有文件夹路由都需要认证
router.use(authenticate)

// 文件夹CRUD
router.post('/', createFolder)
router.get('/', getFolders)
router.get('/tree', getFolderTree)
router.get('/:id/path', getFolderPath)
router.get('/:id/contents', getFolderContents)
router.put('/:id/rename', renameFolder)
router.put('/:id/move', moveFolder)
router.delete('/:id', deleteFolder)

export default router

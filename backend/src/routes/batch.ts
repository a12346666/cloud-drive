import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  batchDeleteFiles,
  batchMoveFiles,
  batchDownload,
  batchStar,
  batchAddTags,
  searchFiles,
} from '../controllers/batchController'
import {
  toggleFileStar,
  toggleFolderStar,
  getStarredItems,
} from '../controllers/starController'

const router = Router()

router.use(authenticate)

router.post('/delete', batchDeleteFiles)
router.post('/move', batchMoveFiles)
router.post('/download', batchDownload)
router.post('/star', batchStar)
router.post('/tags', batchAddTags)
router.get('/search', searchFiles)

router.post('/star/file/:id', toggleFileStar)
router.post('/star/folder/:id', toggleFolderStar)
router.get('/starred', getStarredItems)

export default router

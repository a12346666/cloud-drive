import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  createTag,
  getTags,
  updateTag,
  deleteTag,
  addTagToFile,
  removeTagFromFile,
  getFilesByTag,
} from '../controllers/tagController'

const router = Router()

router.use(authenticate)

router.post('/', createTag)
router.get('/', getTags)
router.put('/:id', updateTag)
router.delete('/:id', deleteTag)

router.post('/file', addTagToFile)
router.delete('/file/:fileId/:tagId', removeTagFromFile)
router.get('/:tagId/files', getFilesByTag)

export default router
